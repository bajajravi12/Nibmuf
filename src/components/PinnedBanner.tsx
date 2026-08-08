import React, { useState } from 'react';
import { useChat } from '../context/ChatContext.js';
import { Pin, X, ChevronRight } from 'lucide-react';

export const PinnedBanner: React.FC = () => {
  const { pinnedMessages, togglePinMessage } = useChat();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (pinnedMessages.length === 0) return null;

  const currentPin = pinnedMessages[currentIndex % pinnedMessages.length];

  return (
    <div className="bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800/80 px-4 py-2 flex items-center justify-between text-xs text-slate-800 dark:text-slate-200 shrink-0 relative z-10 shadow-sm">
      <div className="flex items-center space-x-2.5 min-w-0">
        <span className="p-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
          <Pin className="w-3.5 h-3.5" />
        </span>
        <div className="truncate">
          <p className="font-bold text-[10px] uppercase text-cyan-600 dark:text-cyan-400 tracking-wider">
            Pinned Message {pinnedMessages.length > 1 ? `(${currentIndex + 1}/${pinnedMessages.length})` : ''}
          </p>
          <p className="truncate opacity-90 text-slate-800 dark:text-slate-200">{currentPin.content || '[Media Attachment]'}</p>
        </div>
      </div>

      <div className="flex items-center space-x-1 shrink-0">
        {pinnedMessages.length > 1 && (
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            title="Next pinned message"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => togglePinMessage(currentPin.id, false)}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          title="Unpin message"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
