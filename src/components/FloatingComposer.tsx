import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext.js';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { Attachment } from '../types.js';
import {
  Send,
  Mic,
  Paperclip,
  Smile,
  X,
  StopCircle,
  FileText,
  Image as ImageIcon,
  Check,
  Zap,
  CornerUpLeft,
  Edit2
} from 'lucide-react';

export const FloatingComposer: React.FC = () => {
  const {
    activeChat,
    sendMessage,
    editMessage,
    replyTarget,
    setReplyTarget,
    editTarget,
    setEditTarget,
    uploadAttachment,
    setTyping
  } = useChat();

  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<any>(null);

  const {
    isRecording,
    recordingTime,
    audioLevels,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording
  } = useAudioRecorder();

  // Populate text if editing
  useEffect(() => {
    if (editTarget) {
      setText(editTarget.content);
    }
  }, [editTarget]);

  if (!activeChat) return null;

  // Handle typing state broadcast
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (activeChat) {
      setTyping(activeChat.id, true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setTyping(activeChat.id, false);
      }, 2000);
    }
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = async () => {
        const dataUrl = reader.result as string;
        let type: Attachment['type'] = 'document';

        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';

        const att = await uploadAttachment({
          name: file.name,
          type,
          dataUrl,
          mimeType: file.type
        });

        if (att) {
          setAttachments((prev) => [...prev, att]);
        }
      };

      reader.readAsDataURL(file);
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Voice Note Send
  const handleSendVoiceNote = async () => {
    stopRecording();
    setTimeout(async () => {
      if (!audioBlob) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const att = await uploadAttachment({
          name: `voice_note_${Date.now()}.webm`,
          type: 'voice',
          dataUrl,
          mimeType: 'audio/webm',
          duration: recordingTime
        });

        if (att) {
          await sendMessage('', [att]);
        }
      };
      reader.readAsDataURL(audioBlob);
    }, 300);
  };

  // Submit Text or Edit
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() && attachments.length === 0) return;

    if (editTarget) {
      await editMessage(editTarget.id, text.trim());
    } else {
      await sendMessage(text.trim(), attachments);
    }

    setText('');
    setAttachments([]);
    setReplyTarget(null);
    setEditTarget(null);
    setShowEmojiPicker(false);
  };

  const commonEmojis = ['😀', '😂', '🔥', '🚀', '❤️', '👍', '👏', '🎉', '⚡', '✨', '😍', '🙌'];

  return (
    <div className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800/80 shrink-0 relative z-20 text-slate-800 dark:text-slate-100">
      {/* Reply or Edit Banner Header */}
      {replyTarget && (
        <div className="mb-2 p-2 bg-slate-100 dark:bg-slate-950/80 border-l-4 border-cyan-500 rounded-xl flex items-center justify-between text-xs text-slate-800 dark:text-slate-200">
          <div className="flex items-center space-x-2 min-w-0">
            <CornerUpLeft className="w-4 h-4 text-cyan-500 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-cyan-600 dark:text-cyan-400">Replying to {replyTarget.sender?.displayName}: </span>
              <span className="opacity-80 truncate">{replyTarget.content || '[Media]'}</span>
            </div>
          </div>
          <button onClick={() => setReplyTarget(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {editTarget && (
        <div className="mb-2 p-2 bg-slate-100 dark:bg-slate-950/80 border-l-4 border-purple-500 rounded-xl flex items-center justify-between text-xs text-slate-800 dark:text-slate-200">
          <div className="flex items-center space-x-2 min-w-0">
            <Edit2 className="w-4 h-4 text-purple-500 shrink-0" />
            <span className="font-bold text-purple-600 dark:text-purple-400">Editing Message</span>
          </div>
          <button onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pre-send Attachment Previews */}
      {attachments.length > 0 && (
        <div className="flex items-center space-x-2 mb-2 overflow-x-auto pb-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-xl flex items-center space-x-2 text-xs shrink-0"
            >
              {att.type === 'image' ? (
                <img src={att.url} alt="" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <FileText className="w-5 h-5 text-cyan-500" />
              )}
              <span className="max-w-[100px] truncate text-slate-800 dark:text-slate-200">{att.name}</span>
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                className="text-rose-500 hover:text-rose-600 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xl grid grid-cols-6 gap-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          {commonEmojis.map((e) => (
            <button
              key={e}
              onClick={() => {
                setText((prev) => prev + e);
                setShowEmojiPicker(false);
              }}
              className="text-lg hover:scale-125 transition p-1"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Controls */}
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          className="hidden"
        />

        {/* Voice Note Recording Overlay Mode */}
        {isRecording ? (
          <div className="flex-1 bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 rounded-2xl p-2.5 flex items-center justify-between space-x-3 text-rose-800 dark:text-rose-200 animate-pulse">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-rose-500 rounded-full animate-ping" />
              <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300">
                Recording Voice Memo {recordingTime}s
              </span>
            </div>

            {/* Live Audio Level Visualization Bars */}
            <div className="flex items-center space-x-1 h-5 overflow-hidden">
              {audioLevels.slice(-15).map((lvl, idx) => (
                <span
                  key={idx}
                  style={{ height: `${Math.max(15, lvl * 100)}%` }}
                  className="w-1 bg-rose-500 rounded-full"
                />
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-1.5 rounded-xl hover:bg-rose-200 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 transition"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSendVoiceNote}
                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-1 shadow-lg transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Memo</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              title="Attach media or files"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Emoji Trigger */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Emojis"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Auto-growing Input Field */}
            <div className="flex-1 relative">
              <textarea
                value={text}
                onChange={handleTextChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                rows={1}
                placeholder="Write a message... (Shift + Enter for new line)"
                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-2.5 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none max-h-32 transition font-sans"
              />
            </div>

            {/* Send or Voice Note Button */}
            {text.trim() || attachments.length > 0 ? (
              <button
                type="submit"
                className="p-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md active:scale-95 transition shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-cyan-600 dark:text-cyan-400 active:scale-95 transition shrink-0"
                title="Hold or click to record voice memo"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </form>
    </div>
  );
};
