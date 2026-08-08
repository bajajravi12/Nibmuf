import fs from 'fs';
import path from 'path';
import {
  User,
  Session,
  Chat,
  Message,
  Attachment,
  Reaction,
  GroupMember,
  BlockedUser,
  PinnedMessage
} from '../types.js';

interface DatabaseData {
  users: Record<string, User & { passwordHash: string; salt: string }>;
  sessions: Record<string, Session>;
  chats: Record<string, Chat>;
  chatParticipants: Record<string, string[]>; // chatId -> userId[]
  messages: Record<string, Message>;
  attachments: Record<string, Attachment & { messageId: string }>;
  reactions: Record<string, Reaction & { id: string; messageId: string }>;
  groupMembers: Record<string, GroupMember[]>; // groupId -> GroupMember[]
  blockedUsers: Record<string, string[]>; // userId -> blockedUserId[]
  pinnedMessages: Record<string, PinnedMessage[]>; // chatId -> PinnedMessage[]
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'pulse_db.json');

function initDb(): DatabaseData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error('Failed to parse pulse_db.json, re-initializing database:', err);
    }
  }

  const initialData: DatabaseData = {
    users: {},
    sessions: {},
    chats: {},
    chatParticipants: {},
    messages: {},
    attachments: {},
    reactions: {},
    groupMembers: {},
    blockedUsers: {},
    pinnedMessages: {}
  };

  return initialData;
}

let db = initDb();

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

export const DB = {
  // User operations
  getUserById(id: string): User | undefined {
    const user = db.users[id];
    if (!user) return undefined;
    const { passwordHash, salt, ...cleanUser } = user;
    return cleanUser;
  },

  getUserByUsername(username: string): (User & { passwordHash: string; salt: string }) | undefined {
    return Object.values(db.users).find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
  },

  createUser(
    userData: Omit<User, 'id' | 'createdAt'> & { passwordHash: string; salt: string }
  ): User {
    const id = 'usr_' + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    const newUser = {
      id,
      ...userData,
      createdAt: now
    };
    db.users[id] = newUser;
    saveDb();
    const { passwordHash, salt, ...clean } = newUser;
    return clean;
  },

  updateUser(id: string, updates: Partial<User & { passwordHash?: string; salt?: string }>): User | undefined {
    const user = db.users[id];
    if (!user) return undefined;
    db.users[id] = { ...user, ...updates };
    saveDb();
    const { passwordHash, salt, ...clean } = db.users[id];
    return clean;
  },

  deleteUser(id: string): boolean {
    if (!db.users[id]) return false;
    delete db.users[id];
    // Clean up sessions
    Object.keys(db.sessions).forEach((token) => {
      if (db.sessions[token].userId === id) {
        delete db.sessions[token];
      }
    });
    saveDb();
    return true;
  },

  getAllUsers(excludeId?: string): User[] {
    return Object.values(db.users)
      .filter((u) => u.id !== excludeId)
      .map(({ passwordHash, salt, ...u }) => u);
  },

  // Sessions
  createSession(userId: string, hoursValid = 72): Session {
    const token = 'ses_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const expiresAt = new Date(Date.now() + hoursValid * 3600 * 1000).toISOString();
    const session: Session = { token, userId, expiresAt };
    db.sessions[token] = session;
    saveDb();
    return session;
  },

  getSession(token: string): Session | undefined {
    const session = db.sessions[token];
    if (!session) return undefined;
    if (new Date(session.expiresAt) < new Date()) {
      delete db.sessions[token];
      saveDb();
      return undefined;
    }
    return session;
  },

  deleteSession(token: string) {
    delete db.sessions[token];
    saveDb();
  },

  // Chats
  createChat(type: 'direct' | 'group' | 'saved', participantIds: string[], name?: string, avatarUrl?: string, description?: string, ownerId?: string): Chat {
    const id = 'chat_' + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    const chat: Chat = {
      id,
      type,
      name,
      avatarUrl,
      description,
      participantIds,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now
    };

    db.chats[id] = chat;
    db.chatParticipants[id] = participantIds;

    if (type === 'group' && ownerId) {
      const members: GroupMember[] = participantIds.map((pid) => ({
        groupId: id,
        userId: pid,
        role: pid === ownerId ? 'owner' : 'member',
        joinedAt: now
      }));
      db.groupMembers[id] = members;
    }

    saveDb();
    return chat;
  },

  getChatById(chatId: string, currentUserId?: string): Chat | undefined {
    const chat = db.chats[chatId];
    if (!chat) return undefined;
    const participants = db.chatParticipants[chatId] || [];
    
    // If direct chat, hydrate otherUser
    let otherUser: User | undefined = undefined;
    if (chat.type === 'direct' && currentUserId) {
      const otherId = participants.find((pid) => pid !== currentUserId) || currentUserId;
      otherUser = DB.getUserById(otherId);
    }

    // Get last message
    const chatMsgs = Object.values(db.messages)
      .filter((m) => m.chatId === chatId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Get unread message count for current user
    const unreadCount = currentUserId
      ? Object.values(db.messages).filter(
          (m) => m.chatId === chatId && m.senderId !== currentUserId && m.status !== 'read'
        ).length
      : 0;

    return {
      ...chat,
      unreadCount,
      participantIds: participants,
      otherUser,
      lastMessage: chatMsgs[0] ? DB.hydrateMessage(chatMsgs[0]) : undefined
    };
  },

  getUserChats(userId: string): Chat[] {
    const userChatIds = Object.keys(db.chatParticipants).filter((chatId) =>
      db.chatParticipants[chatId].includes(userId)
    );

    return userChatIds
      .map((id) => DB.getChatById(id, userId))
      .filter((c): c is Chat => c !== undefined)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  findDirectChat(userA: string, userB: string): Chat | undefined {
    const chatId = Object.keys(db.chats).find((id) => {
      const c = db.chats[id];
      if (c.type !== 'direct') return false;
      const parts = db.chatParticipants[id] || [];
      return (
        (parts.includes(userA) && parts.includes(userB)) ||
        (userA === userB && parts.length === 1 && parts[0] === userA)
      );
    });

    if (!chatId) return undefined;
    return DB.getChatById(chatId, userA);
  },

  getSavedMessagesChat(userId: string): Chat {
    let savedChat = Object.values(db.chats).find(
      (c) => c.type === 'saved' && db.chatParticipants[c.id]?.includes(userId)
    );

    if (!savedChat) {
      savedChat = DB.createChat('saved', [userId], 'Saved Messages', '/saved_bookmark.png');
    }

    return DB.getChatById(savedChat.id, userId)!;
  },

  // Messages
  createMessage(msgData: {
    chatId: string;
    senderId: string;
    content: string;
    replyToMessageId?: string;
    attachments?: Attachment[];
  }): Message {
    const id = 'msg_' + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();

    const newMsg: Message = {
      id,
      chatId: msgData.chatId,
      senderId: msgData.senderId,
      content: msgData.content,
      replyToMessageId: msgData.replyToMessageId,
      attachments: msgData.attachments || [],
      reactions: [],
      status: 'sent',
      isEdited: false,
      isPinned: false,
      createdAt: now,
      updatedAt: now
    };

    db.messages[id] = newMsg;

    // Update chat updatedAt
    if (db.chats[msgData.chatId]) {
      db.chats[msgData.chatId].updatedAt = now;
    }

    // Save attachments
    if (msgData.attachments) {
      msgData.attachments.forEach((att) => {
        db.attachments[att.id] = { ...att, messageId: id };
      });
    }

    saveDb();
    return DB.hydrateMessage(newMsg);
  },

  getMessageById(id: string): Message | undefined {
    const msg = db.messages[id];
    if (!msg) return undefined;
    return DB.hydrateMessage(msg);
  },

  getChatMessages(chatId: string, limit = 100): Message[] {
    return Object.values(db.messages)
      .filter((m) => m.chatId === chatId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-limit)
      .map((m) => DB.hydrateMessage(m));
  },

  markChatMessagesAsRead(chatId: string, currentUserId: string): Message[] {
    const updatedMessages: Message[] = [];
    Object.values(db.messages).forEach((msg) => {
      if (msg.chatId === chatId && msg.senderId !== currentUserId && msg.status !== 'read') {
        msg.status = 'read';
        msg.updatedAt = new Date().toISOString();
        updatedMessages.push(DB.hydrateMessage(msg));
      }
    });
    if (updatedMessages.length > 0) saveDb();
    return updatedMessages;
  },

  updateMessage(id: string, updates: { content?: string; isEdited?: boolean; isPinned?: boolean; status?: 'sent' | 'delivered' | 'read' }): Message | undefined {
    const msg = db.messages[id];
    if (!msg) return undefined;

    db.messages[id] = {
      ...msg,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    saveDb();
    return DB.hydrateMessage(db.messages[id]);
  },

  deleteMessage(id: string): boolean {
    if (!db.messages[id]) return false;
    delete db.messages[id];
    // delete related attachments & reactions
    Object.keys(db.attachments).forEach((attId) => {
      if (db.attachments[attId].messageId === id) delete db.attachments[attId];
    });
    Object.keys(db.reactions).forEach((reactId) => {
      if (db.reactions[reactId].messageId === id) delete db.reactions[reactId];
    });
    saveDb();
    return true;
  },

  hydrateMessage(msg: Message): Message {
    const sender = DB.getUserById(msg.senderId);
    
    // Hydrate reply message if present
    let replyToMessage: Message | undefined = undefined;
    if (msg.replyToMessageId && db.messages[msg.replyToMessageId]) {
      const replyRaw = db.messages[msg.replyToMessageId];
      replyToMessage = {
        ...replyRaw,
        sender: DB.getUserById(replyRaw.senderId)
      };
    }

    // Hydrate reactions
    const msgReactions = Object.values(db.reactions)
      .filter((r) => r.messageId === msg.id)
      .map((r) => {
        const u = DB.getUserById(r.userId);
        return {
          emoji: r.emoji,
          userId: r.userId,
          userDisplayName: u ? u.displayName : 'User'
        };
      });

    // Hydrate attachments
    const msgAttachments = Object.values(db.attachments)
      .filter((a) => a.messageId === msg.id)
      .map(({ messageId, ...a }) => a);

    return {
      ...msg,
      sender,
      replyToMessage,
      reactions: msgReactions,
      attachments: msgAttachments.length > 0 ? msgAttachments : msg.attachments
    };
  },

  toggleReaction(messageId: string, userId: string, emoji: string): Reaction[] {
    const reactKey = `${messageId}_${userId}_${emoji}`;
    if (db.reactions[reactKey]) {
      delete db.reactions[reactKey];
    } else {
      db.reactions[reactKey] = {
        id: reactKey,
        messageId,
        userId,
        emoji
      };
    }
    saveDb();

    return Object.values(db.reactions)
      .filter((r) => r.messageId === messageId)
      .map((r) => {
        const u = DB.getUserById(r.userId);
        return {
          emoji: r.emoji,
          userId: r.userId,
          userDisplayName: u?.displayName || 'User'
        };
      });
  },

  // Group Members
  getGroupMembers(groupId: string): GroupMember[] {
    const members = db.groupMembers[groupId] || [];
    return members.map((m) => ({
      ...m,
      user: DB.getUserById(m.userId)
    }));
  },

  addGroupMember(groupId: string, userId: string, role: 'admin' | 'member' = 'member'): boolean {
    const participants = db.chatParticipants[groupId] || [];
    if (!participants.includes(userId)) {
      participants.push(userId);
      db.chatParticipants[groupId] = participants;
    }

    const members = db.groupMembers[groupId] || [];
    if (!members.some((m) => m.userId === userId)) {
      members.push({
        groupId,
        userId,
        role,
        joinedAt: new Date().toISOString()
      });
      db.groupMembers[groupId] = members;
    }

    saveDb();
    return true;
  },

  removeGroupMember(groupId: string, userId: string): boolean {
    if (db.chatParticipants[groupId]) {
      db.chatParticipants[groupId] = db.chatParticipants[groupId].filter((id) => id !== userId);
    }
    if (db.groupMembers[groupId]) {
      db.groupMembers[groupId] = db.groupMembers[groupId].filter((m) => m.userId !== userId);
    }
    saveDb();
    return true;
  },

  // Blocked users
  blockUser(userId: string, blockedUserId: string) {
    const list = db.blockedUsers[userId] || [];
    if (!list.includes(blockedUserId)) {
      list.push(blockedUserId);
      db.blockedUsers[userId] = list;
      saveDb();
    }
  },

  unblockUser(userId: string, blockedUserId: string) {
    if (db.blockedUsers[userId]) {
      db.blockedUsers[userId] = db.blockedUsers[userId].filter((id) => id !== blockedUserId);
      saveDb();
    }
  },

  getBlockedUsers(userId: string): User[] {
    const list = db.blockedUsers[userId] || [];
    return list.map((id) => DB.getUserById(id)).filter((u): u is User => u !== undefined);
  },

  isBlocked(userId: string, targetUserId: string): boolean {
    const list = db.blockedUsers[userId] || [];
    return list.includes(targetUserId);
  },

  // Pinned Messages
  pinMessage(chatId: string, messageId: string, userId: string) {
    const pins = db.pinnedMessages[chatId] || [];
    if (!pins.some((p) => p.messageId === messageId)) {
      pins.push({
        id: 'pin_' + Math.random().toString(36).substring(2, 9),
        chatId,
        messageId,
        pinnedByUserId: userId,
        createdAt: new Date().toISOString()
      });
      db.pinnedMessages[chatId] = pins;
      DB.updateMessage(messageId, { isPinned: true });
      saveDb();
    }
  },

  unpinMessage(chatId: string, messageId: string) {
    if (db.pinnedMessages[chatId]) {
      db.pinnedMessages[chatId] = db.pinnedMessages[chatId].filter((p) => p.messageId !== messageId);
      DB.updateMessage(messageId, { isPinned: false });
      saveDb();
    }
  },

  getPinnedMessages(chatId: string): Message[] {
    const pins = db.pinnedMessages[chatId] || [];
    return pins
      .map((p) => DB.getMessageById(p.messageId))
      .filter((m): m is Message => m !== undefined);
  },

  // Global Search
  searchAll(query: string, currentUserId: string) {
    const q = query.toLowerCase().trim();
    if (!q) return { users: [], groups: [], messages: [] };

    const users = DB.getAllUsers(currentUserId).filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.bio?.toLowerCase().includes(q)
    );

    const userChatIds = Object.keys(db.chatParticipants).filter((chatId) =>
      db.chatParticipants[chatId].includes(currentUserId)
    );

    const groups = userChatIds
      .map((id) => DB.getChatById(id, currentUserId))
      .filter((c): c is Chat => c !== undefined && c.type === 'group')
      .filter((g) => g.name?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q));

    const messages = Object.values(db.messages)
      .filter((m) => userChatIds.includes(m.chatId))
      .filter((m) => m.content.toLowerCase().includes(q))
      .map((m) => DB.hydrateMessage(m));

    return { users, groups, messages };
  },

  // Clear all data (reset accounts, chats, sessions)
  clearAllData() {
    db.users = {};
    db.sessions = {};
    db.chats = {};
    db.chatParticipants = {};
    db.messages = {};
    db.attachments = {};
    db.reactions = {};
    db.groupMembers = {};
    db.blockedUsers = {};
    db.pinnedMessages = {};
    saveDb();
    console.log('⚡ All database accounts and sessions cleared successfully.');
  }
};

// Clear database on startup as requested by user to wipe all existing accounts
DB.clearAllData();

// Seed demo dataset on first launch if users database is empty
export function seedDatabaseIfEmpty() {
  console.log('Database initialized with clean data store.');
}
