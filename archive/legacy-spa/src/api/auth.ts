import { Hono } from 'hono';
import type { Env } from '../types';
import { DatabaseQueries } from '../db/queries';
import { parseBasicAuth, createBasicAuthChallenge } from '../middleware/auth';

const router = new Hono<{ Bindings: Env }>();

// Login endpoint - Basic Auth
router.post('/login', async (c) => {
  try {
    // Accept either Basic Auth header or JSON body { username, password, remember }
    let username = '';
    let password = '';
    let remember = true;

    const contentType = c.req.header('Content-Type') || '';
    if (contentType.includes('application/json')) {
      const body = await c.req.json().catch(() => ({}));
      username = body.username || '';
      password = body.password || '';
      if (typeof body.remember === 'boolean') remember = body.remember;
    } else {
      const authHeader = c.req.header('Authorization');
      if (!authHeader) {
        return createBasicAuthChallenge();
      }
      const credentials = parseBasicAuth(authHeader);
      if (!credentials) {
        return createBasicAuthChallenge();
      }
      username = credentials.username;
      password = credentials.password;
      const rememberQuery = c.req.query('remember');
      if (rememberQuery != null) remember = rememberQuery === 'true';
    }

    // Check credentials against environment variables
    if (username !== c.env.ADMIN_USERNAME || password !== c.env.ADMIN_PASSWORD) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Create session (30 days)
    const db = new DatabaseQueries(c.env);
    const maxAgeDays = 30; // default 30 days
    const expiresAt = Date.now() + (maxAgeDays * 24 * 60 * 60 * 1000);
    const sessionId = await db.createSession('admin', expiresAt);

    // Set HttpOnly cookie
    const cookieParts = [
      `sessionId=${sessionId}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Secure'
    ];
    if (remember) {
      cookieParts.push(`Max-Age=${maxAgeDays * 24 * 60 * 60}`);
    }
    c.header('Set-Cookie', cookieParts.join('; '));

    return c.json({ 
      success: true,
      data: {
        expiresAt: new Date(expiresAt).toISOString()
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

// Logout endpoint
router.post('/logout', async (c) => {
  try {
    // Try cookie first
    const cookie = c.req.header('Cookie') || '';
    const match = cookie.match(/(?:^|;\s*)sessionId=([^;]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : c.req.header('Authorization')?.replace('Bearer ', '');

    if (sessionId) {
      const db = new DatabaseQueries(c.env);
      await db.deleteSession(sessionId);
    }

    // Clear cookie
    c.header('Set-Cookie', 'sessionId=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0');

    return c.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ success: false, error: 'Logout failed' }, 500);
  }
});

// Check session status
router.get('/status', async (c) => {
  try {
    let sessionId = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!sessionId) {
      const cookie = c.req.header('Cookie') || '';
      const match = cookie.match(/(?:^|;\s*)sessionId=([^;]+)/);
      sessionId = match ? decodeURIComponent(match[1]) : '';
    }
    
    if (!sessionId) {
      return c.json({ 
        success: true,
        data: { authenticated: false }
      });
    }

    const db = new DatabaseQueries(c.env);
    const session = await db.getSession(sessionId);
    
    if (!session) {
      return c.json({ 
        success: true,
        data: { authenticated: false }
      });
    }

    return c.json({
      success: true,
      data: {
        authenticated: true,
        expiresAt: new Date(session.expiresAt).toISOString()
      }
    });
  } catch (error) {
    console.error('Auth status error:', error);
    return c.json({ 
      success: true,
      data: { authenticated: false }
    });
  }
});

export { router as authRouter };