import crypto from 'node:crypto';
import { DB } from './db.js';
import { User, Session } from '../types.js';

// Simple in-memory rate limiting map
const rateLimitMap: Record<string, { count: number; resetAt: number }> = {};

export function applyRateLimit(ipOrKey: string, maxRequests = 10, windowMs = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap[ipOrKey];

  if (!entry || now > entry.resetAt) {
    rateLimitMap[ipOrKey] = { count: 1, resetAt: now + windowMs };
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}

// Generate random salt
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Web Crypto / SHA-256 password hashing
export async function hashPassword(password: string, salt: string): Promise<string> {
  if (crypto.webcrypto && crypto.webcrypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.webcrypto.subtle.digest('SHA-256', data);
    return Buffer.from(hashBuffer).toString('hex');
  }
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const hash = await hashPassword(password, salt);
  return hash === expectedHash;
}

export function sanitizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function getSessionFromRequest(req: any): { session?: Session; user?: User } {
  const authHeader = req.headers.authorization;
  let token: string | undefined = undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.pulse_session) {
    token = req.cookies.pulse_session;
  }

  if (!token) return {};

  const session = DB.getSession(token);
  if (!session) return {};

  const user = DB.getUserById(session.userId);
  if (!user) return {};

  return { session, user };
}
