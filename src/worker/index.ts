/**
 * Pulse Messenger - Cloudflare Worker & Durable Object Handler
 * Designed for deployment on Cloudflare Workers + D1 + R2 + Durable Objects
 */

// Cloudflare Workers Type Stubs for standalone compilation
type D1Database = any;
type KVNamespace = any;
type R2Bucket = any;
type DurableObjectNamespace = any;
type DurableObjectState = any;
type ExecutionContext = any;

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2_BUCKET: R2Bucket;
  PULSE_ROOM: DurableObjectNamespace;
}

export class PulseChatRoom {
  state: DurableObjectState;
  sessions: Set<any> = new Set();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const webSocketPair = new (globalThis as any).WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.state.acceptWebSocket(server);
    this.sessions.add(server);

    return new Response(null, {
      status: 101,
      webSocket: client
    } as ResponseInit);
  }

  async webSocketMessage(ws: any, message: string | ArrayBuffer) {
    // Broadcast message to all connected sessions in this Durable Object room
    for (const session of this.sessions) {
      if (session !== ws) {
        session.send(message);
      }
    }
  }

  async webSocketClose(ws: any, code: number, reason: string) {
    this.sessions.delete(ws);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade route for Cloudflare Durable Objects
    if (url.pathname.startsWith('/ws')) {
      const roomId = url.searchParams.get('roomId') || 'global_room';
      const id = env.PULSE_ROOM.idFromName(roomId);
      const stub = env.PULSE_ROOM.get(id);
      return stub.fetch(request);
    }

    // Health check endpoint
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', runtime: 'Cloudflare Worker Edge' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Static asset fallback
    return new Response('Pulse Messenger Worker Edge Backend Active', { status: 200 });
  }
};
