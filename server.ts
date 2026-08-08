import express from 'express';
import { createServer } from 'http';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/routes.js';
import { setupWebSocketServer } from './src/server/websocket.js';
import { seedDatabaseIfEmpty } from './src/server/db.js';

export const app = express();

async function startServer() {
  const httpServer = createServer(app);
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Initialize seed database if empty
  seedDatabaseIfEmpty();

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // Mount API Router
  app.use('/api', apiRouter);

  // Setup WebSocket Server on same HTTP server
  setupWebSocketServer(httpServer);

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`⚡ Pulse Messenger Server active on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error('Fatal Server Error:', err);
  process.exit(1);
});
