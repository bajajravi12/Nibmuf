import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { DB } from './db.js';
import { Message, WSMessage, User } from '../types.js';

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  user: User;
  connectedAt: string;
  lastPing: number;
}

const clients = new Map<string, ClientConnection>(); // userId -> ClientConnection

export function setupWebSocketServer(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const host = request.headers.host || 'localhost';
      const url = new URL(request.url || '', `http://${host}`);

      if (url.pathname === '/ws' || url.pathname === '/ws/') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (err) {
      console.warn('WS Upgrade Warning:', err);
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    let authenticatedUserId: string | null = null;

    ws.on('message', (rawData: string) => {
      try {
        const msg: WSMessage = JSON.parse(rawData.toString());
        const { type, payload } = msg;

        // 1. Authenticate WebSocket Connection
        if (type === 'auth') {
          const { token } = payload;
          const session = DB.getSession(token);

          if (!session) {
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid or expired session' } }));
            return;
          }

          const user = DB.getUserById(session.userId);
          if (!user) return;

          authenticatedUserId = user.id;
          clients.set(user.id, {
            ws,
            userId: user.id,
            user,
            connectedAt: new Date().toISOString(),
            lastPing: Date.now()
          });

          // Mark user online
          DB.updateUser(user.id, { onlineStatus: 'online', lastSeen: new Date().toISOString() });

          // Send auth confirmation
          ws.send(
            JSON.stringify({
              type: 'auth:success',
              payload: { userId: user.id, message: 'Connected to Pulse WebSocket Hub' },
              timestamp: new Date().toISOString()
            })
          );

          // Broadcast user presence online to contacts
          broadcastPresence(user.id, 'online');
          return;
        }

        // Must be authenticated for subsequent actions
        if (!authenticatedUserId) {
          ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized WebSocket request' } }));
          return;
        }

        // Handle Realtime Actions
        switch (type) {
          case 'message:send': {
            const { chatId, content, replyToMessageId, attachments } = payload;
            const chat = DB.getChatById(chatId, authenticatedUserId);
            if (!chat) return;

            const newMsg = DB.createMessage({
              chatId,
              senderId: authenticatedUserId,
              content: content || '',
              replyToMessageId,
              attachments
            });

            // Broadcast message to all participants in this chat
            broadcastToChat(chatId, {
              type: 'message:new',
              payload: { message: newMsg },
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'typing': {
            const { chatId, isTyping } = payload;
            const chat = DB.getChatById(chatId, authenticatedUserId);
            if (!chat) return;

            // Broadcast typing event to other participants in chat
            broadcastToChat(
              chatId,
              {
                type: 'typing:update',
                payload: { chatId, userId: authenticatedUserId, isTyping },
                timestamp: new Date().toISOString()
              },
              authenticatedUserId
            );
            break;
          }

          case 'read:receipt': {
            const { chatId, messageId } = payload;
            if (messageId) {
              DB.updateMessage(messageId, { status: 'read' });
            }
            if (chatId) {
              DB.markChatMessagesAsRead(chatId, authenticatedUserId);
            }

            broadcastToChat(chatId, {
              type: 'messages:read',
              payload: { chatId, messageId, readByUserId: authenticatedUserId },
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'message:reaction': {
            const { messageId, emoji, chatId } = payload;
            const updatedReactions = DB.toggleReaction(messageId, authenticatedUserId, emoji);
            
            broadcastToChat(chatId, {
              type: 'reaction:update',
              payload: { messageId, chatId, reactions: updatedReactions },
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'message:pin': {
            const { messageId, chatId, isPinned } = payload;
            if (isPinned) {
              DB.pinMessage(chatId, messageId, authenticatedUserId);
            } else {
              DB.unpinMessage(chatId, messageId);
            }

            const updatedPins = DB.getPinnedMessages(chatId);
            broadcastToChat(chatId, {
              type: 'pin:update',
              payload: { chatId, messageId, isPinned, pinnedMessages: updatedPins },
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'presence': {
            const client = clients.get(authenticatedUserId);
            if (client) {
              client.lastPing = Date.now();
            }
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('WebSocket Message Error:', err);
      }
    });

    ws.on('close', () => {
      if (authenticatedUserId) {
        clients.delete(authenticatedUserId);
        DB.updateUser(authenticatedUserId, { onlineStatus: 'offline', lastSeen: new Date().toISOString() });
        broadcastPresence(authenticatedUserId, 'offline');
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket Error:', err);
    });
  });

  // Heartbeat ping every 30s
  setInterval(() => {
    const now = Date.now();
    clients.forEach((client, userId) => {
      if (now - client.lastPing > 60000) {
        client.ws.terminate();
        clients.delete(userId);
        DB.updateUser(userId, { onlineStatus: 'offline', lastSeen: new Date().toISOString() });
        broadcastPresence(userId, 'offline');
      } else {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      }
    });
  }, 30000);

  console.log('WebSocket Server initialized on /ws');
}

export function broadcastToChat(chatId: string, event: WSMessage, excludeUserId?: string) {
  const chat = DB.getChatById(chatId);
  if (!chat) return;

  chat.participantIds.forEach((userId) => {
    if (excludeUserId && userId === excludeUserId) return;
    const client = clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(event));
    }
  });
}

export function broadcastPresence(userId: string, status: 'online' | 'offline') {
  const user = DB.getUserById(userId);
  if (!user) return;

  const event: WSMessage = {
    type: 'presence',
    payload: {
      userId,
      onlineStatus: status,
      lastSeen: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };

  clients.forEach((client) => {
    if (client.userId !== userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(event));
    }
  });
}
