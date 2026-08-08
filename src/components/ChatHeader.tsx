import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useChat } from '../context/ChatContext.js';
import { Avatar } from './Avatar.js';
import {
  PhoneCall,
  Video,
  Search,
  Pin,
  PanelRight,
  Users,
  ArrowLeft
} from 'lucide-react';
import { CallModal } from './CallModal.js';

interface ChatHeaderProps {
  onToggleSearch: () => void;
  onTogglePinnedModal: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onToggleSearch, onTogglePinnedModal }) => {
  const { activeChat, typingState, pinnedMessages, isInfoDrawerOpen, toggleInfoDrawer, clearActiveChat } = useChat();
  const { user } = useAuth();
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);

  if (!activeChat) return null;

  const isDirect = activeChat.type === 'direct';
  const isSaved = activeChat.type === 'saved';

  const chatTyping = typingState[activeChat.id] || {};
  const typingUserIds = Object.keys(chatTyping).filter(
    (uid) => chatTyping[uid] && uid !== user?.id
  );
  const isSomeoneTyping = typingUserIds.length > 0;

  let title = activeChat.name || 'Chat';
  let avatar = activeChat.avatarUrl;
  let subtitle = '';

  if (isSomeoneTyping) {
    subtitle = isDirect
      ? 'typing...'
      : typingUserIds.length === 1
      ? 'Someone is typing...'
      : `${typingUserIds.length} people typing...`;
  } else if (isDirect && activeChat.otherUser) {
    title = activeChat.otherUser.displayName;
    avatar = activeChat.otherUser.avatarUrl;
    subtitle =
      activeChat.otherUser.onlineStatus === 'online'
        ? 'Online'
        : `Last seen ${new Date(activeChat.otherUser.lastSeen).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}`;
  } else if (isSaved) {
    title = 'Saved Messages';
    avatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=saved';
    subtitle = 'Your personal cloud workspace & bookmark storage';
  } else if (activeChat.type === 'group') {
    subtitle = `${activeChat.participantIds.length} members`;
  }

  const startVoiceCall = () => {
    setIsVideoCall(false);
    setIsCallModalOpen(true);
  };

  const startVideoCall = () => {
    setIsVideoCall(true);
    setIsCallModalOpen(true);
  };

  return (
    <>
      <div className="h-16 px-3 sm:px-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0 relative z-10 text-slate-800 dark:text-slate-100">
        {/* Left Chat Details */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearActiveChat();
            }}
            className="md:hidden p-2 -ml-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Back to chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            onClick={toggleInfoDrawer}
            className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer hover:opacity-90 transition min-w-0"
          >
            <Avatar
              name={title}
              avatarUrl={avatar}
              size="md"
              isOnline={isDirect && activeChat.otherUser?.onlineStatus === 'online'}
              isGroup={activeChat.type === 'group'}
              isSaved={isSaved}
            />

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{title}</h2>
                {activeChat.type === 'group' && (
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-1.5 py-0.5 rounded-md font-mono flex items-center space-x-1">
                    <Users className="w-2.5 h-2.5" />
                    <span>Group</span>
                  </span>
                )}
              </div>
              <p
                className={`text-xs truncate ${
                  isSomeoneTyping
                    ? 'text-cyan-500 font-semibold animate-pulse flex items-center'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {isSomeoneTyping && (
                  <span className="inline-flex space-x-0.5 items-center mr-1.5">
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></span>
                  </span>
                )}
                <span>{subtitle}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-1">
          {/* Pinned Messages Trigger */}
          <button
            onClick={onTogglePinnedModal}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition relative"
            title="Pinned Messages"
          >
            <Pin className="w-4 h-4" />
            {pinnedMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-cyan-500 text-slate-950 font-bold w-4 h-4 rounded-full text-[10px] flex items-center justify-center">
                {pinnedMessages.length}
              </span>
            )}
          </button>

          {/* Search in Chat */}
          <button
            onClick={onToggleSearch}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
            title="Search messages"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Voice Call Icon */}
          {!isSaved && (
            <button
              onClick={startVoiceCall}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
              title="Start voice call"
            >
              <PhoneCall className="w-4 h-4" />
            </button>
          )}

          {/* Video Call Icon */}
          {!isSaved && (
            <button
              onClick={startVideoCall}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
              title="Start HD video call"
            >
              <Video className="w-4 h-4" />
            </button>
          )}

          {/* Info Drawer Toggle */}
          <button
            onClick={toggleInfoDrawer}
            className={`p-2 rounded-xl transition ${
              isInfoDrawerOpen
                ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
            }`}
            title="Chat info & details"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real Call Modal */}
      <CallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        targetUser={{
          displayName: title,
          avatarUrl: avatar
        }}
        isVideo={isVideoCall}
      />
    </>
  );
};
