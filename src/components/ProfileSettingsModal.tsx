import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../hooks/useTheme.js';
import { Avatar } from './Avatar.js';
import {
  X,
  User,
  Lock,
  Moon,
  Sun,
  Shield,
  Ban,
  Trash2,
  Check,
  Zap,
  Sparkles
} from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, token, updateProfile, changePassword, deleteAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'privacy' | 'blocked'>('profile');

  // Profile Form
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Security Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [securityMsg, setSecurityMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Blocked Users
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  // Fetch blocked users
  useEffect(() => {
    if (isOpen && activeTab === 'blocked' && token) {
      fetch('/api/users/blocked', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => setBlockedUsers(data.blockedUsers || []))
        .catch((err) => console.error(err));
    }
  }, [isOpen, activeTab, token]);

  if (!isOpen || !user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    const res = await updateProfile({ displayName, bio, avatarUrl });
    if (res.success) {
      setProfileMsg('Profile saved successfully!');
      setTimeout(() => setProfileMsg(null), 3000);
    } else {
      setProfileMsg(res.error || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMsg(null);
    const res = await changePassword(currentPassword, newPassword);
    if (res.success) {
      setSecurityMsg({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setSecurityMsg({ type: 'error', text: res.error || 'Failed to change password' });
    }
  };

  const handleUnblock = async (blockedUserId: string) => {
    if (!token) return;
    await fetch('/api/users/unblock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ targetUserId: blockedUserId })
    });
    setBlockedUsers((prev) => prev.filter((u) => u.id !== blockedUserId));
  };

  const generateRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(2, 9);
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-base flex items-center space-x-2 text-slate-900 dark:text-slate-100">
            <User className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <span>Account & Settings</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {[
            { key: 'profile', label: 'Profile' },
            { key: 'security', label: 'Security' },
            { key: 'privacy', label: 'Preferences' },
            { key: 'blocked', label: 'Blocked Users' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                activeTab === tab.key
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto max-h-[28rem]">
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {profileMsg && (
                <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-medium text-center">
                  {profileMsg}
                </div>
              )}

              {/* Avatar Preview */}
              <div className="flex items-center space-x-4">
                <Avatar
                  name={displayName || user.displayName || user.username}
                  avatarUrl={avatarUrl}
                  size="xl"
                />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default Letter DP Active</p>
                  <p className="text-[11px] text-slate-500">First letter derived automatically from your display name</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bio / Status Message
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none transition"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl py-2.5 text-xs shadow-lg transition"
              >
                Save Profile Changes
              </button>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {securityMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-medium text-center border ${
                    securityMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {securityMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl py-2.5 text-xs shadow-lg transition"
              >
                Update Password
              </button>
            </form>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Theme Preference</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Switch between Dark and Light interface</p>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
                >
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Read Receipts</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Show blue checkmarks when messages are read</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded accent-cyan-500 w-4 h-4" />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to permanently delete your Pulse account?')) {
                      deleteAccount();
                    }
                  }}
                  className="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-300 font-semibold rounded-xl py-2.5 text-xs flex items-center justify-center space-x-2 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Account Permanently</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'blocked' && (
            <div>
              {blockedUsers.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No blocked users</p>
              ) : (
                <div className="space-y-2">
                  {blockedUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{u.displayName}</p>
                          <p className="text-[10px] text-slate-500">@{u.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnblock(u.id)}
                        className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
