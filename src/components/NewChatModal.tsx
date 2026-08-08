import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useChat } from '../context/ChatContext.js';
import { Avatar } from './Avatar.js';
import { User } from '../types.js';
import { X, Search, Users, UserPlus, Sparkles, Check } from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const { user, token } = useAuth();
  const { startDirectChat, createGroupChat } = useChat();

  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Group creation state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Search users on input change
  useEffect(() => {
    if (!token || !isOpen) return;

    async function searchUsers() {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.users || []);
        }
      } catch (err) {
        console.error('User search error:', err);
      } finally {
        setIsSearching(false);
      }
    }

    const timer = setTimeout(searchUsers, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, token]);

  if (!isOpen) return null;

  const handleStartDirect = async (targetUser: User) => {
    onClose();
    await startDirectChat(targetUser.id);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsCreating(true);
    const defaultAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`;
    onClose();
    await createGroupChat(groupName.trim(), groupDescription.trim(), defaultAvatar, selectedUserIds);
    setIsCreating(false);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <UserPlus className="w-5 h-5" />
            </span>
            <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">New Chat or Group</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <button
            onClick={() => setMode('direct')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              mode === 'direct'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Direct Message
          </button>
          <button
            onClick={() => setMode('group')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              mode === 'group'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Create Group
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto max-h-96">
          {mode === 'direct' ? (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search registered username or display name..."
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              {/* User Results List */}
              <div className="space-y-1 mt-2">
                {isSearching ? (
                  <p className="text-xs text-slate-500 text-center py-6">Searching users...</p>
                ) : searchResults.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No users found</p>
                ) : (
                  searchResults.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleStartDirect(u)}
                      className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar
                          name={u.displayName || u.username}
                          avatarUrl={u.avatarUrl}
                          size="md"
                        />
                        <div>
                          <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">{u.displayName}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">@{u.username}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">Chat &rarr;</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. ⚡ Pulse Innovators HQ"
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  rows={2}
                  placeholder="What is this channel about?"
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Select Members to Invite
                </label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {searchResults.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUserSelection(u.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 dark:border-cyan-500/50 text-cyan-700 dark:text-cyan-300'
                            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Avatar
                            name={u.displayName || u.username}
                            avatarUrl={u.avatarUrl}
                            size="sm"
                          />
                          <span className="text-xs font-semibold">{u.displayName}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating || !groupName.trim()}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl py-2.5 text-xs shadow-lg transition disabled:opacity-50"
              >
                {isCreating ? 'Creating Group...' : 'Create Group Chat'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
