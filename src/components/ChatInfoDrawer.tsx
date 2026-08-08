import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useChat } from '../context/ChatContext.js';
import { Avatar } from './Avatar.js';
import {
  X,
  Users,
  Shield,
  UserPlus,
  UserMinus,
  VolumeX,
  Volume2,
  Ban,
  Image as ImageIcon,
  FileText,
  Music,
  Trash2
} from 'lucide-react';

export const ChatInfoDrawer: React.FC = () => {
  const { user } = useAuth();
  const { activeChat, isInfoDrawerOpen, toggleInfoDrawer, messages, setMediaPreviewUrl } = useChat();

  const [activeTab, setActiveTab] = useState<'members' | 'media' | 'files'>('members');

  if (!isInfoDrawerOpen || !activeChat) return null;

  const isDirect = activeChat.type === 'direct';
  const isSaved = activeChat.type === 'saved';

  let title = activeChat.name || 'Chat Info';
  let avatar = activeChat.avatarUrl;
  let bio = activeChat.description;

  if (isDirect && activeChat.otherUser) {
    title = activeChat.otherUser.displayName;
    avatar = activeChat.otherUser.avatarUrl;
    bio = activeChat.otherUser.bio || 'No bio provided';
  } else if (isSaved) {
    title = 'Saved Messages';
    avatar = 'https://api.dicebear.com/7.x/identicon/svg?seed=saved';
    bio = 'Personal bookmark cloud workspace';
  }

  // Filter media attachments from message history
  const allAttachments = messages.flatMap((m) => m.attachments || []);
  const mediaFiles = allAttachments.filter((a) => a.type === 'image' || a.type === 'video');
  const docFiles = allAttachments.filter((a) => a.type === 'document' || a.type === 'audio' || a.type === 'voice');

  return (
    <>
      {/* Mobile/Tablet Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden"
        onClick={toggleInfoDrawer}
      />

      <div className="fixed lg:relative inset-y-0 right-0 z-40 w-full sm:w-80 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800/80 flex flex-col select-none text-slate-800 dark:text-slate-100 shadow-2xl lg:shadow-none shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Chat Overview</h3>
        <button
          onClick={toggleInfoDrawer}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Avatar & Bio */}
      <div className="p-6 text-center border-b border-slate-200 dark:border-slate-800/60">
        <div className="flex justify-center mb-3">
          <Avatar
            name={title}
            avatarUrl={avatar}
            size="2xl"
            isGroup={activeChat.type === 'group'}
            isSaved={isSaved}
          />
        </div>
        <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">{title}</h2>
        {isDirect && activeChat.otherUser && (
          <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">@{activeChat.otherUser.username}</p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed italic">{bio}</p>
      </div>

      {/* Media & Files Tabs */}
      <div className="flex border-b border-slate-800/80 text-xs font-semibold text-slate-400">
        {activeChat.type === 'group' && (
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'members'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Members
          </button>
        )}
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-3 text-center border-b-2 transition ${
            activeTab === 'media'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          Media ({mediaFiles.length})
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-3 text-center border-b-2 transition ${
            activeTab === 'files'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          Files ({docFiles.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'members' && activeChat.type === 'group' && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Group Participants
            </p>
            {activeChat.participantIds.map((pid) => (
              <div
                key={pid}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <Avatar
                    name={pid === user?.id ? (user?.displayName || 'You') : `User ${pid.substring(0, 6)}`}
                    size="sm"
                  />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {pid === user?.id ? 'You' : `User ${pid.substring(0, 6)}`}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">@{pid}</p>
                  </div>
                </div>

                {pid === activeChat.ownerId && (
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center space-x-1">
                    <Shield className="w-2.5 h-2.5" />
                    <span>Owner</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'media' && (
          <div>
            {mediaFiles.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No shared photos or videos</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {mediaFiles.map((m) => (
                  <img
                    key={m.id}
                    src={m.url}
                    alt=""
                    onClick={() => setMediaPreviewUrl(m.url)}
                    className="w-full h-20 rounded-xl object-cover cursor-pointer hover:opacity-80 transition"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div>
            {docFiles.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No shared files or voice notes</p>
            ) : (
              <div className="space-y-2">
                {docFiles.map((f) => (
                  <a
                    key={f.id}
                    href={f.url}
                    download={f.name}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 flex items-center space-x-3 transition text-xs"
                  >
                    <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div className="truncate flex-1">
                      <p className="font-semibold text-slate-200 truncate">{f.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {(f.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </>
  );
};
