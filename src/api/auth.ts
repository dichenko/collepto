import { Hono } from 'hono';
import type { Env } from '../types';
import { DatabaseQueries } from '../db/queries';
import { parseBasicAuth, createBasicAuthChallenge } from '../middleware/auth';

const router = new Hono<{ Bindings: Env }>();

// Login endpoint - Basic Auth
router.post('/login', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return createBasicAuthChallenge();
    }

    const credentials = parseBasicAuth(authHeader);
    if (!credentials) {
      return createBasicAuthChallenge();
    }

    // Check credentials against environment variables
    if (credentials.username !== c.env.ADMIN_USERNAME || 
        credentials.password !== c.env.ADMIN_PASSWORD) {
      
      // TODO: Implement brute force protection
      // After 3 failed attempts, block for 5 minutes
      
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Create session (30 days)
    const db = new DatabaseQueries(c.env);
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
    const sessionId = await db.createSession('admin', expiresAt);
    
    return c.json({ 
      success: true,
      data: {
        sessionId,
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
    const sessionId = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (sessionId) {
      const db = new DatabaseQueries(c.env);
      await db.deleteSession(sessionId);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ success: false, error: 'Logout failed' }, 500);
  }
});

// Check session status
router.get('/status', async (c) => {
  try {
    const sessionId = c.req.header('Authorization')?.replace('Bearer ', '');
    
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