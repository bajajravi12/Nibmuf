import { Router } from 'express';
import { DB } from './db.js';
import {
  hashPassword,
  verifyPassword,
  generateSalt,
  sanitizeUsername,
  getSessionFromRequest,
  applyRateLimit
} from './auth.js';
import { broadcastToChat } from './websocket.js';
import { Attachment } from '../types.js';

export const apiRouter = Router();

// Middleware to authenticate requests
function requireAuth(req: any, res: any, next: any) {
  const { session, user } = getSessionFromRequest(req);
  if (!session || !user) {
    return res.status(401).json({ error: 'Unauthorized session' });
  }
  req.session = session;
  req.user = user;
  next();
}

// ------------------------------------------------------------------
// AUTHENTICATION ROUTES
// ------------------------------------------------------------------

apiRouter.post('/auth/register', async (req: any, res: any) => {
  const ip = req.ip || '127.0.0.1';
  const { allowed } = applyRateLimit('register_' + ip, 10, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many registration attempts. Please wait a minute.' });
  }

  const { username, password, displayName } = req.body;

  if (!username || !password || !displayName) {
    return res.status(400).json({ error: 'Username, password, and display name are required' });
  }

  const cleanUsername = sanitizeUsername(username);
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const existing = DB.getUserByUsername(cleanUsername);
  if (existing) {
    return res.status(409).json({ error: 'Username is already taken. Please choose another.' });
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const user = DB.createUser({
    username: cleanUsername,
    passwordHash,
    salt,
    displayName: displayName.trim(),
    bio: 'Hey there! I am using Pulse Messenger ⚡',
    avatarUrl: '',
    onlineStatus: 'online',
    lastSeen: new Date().toISOString()
  });

  const session = DB.createSession(user.id);

  res.cookie('pulse_session', session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 72 * 3600 * 1000,
    sameSite: 'lax'
  });

  return res.json({
    user,
    token: session.token
  });
});

apiRouter.post('/auth/login', async (req: any, res: any) => {
  const ip = req.ip || '127.0.0.1';
  const { allowed } = applyRateLimit('login_' + ip, 15, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many login attempts. Please wait a minute.' });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = sanitizeUsername(username);
  const user = DB.getUserByUsername(cleanUsername);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const isValid = await verifyPassword(password, user.salt, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  DB.updateUser(user.id, { onlineStatus: 'online', lastSeen: new Date().toISOString() });
  const session = DB.createSession(user.id);

  res.cookie('pulse_session', session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 72 * 3600 * 1000,
    sameSite: 'lax'
  });

  const { passwordHash, salt, ...cleanUser } = user;
  return res.json({
    user: cleanUser,
    token: session.token
  });
});

apiRouter.get('/auth/me', (req: any, res: any) => {
  const { session, user } = getSessionFromRequest(req);
  if (!session || !user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json({ user, token: session.token });
});

apiRouter.post('/auth/logout', requireAuth, (req: any, res: any) => {
  DB.deleteSession(req.session.token);
  DB.updateUser(req.user.id, { onlineStatus: 'offline', lastSeen: new Date().toISOString() });
  res.clearCookie('pulse_session');
  return res.json({ success: true });
});

apiRouter.post('/auth/change-password', requireAuth, async (req: any, res: any) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  const fullUser = DB.getUserByUsername(req.user.username);
  if (!fullUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const isValid = await verifyPassword(currentPassword, fullUser.salt, fullUser.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);

  DB.updateUser(req.user.id, { passwordHash: newHash, salt: newSalt });
  return res.json({ success: true, message: 'Password updated successfully' });
});

apiRouter.post('/auth/delete-account', requireAuth, (req: any, res: any) => {
  const userId = req.user.id;
  DB.deleteUser(userId);
  res.clearCookie('pulse_session');
  return res.json({ success: true, message: 'Account permanently deleted' });
});

// ------------------------------------------------------------------
// PROFILE & USERS
// ------------------------------------------------------------------

apiRouter.put('/profile', requireAuth, (req: any, res: any) => {
  const { displayName, bio, avatarUrl, privacyLastSeen, privacyReadReceipts } = req.body;

  const updatedUser = DB.updateUser(req.user.id, {
    ...(displayName && { displayName: displayName.trim() }),
    ...(bio !== undefined && { bio: bio.trim() }),
    ...(avatarUrl && { avatarUrl }),
    ...(privacyLastSeen && { privacyLastSeen }),
    ...(privacyReadReceipts !== undefined && { privacyReadReceipts })
  });

  return res.json({ user: updatedUser });
});

apiRouter.get('/users/search', requireAuth, (req: any, res: any) => {
  const query = (req.query.q as string) || '';
  const users = DB.getAllUsers(req.user.id).filter(
    (u) =>
      u.username.toLowerCase().includes(query.toLowerCase()) ||
      u.displayName.toLowerCase().includes(query.toLowerCase())
  );
  return res.json({ users });
});

apiRouter.post('/users/block', requireAuth, (req: any, res: any) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'Target user ID required' });
  DB.blockUser(req.user.id, targetUserId);
  return res.json({ success: true });
});

apiRouter.post('/users/unblock', requireAuth, (req: any, res: any) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'Target user ID required' });
  DB.unblockUser(req.user.id, targetUserId);
  return res.json({ success: true });
});

apiRouter.get('/users/blocked', requireAuth, (req: any, res: any) => {
  const blocked = DB.getBlockedUsers(req.user.id);
  return res.json({ blockedUsers: blocked });
});

// ------------------------------------------------------------------
// CHATS & MESSAGES
// ------------------------------------------------------------------

apiRouter.get('/chats', requireAuth, (req: any, res: any) => {
  const chats = DB.getUserChats(req.user.id);
  return res.json({ chats });
});

apiRouter.post('/chats/direct', requireAuth, (req: any, res: any) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'Target user ID required' });

  let chat = DB.findDirectChat(req.user.id, targetUserId);
  if (!chat) {
    const targetUser = DB.getUserById(targetUserId);
    if (!targetUser) return res.status(404).json({ error: 'Target user not found' });
    chat = DB.createChat('direct', [req.user.id, targetUserId]);
    chat = DB.getChatById(chat.id, req.user.id);
  }

  return res.json({ chat });
});

apiRouter.get('/chats/saved', requireAuth, (req: any, res: any) => {
  const chat = DB.getSavedMessagesChat(req.user.id);
  return res.json({ chat });
});

apiRouter.get('/chats/:id/messages', requireAuth, (req: any, res: any) => {
  const chatId = req.params.id;
  const chat = DB.getChatById(chatId, req.user.id);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  if (!chat.participantIds.includes(req.user.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Automatically mark messages from other users as read when opening chat
  const updatedReadMsgs = DB.markChatMessagesAsRead(chatId, req.user.id);
  if (updatedReadMsgs.length > 0) {
    broadcastToChat(chatId, {
      type: 'messages:read',
      payload: { chatId, readByUserId: req.user.id },
      timestamp: new Date().toISOString()
    });
  }

  const messages = DB.getChatMessages(chatId, 100);
  return res.json({ chat, messages });
});

apiRouter.post('/chats/:id/read', requireAuth, (req: any, res: any) => {
  const chatId = req.params.id;
  const chat = DB.getChatById(chatId, req.user.id);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  const updatedReadMsgs = DB.markChatMessagesAsRead(chatId, req.user.id);
  if (updatedReadMsgs.length > 0) {
    broadcastToChat(chatId, {
      type: 'messages:read',
      payload: { chatId, readByUserId: req.user.id },
      timestamp: new Date().toISOString()
    });
  }

  return res.json({ success: true, count: updatedReadMsgs.length });
});

apiRouter.post('/chats/:id/messages', requireAuth, (req: any, res: any) => {
  const chatId = req.params.id;
  const { content, replyToMessageId, attachments } = req.body;

  const chat = DB.getChatById(chatId, req.user.id);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  if (!chat.participantIds.includes(req.user.id)) {
    return res.status(403).json({ error: 'Access denied to this chat' });
  }

  const newMsg = DB.createMessage({
    chatId,
    senderId: req.user.id,
    content: content || '',
    replyToMessageId,
    attachments
  });

  // Broadcast to WebSocket clients
  broadcastToChat(chatId, {
    type: 'message:send',
    payload: { message: newMsg },
    timestamp: new Date().toISOString()
  });

  return res.json({ message: newMsg });
});

apiRouter.put('/messages/:id', requireAuth, (req: any, res: any) => {
  const messageId = req.params.id;
  const { content } = req.body;

  const existing = DB.getMessageById(messageId);
  if (!existing) return res.status(404).json({ error: 'Message not found' });

  if (existing.senderId !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own messages' });
  }

  const updated = DB.updateMessage(messageId, { content, isEdited: true });

  broadcastToChat(existing.chatId, {
    type: 'message:edit',
    payload: { message: updated },
    timestamp: new Date().toISOString()
  });

  return res.json({ message: updated });
});

apiRouter.delete('/messages/:id', requireAuth, (req: any, res: any) => {
  const messageId = req.params.id;
  const existing = DB.getMessageById(messageId);
  if (!existing) return res.status(404).json({ error: 'Message not found' });

  if (existing.senderId !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own messages' });
  }

  DB.deleteMessage(messageId);

  broadcastToChat(existing.chatId, {
    type: 'message:delete',
    payload: { messageId, chatId: existing.chatId },
    timestamp: new Date().toISOString()
  });

  return res.json({ success: true });
});

apiRouter.post('/messages/:id/reactions', requireAuth, (req: any, res: any) => {
  const messageId = req.params.id;
  const { emoji, chatId } = req.body;

  if (!emoji || !chatId) {
    return res.status(400).json({ error: 'Emoji and chatId required' });
  }

  const reactions = DB.toggleReaction(messageId, req.user.id, emoji);

  broadcastToChat(chatId, {
    type: 'message:reaction',
    payload: { messageId, chatId, reactions },
    timestamp: new Date().toISOString()
  });

  return res.json({ reactions });
});

apiRouter.post('/chats/:id/pin', requireAuth, (req: any, res: any) => {
  const chatId = req.params.id;
  const { messageId, isPinned } = req.body;

  if (isPinned) {
    DB.pinMessage(chatId, messageId, req.user.id);
  } else {
    DB.unpinMessage(chatId, messageId);
  }

  const pins = DB.getPinnedMessages(chatId);

  broadcastToChat(chatId, {
    type: 'message:pin',
    payload: { chatId, messageId, isPinned, pinnedMessages: pins },
    timestamp: new Date().toISOString()
  });

  return res.json({ pinnedMessages: pins });
});

apiRouter.get('/chats/:id/pins', requireAuth, (req: any, res: any) => {
  const chatId = req.params.id;
  const pins = DB.getPinnedMessages(chatId);
  return res.json({ pinnedMessages: pins });
});

// ------------------------------------------------------------------
// GROUPS
// ------------------------------------------------------------------

apiRouter.post('/groups/create', requireAuth, (req: any, res: any) => {
  const { name, description, avatarUrl, memberUserIds } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  const participants = Array.from(new Set([req.user.id, ...(memberUserIds || [])]));

  const defaultAvatar = avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`;

  const group = DB.createChat(
    'group',
    participants,
    name.trim(),
    defaultAvatar,
    description?.trim(),
    req.user.id
  );

  const fullGroup = DB.getChatById(group.id, req.user.id);
  return res.json({ group: fullGroup });
});

apiRouter.put('/groups/:id', requireAuth, (req: any, res: any) => {
  const groupId = req.params.id;
  const { name, description, avatarUrl } = req.body;

  const chat = DB.getChatById(groupId, req.user.id);
  if (!chat || chat.type !== 'group') {
    return res.status(404).json({ error: 'Group chat not found' });
  }

  if (name) chat.name = name.trim();
  if (description !== undefined) chat.description = description.trim();
  if (avatarUrl) chat.avatarUrl = avatarUrl;

  return res.json({ group: chat });
});

apiRouter.get('/groups/:id/members', requireAuth, (req: any, res: any) => {
  const groupId = req.params.id;
  const members = DB.getGroupMembers(groupId);
  return res.json({ members });
});

apiRouter.post('/groups/:id/members', requireAuth, (req: any, res: any) => {
  const groupId = req.params.id;
  const { userId, role } = req.body;

  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  DB.addGroupMember(groupId, userId, role || 'member');
  const members = DB.getGroupMembers(groupId);
  return res.json({ members });
});

apiRouter.delete('/groups/:id/members/:userId', requireAuth, (req: any, res: any) => {
  const groupId = req.params.id;
  const targetUserId = req.params.userId;

  DB.removeGroupMember(groupId, targetUserId);
  const members = DB.getGroupMembers(groupId);
  return res.json({ members });
});

// ------------------------------------------------------------------
// FILE ATTACHMENTS & R2 EMULATOR
// ------------------------------------------------------------------

apiRouter.post('/attachments/upload', requireAuth, (req: any, res: any) => {
  const { name, type, dataUrl, mimeType, duration } = req.body;

  if (!dataUrl || !type) {
    return res.status(400).json({ error: 'File dataUrl and type are required' });
  }

  const id = 'att_' + Math.random().toString(36).substring(2, 11);

  // In production with R2, this writes to Cloudflare R2 bucket.
  // In development, dataUrl (base64) or object URL is passed cleanly.
  const attachment: Attachment = {
    id,
    type: type as any,
    url: dataUrl,
    name: name || `attachment_${Date.now()}`,
    size: Math.round((dataUrl.length * 3) / 4),
    mimeType: mimeType || 'application/octet-stream',
    duration: duration || 0
  };

  return res.json({ attachment });
});

// ------------------------------------------------------------------
// GLOBAL SEARCH
// ------------------------------------------------------------------

apiRouter.get('/search', requireAuth, (req: any, res: any) => {
  const query = (req.query.q as string) || '';
  const results = DB.searchAll(query, req.user.id);
  return res.json(results);
});

// Clear all accounts & data endpoint
apiRouter.post('/admin/clear-all-accounts', (req: any, res: any) => {
  DB.clearAllData();
  res.clearCookie('pulse_session');
  return res.json({ success: true, message: 'All accounts, sessions, and messages have been permanently removed.' });
});
