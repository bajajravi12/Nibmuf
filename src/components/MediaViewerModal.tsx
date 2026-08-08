import React from 'react';
import { useChat } from '../context/ChatContext.js';
import { X, Download } from 'lucide-react';

export const MediaViewerModal: React.FC = () => {
  const { mediaPreviewUrl, setMediaPreviewUrl } = useChat();

  if (!mediaPreviewUrl) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="absolute top-4 right-4 flex items-center space-x-2 z-50">
        <a
          href={mediaPreviewUrl}
          download="pulse_attachment"
          className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={() => setMediaPreviewUrl(null)}
          className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
        <img src={mediaPreviewUrl} alt="Preview" className="w-full h-full object-contain" />
      </div>
    </div>
  );
};
