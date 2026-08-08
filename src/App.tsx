import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ChatProvider, useChat } from './context/ChatContext.js';
import { AuthScreen } from './components/AuthScreen.js';
import { Sidebar } from './components/Sidebar.js';
import { ChatHeader } from './components/ChatHeader.js';
import { PinnedBanner } from './components/PinnedBanner.js';
import { MessageList } from './components/MessageList.js';
import { FloatingComposer } from './components/FloatingComposer.js';
import { ChatInfoDrawer } from './components/ChatInfoDrawer.js';
import { NewChatModal } from './components/NewChatModal.js';
import { ProfileSettingsModal } from './components/ProfileSettingsModal.js';
import { ForwardModal } from './components/ForwardModal.js';
import { MediaViewerModal } from './components/MediaViewerModal.js';
import { Zap, MessageSquare, Plus, Bookmark, Sparkles } from 'lucide-react';

const MessengerApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { activeChat, openSavedMessages } = useChat();

  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-800 dark:text-slate-100">
        <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 mb-4 animate-bounce">
          <Zap className="w-7 h-7 fill-current" />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-widest uppercase">
          Initializing Pulse Messaging Engine...
        </p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 flex font-sans text-slate-800 dark:text-slate-100 relative">
      {/* Sidebar: Full screen on mobile if no active chat, hidden on mobile if active chat */}
      <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 h-full shrink-0`}>
        <Sidebar
          onOpenNewChatModal={() => setIsNewChatModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        />
      </div>

      {/* Main Chat Workspace: Hidden on mobile if no active chat, full screen on mobile if active chat */}
      <div className={`${activeChat ? 'flex' : 'hidden md:flex'} flex-1 h-full flex-col min-w-0 bg-white dark:bg-slate-950 relative`}>
        {activeChat ? (
          <>
            <ChatHeader
              onToggleSearch={() => {}}
              onTogglePinnedModal={() => {}}
            />
            <PinnedBanner />
            <MessageList />
            <FloatingComposer />
          </>
        ) : (
          /* Empty Active Chat Welcome Screen (Tablet / Desktop) */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 relative">
            <div className="w-20 h-20 bg-cyan-50 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 rounded-3xl flex items-center justify-center text-cyan-500 mb-6 shadow-md">
              <Zap className="w-10 h-10 fill-current" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
              Select a conversation to start messaging
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
              Pulse Messenger delivers real-time messaging, audio & video calling, voice notes with live audio waveforms, emoji reactions, read receipts, and file attachments.
            </p>

            {/* Quick Action Cards */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-2 shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Chat</span>
              </button>

              <button
                onClick={() => openSavedMessages()}
                className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 font-semibold text-xs flex items-center space-x-2 transition shadow-sm"
              >
                <Bookmark className="w-4 h-4" />
                <span>Saved Messages</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Chat Info Drawer */}
      <ChatInfoDrawer />

      {/* Global Modals */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />
      <ProfileSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      <ForwardModal />
      <MediaViewerModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <MessengerApp />
      </ChatProvider>
    </AuthProvider>
  );
}
