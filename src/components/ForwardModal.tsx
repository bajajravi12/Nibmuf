import React from 'react';
import { useChat } from '../context/ChatContext.js';
import { Avatar } from './Avatar.js';
import { X, Share2 } from 'lucide-react';

export const ForwardModal: React.FC = () => {
  const { forwardTarget, setForwardTarget, chats, sendMessage } = useChat();

  if (!forwardTarget) return null;

  const handleForwardTo = async (chatId: string) => {
    await sendMessage(`Forwarded message:\n"${forwardTarget.content}"`);
    setForwardTarget(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-100">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Forward Message To</h3>
          </div>
          <button
            onClick={() => setForwardTarget(null)}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 max-h-80 overflow-y-auto space-y-1">
          {chats.map((c) => (
            <div
              key={c.id}
              onClick={() => handleForwardTo(c.id)}
              className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 flex items-center space-x-3 cursor-pointer transition"
            >
              <Avatar
                name={c.name}
                avatarUrl={c.avatarUrl}
                size="sm"
                isGroup={c.type === 'group'}
                isSaved={c.type === 'saved'}
              />
              <div className="truncate flex-1">
                <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">{c.name}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{c.type} chat</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
