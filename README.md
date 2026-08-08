# Pulse Messenger ⚡

A complete, production-ready modern real-time messaging platform inspired by Telegram with original branding, visual design, audio voice note recording with live waveform visualizer, Cloudflare Workers & Durable Objects Edge architecture, Web Crypto authentication, and R2 media storage.

## 🚀 Key Features

- **Authentication**: Pure Username & Password auth with Web Crypto SHA-256 salted password hashing, HTTP-Only cookie session tokens, rate-limiting, and brute-force protection.
- **Real-Time Communication**:
  - WebSockets with auto-reconnection and heartbeat
  - Realtime Typing Indicators
  - Realtime Online / Offline Presence awareness & Last Seen
  - Realtime Read Receipts (✓, ✓✓, ✓✓ blue checkmarks)
  - Message Reactions (👍, ❤️, 🔥, 😂, 👏, 😮, 🚀)
- **Audio Voice Memos**:
  - Live Web Audio API mic input recording
  - Real-time animated waveform level visualizer
  - WebM audio blob upload & waveform playback
- **Group Channels**:
  - Group creation with custom avatar seed
  - Admin/Owner roles & member management
  - Group descriptions & pinned announcements
- **Saved Messages**: Personal cloud bookmark storage & file vault
- **Media & File Storage**: Upload & preview images, videos, audio notes, PDF, ZIP documents.
- **Search**: Global search for users, groups, and message content.
- **Theme Support**: Custom dark & light theme modes.

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons
- **Backend**: Express, WebSockets (`ws`), Web Crypto API
- **Edge Deployment Target**: Cloudflare Workers, Cloudflare Durable Objects (`PulseChatRoom`), Cloudflare D1 Database (`migrations/0000_schema.sql`), Cloudflare R2 Bucket, Cloudflare KV.

## ⚡ Local Development

```bash
# Install dependencies
npm install

# Start local full-stack server (Port 3000)
npm run dev
```

Open `http://localhost:3000` in your browser. Demo account pre-seeded:
- **Username**: `alex_dev`
- **Password**: `Password123!`
