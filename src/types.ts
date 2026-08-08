export interface User {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  onlineStatus: 'online' | 'offline' | 'away';
  lastSeen: string;
  createdAt: string;
  privacyLastSeen?: 'everyone' | 'nobody';
  privacyReadReceipts?: boolean;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

export type ChatType = 'direct' | 'group' | 'saved';

export interface Chat {
  id: string;
  type: ChatType;
  name?: string; // For groups or direct user display name
  avatarUrl?: string;
  description?: string;
  participantIds: string[];
  otherUser?: User; // Hydrated for direct chats
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'voice' | 'document';
  url: string;
  name: string;
  size: number;
  mimeType: string;
  duration?: number; // for audio/video/voice in seconds
}

export interface Reaction {
  emoji: string;
  userId: string;
  userDisplayName?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  sender?: User;
  content: string;
  replyToMessageId?: string;
  replyToMessage?: Message;
  attachments?: Attachment[];
  reactions?: Reaction[];
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isEdited?: boolean;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  user?: User;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  ownerId: string;
  memberCount: number;
  members?: GroupMember[];
  createdAt: string;
}

export interface BlockedUser {
  userId: string;
  blockedUserId: string;
  blockedUser?: User;
  createdAt: string;
}

export interface PinnedMessage {
  id: string;
  chatId: string;
  messageId: string;
  pinnedByUserId: string;
  createdAt: string;
}

// WebSocket Event Payloads
export type WSAction =
  | 'auth'
  | 'auth:success'
  | 'message:send'
  | 'message:new'
  | 'message:edit'
  | 'message:delete'
  | 'message:reaction'
  | 'reaction:update'
  | 'message:pin'
  | 'pin:update'
  | 'typing'
  | 'typing:update'
  | 'read:receipt'
  | 'read:update'
  | 'messages:read'
  | 'presence'
  | 'error';

export interface WSMessage {
  type: WSAction;
  payload: any;
  timestamp: string;
}
