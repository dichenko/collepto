import { Context, Next } from 'hono';
import type { Env } from '../types';
import { DatabaseQueries } from '../db/queries';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    // Check for Bearer token
    const sessionId = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!sessionId) {
      return c.json({ success: false, error: 'No session found' }, 401);
    }

    const db = new DatabaseQueries(c.env);
    const session = await db.getSession(sessionId);
    
    if (!session) {
      return c.json({ success: false, error: 'Invalid or expired session' }, 401);
    }

    // Clean expired sessions periodically
    if (Math.random() < 0.1) { // 10% chance
      await db.cleanExpiredSessions();
    }

    // Set user context
    c.set('userId', session.userId);
    c.set('sessionId', sessionId);
    
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ success: false, error: 'Authentication failed' }, 401);
  }
}

export function createBasicAuthChallenge() {
  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Collepto Admin"',
    },
  });
}

export function parseBasicAuth(authHeader: string): { username: string; password: string } | null {
  if (!authHeader.startsWith('Basic ')) {
    return null;
  }

  try {
    const credentials = atob(authHeader.slice(6));
    const [username, password] = credentials.split(':');
    return { username, password };
  } catch {
    return null;
  }
}