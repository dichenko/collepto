import { authMiddleware } from './middleware/auth';
import { itemsRouter } from './api/items';
import { blogRouter } from './api/blog';
import { photosRouter } from './api/photos';
import { exportRouter } from './api/export';
import { authRouter } from './api/auth';
import { createApp } from './server/app';
import { DatabaseQueries } from './db/queries';
import { publicRoutes } from './server/public';
import { adminRoutes } from './server/admin';

// No longer needed - KV stores binary data directly

const app = createApp();

// layout moved to server module

// Debug endpoint
app.get('/api/debug', async (c) => {
  try {
    const tablesResult = await c.env.DB.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();
    const tables = (tablesResult.results || []).map((r: any) => r.name as string);
    const itemsCount = (await c.env.DB.prepare('SELECT COUNT(*) as count FROM items').first() as any)?.count || 0;
    const blogCount = (await c.env.DB.prepare('SELECT COUNT(*) as count FROM blog_posts').first() as any)?.count || 0;
    return c.json({ success: true, data: { tables, itemsCount, blogCount, env: { hasDB: !!c.env.DB, hasSessions: !!c.env.SESSIONS } } });
  } catch (error) {
    return c.json({ success: false, error: (error as any).message });
  }
});

// Debug admin endpoint
app.get('/api/admin/debug', async (c) => {
  try {
    return c.json({ success: true, data: { ok: true } });
  } catch (error) {
    return c.json({ success: false, error: (error as any).message });
  }
});

// Auth routes (no auth required)
app.route('/api/auth', authRouter);

// Public API routes (no auth required)
app.get('/api/items', async (c) => {
  // Public items list
  const items = await c.env.DB.prepare(`
    SELECT id, title, description, year, tags, category, created_at
    FROM items 
    ORDER BY created_at DESC
  `).all();
  
  // For each item, get up to 3 photos (exclude soft-deleted)
  const itemsWithPhotos = await Promise.all(
    (items.results || []).map(async (item) => {
      const photos = await c.env.DB.prepare(`
        SELECT compressed_path, thumbnail_path FROM photo_assets WHERE item_id = ? AND (deleted IS NULL OR deleted = 0) ORDER BY order_index ASC, created_at ASC LIMIT 3
      `).bind(item.id).all();
      
      // Convert file paths to public URLs - all photos are now in R2
      const photoUrls = photos.results?.map((p: any) => {
        const cp = String(p.compressed_path || '');
        return `/api/photos/r2/compressed/${cp.split('/').pop()}`;
      }) || [];
      
      return {
        ...item,
        tags: JSON.parse(String((item as any).tags ?? '[]')),
        photos: photoUrls
      };
    })
  );
  
  return c.json({
    success: true,
    data: itemsWithPhotos
  });
});

app.get('/api/items/:id', async (c) => {
  const id = c.req.param('id');
  const item = await c.env.DB.prepare(`
    SELECT * FROM items WHERE id = ?
  `).bind(id).first();
  
  if (!item) {
    return c.json({ success: false, error: 'Item not found' }, 404);
  }
  
  // Get photos for this item (exclude soft-deleted)
  const photos = await c.env.DB.prepare(`
    SELECT compressed_path, thumbnail_path FROM photo_assets WHERE item_id = ? AND (deleted IS NULL OR deleted = 0) ORDER BY order_index ASC, created_at ASC
  `).bind(id).all();
  
  // Convert file paths to public URLs - all photos are now in R2
  const photoUrls = photos.results?.map((p: any) => {
    const cp = String(p.compressed_path || '');
    return `/api/photos/r2/compressed/${cp.split('/').pop()}`;
  }) || [];
  
  return c.json({
    success: true,
    data: {
      ...item,
      tags: JSON.parse(String((item as any).tags || '[]')),
      photos: photoUrls
    }
  });
});



app.get('/api/blog', async (c) => {
  // Public blog posts
  const posts = await c.env.DB.prepare(`
    SELECT id, title, excerpt, content, publish_date, read_time, related_items, category, published, created_at, updated_at
    FROM blog_posts 
    WHERE published = 1
    ORDER BY publish_date DESC
  `).all();
  
  return c.json({
    success: true,
    data: posts.results?.map(post => ({
      ...post,
      publishDate: (post as any).publish_date,
      relatedItems: JSON.parse(String((post as any).related_items ?? '[]')),
      createdAt: (post as any).created_at,
      updatedAt: (post as any).updated_at,
      published: Boolean((post as any).published)
    })) || []
  });
});

app.get('/api/blog/:id', async (c) => {
  const id = c.req.param('id');
  const post = await c.env.DB.prepare(`
    SELECT * FROM blog_posts WHERE id = ? AND published = 1
  `).bind(id).first();
  
  if (!post) {
    return c.json({ success: false, error: 'Post not found' }, 404);
  }
  
  return c.json({
    success: true,
    data: {
      ...post,
      relatedItems: JSON.parse(String((post as any).related_items ?? '[]'))
    }
  });
});

// Public slug endpoints
app.get('/api/items/slug/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const db = new DatabaseQueries(c.env);
    let item = await db.getItemBySlug(slug);
    
    // If not found by slug, try to extract ID from slug and search by ID prefix
    if (!item) {
      const { extractIdFromSlug } = await import('./lib/slugify');
      const idPrefix = extractIdFromSlug(slug);
      if (idPrefix) {
        item = await db.findItemByIdPrefix(idPrefix);
      }
    }
    
    if (!item) {
      return c.json({ success: false, error: 'Item not found' }, 404);
    }
    
    return c.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Get item by slug error:', error);
    return c.json({ success: false, error: 'Failed to fetch item' }, 500);
  }
});

app.get('/api/blog/slug/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    
    // Try to find by slug first
    let post = await c.env.DB.prepare(`
      SELECT * FROM blog_posts WHERE slug = ? AND published = 1
    `).bind(slug).first();
    
    // If not found by slug, try to extract ID from slug and search by ID prefix
    if (!post) {
      const match = slug.match(/_([a-zA-Z0-9]{4})$/);
      if (match) {
        const idPrefix = match[1];
        post = await c.env.DB.prepare(`
          SELECT * FROM blog_posts WHERE id LIKE ? AND published = 1
        `).bind(`${idPrefix}%`).first();
      }
    }
    
    if (!post) {
      return c.json({ success: false, error: 'Blog post not found' }, 404);
    }
    
    return c.json({
      success: true,
      data: {
        ...post,
        publishDate: (post as any).publish_date,
        relatedItems: JSON.parse(String((post as any).related_items ?? '[]')),
        createdAt: (post as any).created_at,
        updatedAt: (post as any).updated_at,
        published: Boolean((post as any).published)
      }
    });
  } catch (error) {
    console.error('Get blog post by slug error:', error);
    return c.json({ success: false, error: 'Failed to fetch blog post' }, 500);
  }
});

// Protected admin routes
app.use('/api/admin/*', authMiddleware);
app.route('/api/admin/items', itemsRouter);
app.route('/api/admin/blog', blogRouter);
app.route('/api/admin/photos', photosRouter);
app.route('/api/admin/export', exportRouter);

// SSR routes moved to modules
publicRoutes(app);
adminRoutes(app);

// Serve photos from R2 storage
app.get('/api/photos/r2/:variant/:filename', async (c) => {
  try {
    const variant = c.req.param('variant'); // 'original', 'compressed', 'thumbnail'
    const filename = c.req.param('filename');
    
    // Construct the R2 path based on variant
    const path = `${variant}/${filename}`;
    
    // Get file from R2
    const object = await c.env.PHOTOS_BUCKET.get(path);
    
    if (!object) {
      console.log(`R2 photo not found: ${path}`);
      return c.notFound();
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    
    console.log(`✅ Serving R2 photo: ${path}`);
    return new Response(object.body, { status: 200, headers });
    
  } catch (error) {
    console.error('R2 photo serve error:', error);
    return c.notFound();
  }
});

// Legacy KV photo serving removed - all photos now served from R2

// Serve dynamic assets from KV storage (uploaded images) - legacy endpoint
app.get('/api/assets/*', async (c) => {
  const url = new URL(c.req.url);
  const assetPath = url.pathname.replace('/api/assets/', '');
  
  try {
    const key = `assets/${assetPath}`;
    
    // Try new binary format first
    const { value: buffer, metadata } = await c.env.SESSIONS.getWithMetadata(key, 'arrayBuffer');
    
    if (buffer && metadata) {
      const { mimeType } = metadata as any;
      
      return c.body(buffer, 200, {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
        'Content-Length': buffer.byteLength.toString()
      });
    }
    
    // Try legacy JSON+base64 format
    const legacyData = await c.env.SESSIONS.get(key);
    if (legacyData) {
      try {
        const { data, mimeType } = JSON.parse(legacyData);
        
        // Convert base64 back to buffer safely
        const cleanBase64 = data.replace(/\s/g, '');
        const binaryString = atob(cleanBase64);
        const legacyBuffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          legacyBuffer[i] = binaryString.charCodeAt(i);
        }
        
        return c.body(legacyBuffer, 200, {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000', // 1 year cache
          'Content-Length': legacyBuffer.length.toString()
        });
      } catch (legacyError) {
        console.error('Legacy format parsing error:', legacyError);
      }
    }
    
    return c.notFound();
  } catch (error) {
    console.error('Dynamic asset fetch error:', error);
    return c.notFound();
  }
});

// Static assets serving removed to avoid overshadowing SSR routes

// Serve React app for all non-API routes (SPA routing)
// Removed catch-all static fallback to ensure SSR pages above handle HTML routes

export default app;