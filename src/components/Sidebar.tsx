import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useChat } from '../context/ChatContext.js';
import { useTheme } from '../hooks/useTheme.js';
import { Avatar } from './Avatar.js';
import {
  Search,
  Plus,
  Bookmark,
  Settings,
  LogOut,
  Moon,
  Sun,
  Users,
  Pin,
  VolumeX,
  Zap,
  MoreVertical
} from 'lucide-react';

interface SidebarProps {
  onOpenNewChatModal: () => void;
  onOpenSettingsModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenNewChatModal, onOpenSettingsModal }) => {
  const { user, logout } = useAuth();
  const { chats, activeChat, selectChat, openSavedMessages, isConnected, typingState } = useChat();
  const { theme, toggleTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'direct' | 'group' | 'saved'>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Filtered chats
  const filteredChats = chats.filter((chat) => {
    // Tab filter
    if (filterTab === 'direct' && chat.type !== 'direct') return false;
    if (filterTab === 'group' && chat.type !== 'group') return false;
    if (filterTab === 'saved' && chat.type !== 'saved') return false;

    // Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatches = chat.type === 'direct'
      ? chat.otherUser?.displayName.toLowerCase().includes(q) || chat.otherUser?.username.toLowerCase().includes(q)
      : chat.name?.toLowerCase().includes(q);

    const msgMatches = chat.lastMessage?.content.toLowerCase().includes(q);
    return nameMatches || msgMatches;
  });

  return (
    <div className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 select-none text-slate-800 dark:text-slate-100 relative z-20 shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar
            name={user?.displayName || user?.username || 'User'}
            avatarUrl={user?.avatarUrl}
            size="md"
            isOnline={isConnected}
          />
          <div className="overflow-hidden">
            <h2 className="font-bold text-sm truncate text-slate-900 dark:text-slate-100">{user?.displayName}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">@{user?.username}</p>
          </div>
        </div>

        {/* Menu Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 text-sm animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenNewChatModal();
                }}
                className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 transition"
              >
                <Plus className="w-4 h-4 text-cyan-500" />
                <span>New Chat / Group</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  openSavedMessages();
                }}
                className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 transition"
              >
                <Bookmark className="w-4 h-4 text-amber-500" />
                <span>Saved Messages</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenSettingsModal();
                }}
                className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 transition"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  toggleTheme();
                }}
                className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 transition"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Light Theme</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-purple-600" />
                    <span>Dark Theme</span>
                  </>
                )}
              </button>

              <div className="my-1 border-t border-slate-200 dark:border-slate-800/80" />

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  logout();
                }}
                className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats, users, messages..."
            className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 pb-2 flex items-center space-x-1 border-b border-slate-200 dark:border-slate-800/60 text-xs font-medium text-slate-500 dark:text-slate-400">
        {[
          { key: 'all', label: 'All' },
          { key: 'direct', label: 'Direct' },
          { key: 'group', label: 'Groups' },
          { key: 'saved', label: 'Saved' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterTab === tab.key
                ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold border border-cyan-200 dark:border-cyan-500/20'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Zap className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No chats found</p>
            <button
              onClick={onOpenNewChatModal}
              className="mt-3 text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
            >
              Start a new conversation
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = activeChat?.id === chat.id;
            const isDirect = chat.type === 'direct';
            const isSaved = chat.type === 'saved';

            let title = chat.name;
            let avatar = chat.avatarUrl;

            if (isDirect && chat.otherUser) {
              title = chat.otherUser.displayName;
              avatar = chat.otherUser.avatarUrl;
            } else if (isSaved) {
              title = 'Saved Messages';
              avatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=saved';
            }

            const isOnline = isDirect && chat.otherUser?.onlineStatus === 'online';

            const chatTypingMap = typingState[chat.id] || {};
            const isSomeoneTyping = Object.keys(chatTypingMap).some(
              (uid) => chatTypingMap[uid] && uid !== user?.id
            );

            return (
              <div
                key={chat.id}
                onClick={() => selectChat(chat.id)}
                className={`p-3.5 flex items-center space-x-3 cursor-pointer transition ${
                  isActive
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 border-l-4 border-cyan-500'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-850/60'
                }`}
              >
                {/* Avatar with status indicator */}
                <Avatar
                  name={title}
                  avatarUrl={avatar}
                  size="lg"
                  isOnline={isOnline}
                  isGroup={chat.type === 'group'}
                  isSaved={isSaved}
                />

                {/* Chat Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm truncate text-slate-900 dark:text-slate-100">{title}</h3>
                    {chat.lastMessage && (
                      <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                        {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="truncate pr-2">
                      {isSomeoneTyping ? (
                        <span className="text-cyan-500 font-semibold animate-pulse flex items-center space-x-1">
                          <span className="inline-flex space-x-0.5 items-center mr-1">
                            <span className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce"></span>
                          </span>
                          <span>typing...</span>
                        </span>
                      ) : chat.lastMessage ? (
                        <p className="truncate">
                          {chat.lastMessage.senderId === user?.id && <span className="text-cyan-600 dark:text-cyan-400">You: </span>}
                          {chat.lastMessage.content || '[Media Attachment]'}
                        </p>
                      ) : (
                        <span className="italic text-slate-400">No messages yet</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {chat.isMuted && <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                      {chat.isPinned && <Pin className="w-3.5 h-3.5 text-cyan-500" />}
                      {chat.unreadCount > 0 && (
                        <span className="bg-cyan-500 text-white font-bold px-2 py-0.5 rounded-full text-[10px] min-w-[20px] text-center shadow-sm animate-in zoom-in-75 duration-150">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
