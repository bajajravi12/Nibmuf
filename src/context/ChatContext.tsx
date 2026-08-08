import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext.js';
import { Chat, Message, Attachment, User, GroupMember, Reaction } from '../types.js';

interface TypingMap {
  [chatId: string]: { [userId: string]: boolean };
}

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  isConnected: boolean;
  typingState: TypingMap;
  pinnedMessages: Message[];
  replyTarget: Message | null;
  editTarget: Message | null;
  forwardTarget: Message | null;
  mediaPreviewUrl: string | null;
  isInfoDrawerOpen: boolean;
  selectChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string, attachments?: Attachment[]) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  togglePinMessage: (messageId: string, isPinned: boolean) => Promise<void>;
  setTyping: (chatId: string, isTyping: boolean) => void;
  setReplyTarget: (msg: Message | null) => void;
  setEditTarget: (msg: Message | null) => void;
  setForwardTarget: (msg: Message | null) => void;
  setMediaPreviewUrl: (url: string | null) => void;
  toggleInfoDrawer: () => void;
  clearActiveChat: () => void;
  startDirectChat: (targetUserId: string) => Promise<Chat | null>;
  openSavedMessages: () => Promise<void>;
  createGroupChat: (name: string, description: string, avatarUrl: string, memberUserIds: string[]) => Promise<Chat | null>;
  uploadAttachment: (fileData: { name: string; type: string; dataUrl: string; mimeType: string; duration?: number }) => Promise<Attachment | null>;
  refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [typingState, setTypingState] = useState<TypingMap>({});
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [editTarget, setEditTarget] = useState<Message | null>(null);
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const activeChatIdRef = useRef<string | null>(null);

  activeChatIdRef.current = activeChat?.id || null;

  // 1. Fetch user chats list
  const refreshChats = async () => {
    if (!token || !user) return;
    try {
      const res = await fetch('/api/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats || []);
      }
    } catch {
      // Quietly handle transient network fetch errors during server boot or reconnects
    } finally {
      setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      refreshChats();
    } else {
      setChats([]);
      setActiveChat(null);
      setMessages([]);
    }
  }, [user, token]);

  // 2. Setup WebSocket Connection with auto-reconnect
  useEffect(() => {
    if (!token || !user) {
      if (wsRef.current) wsRef.current.close();
      return;
    }

    let isComponentMounted = true;
    let reconnectTimer: any = null;

    function connectWS() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isComponentMounted) return;
        setIsConnected(true);
        // Send Auth event
        ws.send(JSON.stringify({ type: 'auth', payload: { token }, timestamp: new Date().toISOString() }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, payload } = data;

          if (type === 'message:new' || type === 'message:send') {
            const { message } = payload;
            if (message) {
              if (message.chatId === activeChatIdRef.current) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === message.id)) return prev;
                  return [...prev, message];
                });

                // Send read receipt if active chat and message is from someone else
                if (ws.readyState === WebSocket.OPEN && user && message.senderId !== user.id) {
                  ws.send(
                    JSON.stringify({
                      type: 'read:receipt',
                      payload: { chatId: message.chatId, messageId: message.id },
                      timestamp: new Date().toISOString()
                    })
                  );
                }
              }

              // Update chats list in memory for immediate unread count & last message feedback
              setChats((prevChats) => {
                const isActive = message.chatId === activeChatIdRef.current;
                const isFromMe = message.senderId === user?.id;

                return prevChats
                  .map((c) => {
                    if (c.id === message.chatId) {
                      const newUnread = isActive || isFromMe ? 0 : (c.unreadCount || 0) + 1;
                      return {
                        ...c,
                        lastMessage: message,
                        updatedAt: message.createdAt,
                        unreadCount: newUnread
                      };
                    }
                    return c;
                  })
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
              });

              refreshChats();
            }
          } else if (type === 'message:edit') {
            const { message } = payload;
            if (message && message.chatId === activeChatIdRef.current) {
              setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
            }
            refreshChats();
          } else if (type === 'message:delete') {
            const { messageId, chatId } = payload;
            if (chatId === activeChatIdRef.current) {
              setMessages((prev) => prev.filter((m) => m.id !== messageId));
            }
            refreshChats();
          } else if (type === 'typing:update') {
            const { chatId, userId, isTyping } = payload;
            setTypingState((prev) => ({
              ...prev,
              [chatId]: { ...(prev[chatId] || {}), [userId]: isTyping }
            }));
          } else if (type === 'messages:read' || type === 'read:update') {
            const { chatId, messageId, readByUserId } = payload;
            if (chatId === activeChatIdRef.current) {
              setMessages((prev) =>
                prev.map((m) => {
                  if (messageId) {
                    return m.id === messageId || (readByUserId ? m.senderId !== readByUserId : true) ? { ...m, status: 'read' } : m;
                  }
                  return readByUserId ? (m.senderId !== readByUserId ? { ...m, status: 'read' } : m) : { ...m, status: 'read' };
                })
              );
            }
            refreshChats();
          } else if (type === 'reaction:update' || type === 'message:reaction') {
            const { messageId, chatId, reactions } = payload;
            if (chatId === activeChatIdRef.current) {
              setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
              );
            }
          } else if (type === 'pin:update' || type === 'message:pin') {
            const { chatId, pinnedMessages: updatedPins } = payload;
            if (chatId === activeChatIdRef.current && updatedPins) {
              setPinnedMessages(updatedPins);
            }
          } else if (type === 'presence') {
            const { userId, onlineStatus, lastSeen } = payload;
            setChats((prev) =>
              prev.map((c) => {
                if (c.otherUser && c.otherUser.id === userId) {
                  return {
                    ...c,
                    otherUser: { ...c.otherUser, onlineStatus, lastSeen }
                  };
                }
                return c;
              })
            );
            if (activeChat?.otherUser?.id === userId) {
              setActiveChat((prev) =>
                prev && prev.otherUser
                  ? { ...prev, otherUser: { ...prev.otherUser, onlineStatus, lastSeen } }
                  : prev
              );
            }
          }
        } catch (err) {
          console.error('WS Parse Error:', err);
        }
      };

      ws.onclose = () => {
        if (!isComponentMounted) return;
        setIsConnected(false);
        reconnectTimer = setTimeout(() => {
          if (isComponentMounted) connectWS();
        }, 4000);
      };

      ws.onerror = () => {
        // Silently handle WS transport errors without throwing unhandled exceptions
        setIsConnected(false);
      };
    }

    connectWS();

    // Fallback polling when WS is offline
    const pollInterval = setInterval(() => {
      if (token && user) {
        refreshChats();
        if (activeChatIdRef.current) {
          fetch(`/api/chats/${activeChatIdRef.current}/messages`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.messages) {
                setMessages((prev) => {
                  if (data.messages.length !== prev.length || (data.messages.length > 0 && prev.length > 0 && data.messages[data.messages.length - 1].id !== prev[prev.length - 1].id)) {
                    return data.messages;
                  }
                  return prev;
                });
              }
            })
            .catch(() => {});
        }
      }
    }, 4000);

    return () => {
      isComponentMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(pollInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [token, user]);

  // 3. Select active chat and load message history
  const selectChat = async (chatId: string, overrideChat?: Chat) => {
    activeChatIdRef.current = chatId;
    const chat = overrideChat || chats.find((c) => c.id === chatId) || (activeChat?.id === chatId ? activeChat : null);

    // Immediately reset unread count in local chats state
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
    );

    if (chat) {
      setActiveChat(chat);
    }
    setIsLoadingMessages(true);
    setReplyTarget(null);
    setEditTarget(null);

    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.chat) {
          setActiveChat(data.chat);
        }
        setMessages(data.messages || []);
      }

      // Fetch pinned messages
      const pinsRes = await fetch(`/api/chats/${chatId}/pins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (pinsRes.ok) {
        const pinsData = await pinsRes.json();
        setPinnedMessages(pinsData.pinnedMessages || []);
      }

      refreshChats();
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // 4. Send Message (Optimistic UI + WebSocket broadcast)
  const sendMessage = async (content: string, attachments?: Attachment[]) => {
    if (!activeChat || !user || !token) return;

    const tempId = 'temp_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    const optimisticMsg: Message = {
      id: tempId,
      chatId: activeChat.id,
      senderId: user.id,
      sender: user,
      content: content || '',
      replyToMessageId: replyTarget?.id,
      replyToMessage: replyTarget || undefined,
      attachments,
      reactions: [],
      status: 'sending',
      createdAt: now,
      updatedAt: now
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyTarget(null);

    try {
      // Send via WS if connected, fallback to REST
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message:send',
            payload: {
              chatId: activeChat.id,
              content,
              replyToMessageId: replyTarget?.id,
              attachments
            },
            timestamp: now
          })
        );
      } else {
        const res = await fetch(`/api/chats/${activeChat.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            content,
            replyToMessageId: replyTarget?.id,
            attachments
          })
        });

        if (res.ok) {
          const data = await res.json();
          setMessages((prev) => prev.map((m) => (m.id === tempId ? data.message : m)));
        }
      }
      refreshChats();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newContent })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === messageId ? data.message : m)));
        setEditTarget(null);
      }
    } catch (err) {
      console.error('Error editing message:', err);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        refreshChats();
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!activeChat || !token) return;
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message:reaction',
            payload: { messageId, emoji, chatId: activeChat.id },
            timestamp: new Date().toISOString()
          })
        );
      } else {
        const res = await fetch(`/api/messages/${messageId}/reactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ emoji, chatId: activeChat.id })
        });

        if (res.ok) {
          const data = await res.json();
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m))
          );
        }
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  };

  const togglePinMessage = async (messageId: string, isPinned: boolean) => {
    if (!activeChat || !token) return;
    try {
      const res = await fetch(`/api/chats/${activeChat.id}/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ messageId, isPinned })
      });

      if (res.ok) {
        const data = await res.json();
        setPinnedMessages(data.pinnedMessages || []);
      }
    } catch (err) {
      console.error('Error pinning message:', err);
    }
  };

  const setTyping = (chatId: string, isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          payload: { chatId, isTyping },
          timestamp: new Date().toISOString()
        })
      );
    }
  };

  const startDirectChat = async (targetUserId: string) => {
    if (!token) return null;
    try {
      const res = await fetch('/api/chats/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveChat(data.chat);
        activeChatIdRef.current = data.chat.id;
        await refreshChats();
        await selectChat(data.chat.id, data.chat);
        return data.chat;
      }
    } catch (err) {
      console.error('Error starting direct chat:', err);
    }
    return null;
  };

  const openSavedMessages = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/chats/saved', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveChat(data.chat);
        activeChatIdRef.current = data.chat.id;
        await refreshChats();
        await selectChat(data.chat.id, data.chat);
      }
    } catch (err) {
      console.error('Error opening saved messages:', err);
    }
  };

  const createGroupChat = async (name: string, description: string, avatarUrl: string, memberUserIds: string[]) => {
    if (!token) return null;
    try {
      const res = await fetch('/api/groups/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, description, avatarUrl, memberUserIds })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveChat(data.group);
        activeChatIdRef.current = data.group.id;
        await refreshChats();
        await selectChat(data.group.id, data.group);
        return data.group;
      }
    } catch (err) {
      console.error('Error creating group chat:', err);
    }
    return null;
  };

  const uploadAttachment = async (fileData: { name: string; type: string; dataUrl: string; mimeType: string; duration?: number }) => {
    if (!token) return null;
    try {
      const res = await fetch('/api/attachments/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(fileData)
      });

      if (res.ok) {
        const data = await res.json();
        return data.attachment as Attachment;
      }
    } catch (err) {
      console.error('Attachment upload failed:', err);
    }
    return null;
  };

  const toggleInfoDrawer = () => {
    setIsInfoDrawerOpen((prev) => !prev);
  };

  const clearActiveChat = () => {
    setActiveChat(null);
    setIsInfoDrawerOpen(false);
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        messages,
        isLoadingChats,
        isLoadingMessages,
        isConnected,
        typingState,
        pinnedMessages,
        replyTarget,
        editTarget,
        forwardTarget,
        mediaPreviewUrl,
        isInfoDrawerOpen,
        selectChat,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        togglePinMessage,
        setTyping,
        setReplyTarget,
        setEditTarget,
        setForwardTarget,
        setMediaPreviewUrl,
        toggleInfoDrawer,
        clearActiveChat,
        startDirectChat,
        openSavedMessages,
        createGroupChat,
        uploadAttachment,
        refreshChats
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
