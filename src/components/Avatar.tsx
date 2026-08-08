import React, { useState } from 'react';

interface AvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  isOnline?: boolean;
  isGroup?: boolean;
  isSaved?: boolean;
}

// Curated aesthetic gradients for name initials
const GRADIENTS = [
  'from-cyan-500 to-blue-600 text-white',
  'from-indigo-500 to-purple-600 text-white',
  'from-emerald-500 to-teal-600 text-white',
  'from-rose-500 to-pink-600 text-white',
  'from-amber-500 to-orange-600 text-white',
  'from-violet-500 to-fuchsia-600 text-white',
  'from-sky-500 to-indigo-600 text-white',
  'from-teal-500 to-emerald-600 text-white'
];

function getGradientByName(name: string = ''): string {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

function getFirstLetter(name: string = ''): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  name = 'User',
  avatarUrl,
  size = 'md',
  className = '',
  isOnline = false,
  isGroup = false,
  isSaved = false
}) => {
  const [imgError, setImgError] = useState(false);

  // Size mapping
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] rounded-lg',
    sm: 'w-8 h-8 text-xs rounded-xl',
    md: 'w-10 h-10 text-sm rounded-xl',
    lg: 'w-12 h-12 text-base rounded-2xl',
    xl: 'w-16 h-16 text-xl rounded-2xl',
    '2xl': 'w-20 h-20 text-2xl rounded-3xl'
  };

  const badgeSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
    '2xl': 'w-5 h-5'
  };

  const firstLetter = getFirstLetter(name);
  const gradientClass = getGradientByName(name);

  // Check if avatarUrl is a valid non-placeholder image
  const isDicebear = avatarUrl && (avatarUrl.includes('dicebear.com') || avatarUrl.includes('bottts'));
  const hasRealCustomAvatar = Boolean(avatarUrl && !isDicebear && !imgError);

  return (
    <div className={`relative shrink-0 select-none inline-flex items-center justify-center ${className}`}>
      {isSaved ? (
        <div
          className={`${sizeClasses[size]} bg-gradient-to-br from-cyan-500 to-emerald-500 text-white flex items-center justify-center font-bold shadow-sm ring-1 ring-white/20 dark:ring-slate-800`}
        >
          🔖
        </div>
      ) : hasRealCustomAvatar ? (
        <img
          src={avatarUrl!}
          alt={name}
          onError={() => setImgError(true)}
          className={`${sizeClasses[size]} object-cover ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} bg-gradient-to-br ${gradientClass} flex items-center justify-center font-black tracking-wider shadow-sm ring-1 ring-white/20 dark:ring-slate-800/80`}
        >
          {firstLetter}
        </div>
      )}

      {/* Online indicator */}
      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 ${badgeSizes[size]} bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full ring-1 ring-black/10`}
          title="Online"
        />
      )}

      {/* Group indicator */}
      {isGroup && !isSaved && (
        <span className="absolute -bottom-1 -right-1 bg-slate-800 text-slate-200 text-[9px] px-1 py-0.2 rounded-md border border-slate-700 font-bold shadow-sm">
          👥
        </span>
      )}
    </div>
  );
};
