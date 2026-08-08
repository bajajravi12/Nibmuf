import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useChat } from '../context/ChatContext.js';
import { Avatar } from './Avatar.js';
import { Message, Attachment } from '../types.js';
import {
  Check,
  CheckCheck,
  CornerUpLeft,
  Edit2,
  Trash2,
  Pin,
  Share2,
  Play,
  Pause,
  Download,
  FileText,
  Smile,
  Volume2
} from 'lucide-react';

interface MessageListProps {
  onSelectMessageToScroll?: (msgId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = () => {
  const { user } = useAuth();
  const {
    activeChat,
    messages,
    isLoadingMessages,
    typingState,
    setReplyTarget,
    setEditTarget,
    setForwardTarget,
    deleteMessage,
    toggleReaction,
    togglePinMessage,
    setMediaPreviewUrl
  } = useChat();

  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [expandedReactionMsgId, setExpandedReactionMsgId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingState]);

  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-8">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading Messages...</p>
        </div>
      </div>
    );
  }

  // Active typing indicator users for this chat
  const chatTyping = activeChat ? typingState[activeChat.id] || {} : {};
  const typingUsers = Object.keys(chatTyping).filter(
    (uid) => chatTyping[uid] && uid !== user?.id
  );

  // Helper for voice audio playback
  const toggleAudioPlay = (url: string, id: string) => {
    if (activeAudioId === id && isPlayingAudio) {
      audioRef.current?.pause();
      setIsPlayingAudio(false);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      setActiveAudioId(id);
      setIsPlayingAudio(true);

      audio.play();
      audio.onended = () => {
        setIsPlayingAudio(false);
        setActiveAudioId(null);
      };
    }
  };

  const quickEmojis = ['👍', '❤️', '🔥', '😂', '👏', '😮', '🚀', '🎉', '🙏', '💯', '✨', '😍'];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100 dark:bg-slate-950/60 font-sans relative text-slate-800 dark:text-slate-100">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-cyan-500 shadow-md mb-2">
            ✨
          </div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No messages in this chat yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
            Send a text, photo, document, or voice note to kick off the conversation.
          </p>
        </div>
      ) : (
        messages.map((msg, index) => {
          const isMe = msg.senderId === user?.id;
          const showAvatar =
            !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);

          return (
            <div
              key={msg.id}
              className={`flex items-end space-x-2 group ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {/* Avatar for received messages */}
              {!isMe && (
                <div className="w-8 h-8 shrink-0">
                  {showAvatar ? (
                    <Avatar
                      name={msg.sender?.displayName || msg.sender?.username || 'User'}
                      avatarUrl={msg.sender?.avatarUrl}
                      size="sm"
                    />
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              )}

              {/* Message Bubble Container */}
              <div className="max-w-[85%] sm:max-w-[70%] relative">
                {/* Sender Name in group chats */}
                {!isMe && activeChat?.type === 'group' && showAvatar && (
                  <p className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 mb-1 ml-1">
                    {msg.sender?.displayName || 'Group Member'}
                  </p>
                )}

                {/* Reply Banner inside bubble */}
                {msg.replyToMessage && (
                  <div
                    className={`mb-1 p-2 rounded-xl text-xs border-l-2 backdrop-blur-md ${
                      isMe
                        ? 'bg-cyan-700/20 border-white text-white'
                        : 'bg-slate-100 dark:bg-slate-800/80 border-cyan-500 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <p className="font-bold text-[10px] uppercase tracking-wider mb-0.5 opacity-90">
                      Replying to {msg.replyToMessage.sender?.displayName || 'User'}
                    </p>
                    <p className="truncate opacity-80">{msg.replyToMessage.content}</p>
                  </div>
                )}

                {/* Main Bubble Box */}
                <div
                  className={`p-3.5 rounded-2xl text-sm relative shadow-sm transition-all ${
                    isMe
                      ? 'bg-cyan-600 dark:bg-gradient-to-tr dark:from-cyan-600 dark:to-blue-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none'
                  }`}
                >
                  {/* Attachments rendering */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {msg.attachments.map((att) => (
                        <div key={att.id}>
                          {att.type === 'image' && (
                            <img
                              src={att.url}
                              alt={att.name}
                              onClick={() => setMediaPreviewUrl(att.url)}
                              className="rounded-xl max-h-64 object-cover w-full cursor-pointer hover:opacity-95 transition"
                            />
                          )}

                          {att.type === 'video' && (
                            <video
                              src={att.url}
                              controls
                              className="rounded-xl max-h-64 w-full bg-black"
                            />
                          )}

                          {(att.type === 'voice' || att.type === 'audio') && (
                            <div className="p-2.5 rounded-xl bg-black/10 dark:bg-black/20 border border-black/10 dark:border-white/10 flex items-center space-x-3">
                              <button
                                onClick={() => toggleAudioPlay(att.url, att.id)}
                                className="w-9 h-9 rounded-full bg-cyan-500 text-white flex items-center justify-center shrink-0 transition"
                              >
                                {activeAudioId === att.id && isPlayingAudio ? (
                                  <Pause className="w-4 h-4 fill-current" />
                                ) : (
                                  <Play className="w-4 h-4 fill-current ml-0.5" />
                                )}
                              </button>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-1 h-5 overflow-hidden">
                                  {[40, 70, 30, 90, 50, 100, 60, 40, 80, 30, 60, 90, 50, 70].map(
                                    (h, i) => (
                                      <span
                                        key={i}
                                        style={{ height: `${h}%` }}
                                        className={`w-1 rounded-full ${
                                          activeAudioId === att.id && isPlayingAudio
                                            ? 'bg-cyan-300 animate-pulse'
                                            : 'bg-slate-400 dark:bg-white/40'
                                        }`}
                                      />
                                    )
                                  )}
                                </div>
                                <div className="flex justify-between items-center text-[10px] opacity-80 mt-1 font-mono">
                                  <span>Voice Note</span>
                                  <span>{att.duration ? `${att.duration}s` : '0:15'}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {att.type === 'document' && (
                            <div className="p-3 rounded-xl bg-black/10 dark:bg-black/20 border border-black/10 dark:border-white/10 flex items-center justify-between space-x-3">
                              <div className="flex items-center space-x-2 min-w-0">
                                <FileText className="w-5 h-5 text-cyan-500 shrink-0" />
                                <div className="truncate">
                                  <p className="font-semibold text-xs truncate">{att.name}</p>
                                  <p className="text-[10px] opacity-70 font-mono">
                                    {(att.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                              <a
                                href={att.url}
                                download={att.name}
                                className="p-1.5 rounded-lg bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 transition"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Text Content */}
                  {msg.content && <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>}

                  {/* Timestamp & Read Receipt Ticks */}
                  <div
                    className={`mt-1.5 flex items-center justify-end space-x-1 text-[10px] font-mono ${
                      isMe ? 'text-cyan-100/90' : 'text-slate-400'
                    }`}
                  >
                    {msg.isEdited && <span className="italic mr-1">edited</span>}
                    {msg.isPinned && <Pin className="w-3 h-3 text-cyan-300" />}
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {isMe && (
                      <span className="ml-1 inline-flex items-center" title={`Status: ${msg.status === 'read' ? 'Seen (Read)' : msg.status === 'delivered' ? 'Delivered' : 'Sent'}`}>
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-4 h-4 text-[#34B7F1] dark:text-[#34B7F1] stroke-[2.8] filter drop-shadow-[0_0_2px_rgba(52,183,241,0.5)]" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-slate-200/80 dark:text-slate-200/80" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-slate-200/70 dark:text-slate-200/70" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reactions list under bubble */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(
                      msg.reactions.reduce((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(msg.id, emoji)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 rounded-full px-2 py-0.5 text-xs flex items-center space-x-1 text-slate-700 dark:text-slate-200 transition shadow-sm"
                      >
                        <span>{emoji}</span>
                        <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400">{count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Hover Quick Action Context Bar */}
                <div
                  className={`absolute -top-3.5 ${
                    isMe ? 'right-2' : 'left-2'
                  } opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 flex items-center space-x-1 shadow-lg backdrop-blur-md z-30 text-slate-700 dark:text-slate-200`}
                >
                  {/* Quick Reactions */}
                  {quickEmojis.slice(0, 5).map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(msg.id, emoji)}
                      className="p-1 hover:scale-125 transition text-sm"
                    >
                      {emoji}
                    </button>
                  ))}

                  <button
                    onClick={() =>
                      setExpandedReactionMsgId(expandedReactionMsgId === msg.id ? null : msg.id)
                    }
                    className="p-1 text-xs font-bold hover:text-cyan-500 text-slate-400"
                    title="More emojis"
                  >
                    +
                  </button>

                  <div className="w-px h-3 bg-slate-200 dark:bg-slate-800 mx-0.5" />

                  <button
                    onClick={() => setReplyTarget(msg)}
                    className="p-1 hover:text-cyan-500 text-slate-400 transition"
                    title="Reply"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setForwardTarget(msg)}
                    className="p-1 hover:text-cyan-500 text-slate-400 transition"
                    title="Forward"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => togglePinMessage(msg.id, !msg.isPinned)}
                    className="p-1 hover:text-amber-500 text-slate-400 transition"
                    title="Pin message"
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  {isMe && (
                    <>
                      <button
                        onClick={() => setEditTarget(msg)}
                        className="p-1 hover:text-purple-500 text-slate-400 transition"
                        title="Edit message"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="p-1 hover:text-rose-500 text-slate-400 transition"
                        title="Delete message for everyone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Expanded Emoji Selector Popup */}
                {expandedReactionMsgId === msg.id && (
                  <div className="absolute -top-12 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-2xl flex items-center space-x-1.5 z-40 animate-fadeIn">
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          toggleReaction(msg.id, emoji);
                          setExpandedReactionMsgId(null);
                        }}
                        className="p-1 hover:scale-125 transition text-base"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Typing Indicator Bubble (WhatsApp / Telegram style) */}
      {typingUsers.length > 0 && (
        <div className="flex items-end space-x-2 my-2 animate-fadeIn">
          <Avatar
            name={activeChat?.type === 'direct' ? (activeChat.otherUser?.displayName || 'User') : 'User'}
            avatarUrl={activeChat?.type === 'direct' ? activeChat.otherUser?.avatarUrl : undefined}
            size="xs"
          />
          <div className="bg-slate-200/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-2xl rounded-bl-xs flex items-center space-x-2 shadow-sm border border-slate-300/40 dark:border-slate-700/50">
            <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">typing</span>
            <span className="flex space-x-1 items-center">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></span>
            </span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
