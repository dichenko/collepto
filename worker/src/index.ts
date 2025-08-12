import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth';
import { itemsRouter } from './api/items';
import { blogRouter } from './api/blog';
import { photosRouter } from './api/photos';
import { exportRouter } from './api/export';
import { authRouter } from './api/auth';
import { DatabaseQueries } from './db/queries';

import type { Env } from './types';

// No longer needed - KV stores binary data directly

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Basic HTML escape
const escapeHtml = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function layoutHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="/favicon.svg" />
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;margin:0;color:#111}
    .container{max-width:1000px;margin:0 auto;padding:16px}
    .grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
    .card{border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#fff}
    .muted{color:#6b7280;font-size:12px}
    a{color:#2563eb;text-decoration:none}
    a:hover{text-decoration:underline}
    nav{display:flex;gap:12px;margin-bottom:16px}
    img{max-width:100%;height:auto;border-radius:6px}
  </style>
  <meta name="description" content="Коллекция и блог Collepto" />
</head>
<body>
  <div class="container">
    <nav>
      <a href="/">Главная</a>
      <a href="/items">Коллекция</a>
      <a href="/blog">Блог</a>
    </nav>
    ${body}
  </div>
</body>
</html>`;
}

// Debug endpoint
app.get('/api/debug', async (c) => {
  try {
    // Check if tables exist
    const tablesResult = await c.env.DB.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `).all();
    
    const tables = tablesResult.results?.map(r => r.name) || [];
    
    // Check items count if table exists
    let itemsCount = 0;
    let blogCount = 0;
    
    if (tables.includes('items')) {
      const itemsResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM items').first();
      itemsCount = itemsResult?.count || 0;
    }
    
    if (tables.includes('blog_posts')) {
      const blogResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM blog_posts').first();
      blogCount = blogResult?.count || 0;
    }
    
    return c.json({
      success: true,
      data: {
        tables,
        itemsCount,
        blogCount,
        env: {
          hasDB: !!c.env.DB,
          hasAssets: !!c.env.ASSETS,
          hasSessions: !!c.env.SESSIONS
        }
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Debug admin endpoint
app.get('/api/admin/debug', async (c) => {
  try {
    return c.json({
      success: true,
      data: {
        hasAuth: !!c.get('userId'),
        userId: c.get('userId'),
        sessionId: c.get('sessionId')
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    });
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
  
  // For each item, get the first photo
  const itemsWithPhotos = await Promise.all(
    (items.results || []).map(async (item) => {
      const photos = await c.env.DB.prepare(`
        SELECT compressed_path, thumbnail_path FROM photo_assets WHERE item_id = ? LIMIT 3
      `).bind(item.id).all();
      
      // Convert file paths to public URLs - all photos are now in R2
      const photoUrls = photos.results?.map(p => {
        return `/api/photos/r2/compressed/${p.compressed_path.split('/').pop()}`;
      }) || [];
      
      return {
        ...item,
        tags: JSON.parse(item.tags || '[]'),
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
  
  // Get photos for this item
  const photos = await c.env.DB.prepare(`
    SELECT compressed_path, thumbnail_path FROM photo_assets WHERE item_id = ?
  `).bind(id).all();
  
  // Convert file paths to public URLs - all photos are now in R2
  const photoUrls = photos.results?.map(p => {
    return `/api/photos/r2/compressed/${p.compressed_path.split('/').pop()}`;
  }) || [];
  
  return c.json({
    success: true,
    data: {
      ...item,
      tags: JSON.parse(item.tags || '[]'),
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
      publishDate: post.publish_date,
      relatedItems: JSON.parse(post.related_items || '[]'),
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      published: Boolean(post.published)
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
      relatedItems: JSON.parse(post.related_items || '[]')
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
        publishDate: post.publish_date,
        relatedItems: JSON.parse(post.related_items || '[]'),
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        published: Boolean(post.published)
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

// Public website pages (SSR-like simple HTML)
app.get('/', async (c) => {
  try {
    const res = await c.env.DB.prepare(`
      SELECT id, title, description, year, tags, category, created_at
      FROM items
      ORDER BY created_at DESC
      LIMIT 6
    `).all();
    const items = (res.results || []).map((it: any) => ({
      ...it,
      tags: JSON.parse(it.tags || '[]')
    }));

    const blogRes = await c.env.DB.prepare(`
      SELECT id, title, excerpt, publish_date, category, slug
      FROM blog_posts
      WHERE published = 1
      ORDER BY publish_date DESC
      LIMIT 6
    `).all();
    const posts = blogRes.results || [];

    const body = `
      <h1>Collepto</h1>
      <p class="muted">Последние предметы и записи блога</p>
      <h2>Последние предметы</h2>
      ${items.length === 0 ? '<p class="muted">Нет данных.</p>' : `
        <div class="grid">
          ${items.map((i: any) => `
            <div class="card">
              <a href="/items/${encodeURIComponent(i.id)}"><strong>${escapeHtml(i.title)}</strong></a>
              ${i.description ? `<div class="muted">${escapeHtml(i.description)}</div>` : ''}
              <div class="muted">${escapeHtml(i.category || '')} · ${i.year ?? ''}</div>
            </div>`).join('')}
        </div>`}

      <h2 style="margin-top:16px">Последние записи</h2>
      ${posts.length === 0 ? '<p class="muted">Нет данных.</p>' : `
        <div class="grid">
          ${posts.map((p: any) => `
            <div class="card">
              <a href="/blog/${encodeURIComponent(p.slug || p.id)}"><strong>${escapeHtml(p.title)}</strong></a>
              <div class="muted">${escapeHtml(p.category || '')} · ${escapeHtml(p.publish_date || '')}</div>
              ${p.excerpt ? `<div class="muted">${escapeHtml(p.excerpt)}</div>` : ''}
            </div>`).join('')}
        </div>`}
    `;
    return c.html(layoutHtml('Collepto — главная', body));
  } catch (e) {
    return c.html(layoutHtml('Collepto', '<p>Ошибка загрузки.</p>'));
  }
});

app.get('/items', async (c) => {
  try {
    const res = await c.env.DB.prepare(`
      SELECT id, title, description, year, tags, category, created_at
      FROM items
      ORDER BY created_at DESC
      LIMIT 30
    `).all();
    const items = (res.results || []).map((it: any) => ({
      ...it,
      tags: JSON.parse(it.tags || '[]')
    }));
    const body = `
      <h1>Коллекция</h1>
      ${items.length === 0 ? '<p class="muted">Нет данных.</p>' : `
        <div class="grid">
          ${items.map((i: any) => `
            <div class="card">
              <a href="/items/${encodeURIComponent(i.id)}"><strong>${escapeHtml(i.title)}</strong></a>
              ${i.description ? `<div class="muted">${escapeHtml(i.description)}</div>` : ''}
              <div class="muted">${escapeHtml(i.category || '')} · ${i.year ?? ''}</div>
            </div>`).join('')}
        </div>`}
    `;
    return c.html(layoutHtml('Коллекция — Collepto', body));
  } catch {
    return c.html(layoutHtml('Коллекция — Collepto', '<p>Ошибка загрузки.</p>'));
  }
});

app.get('/items/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const db = new DatabaseQueries(c.env);
    let item = await db.getItemBySlug(slug);
    if (!item) {
      const maybe = await c.env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(slug).first();
      if (maybe) {
        item = {
          ...maybe,
          tags: JSON.parse((maybe as any).tags || '[]')
        } as any;
      }
    }
    if (!item) return c.notFound();

    const photosRes = await c.env.DB.prepare(`
      SELECT compressed_path FROM photo_assets WHERE item_id = ? LIMIT 6
    `).bind(item.id).all();
    const photos = photosRes.results?.map((p: any) => `/api/photos/r2/compressed/${p.compressed_path.split('/').pop()}`) || [];

    const body = `
      <h1>${escapeHtml(item.title)}</h1>
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
      <div class="muted">${escapeHtml(item.category || '')} · ${item.year ?? ''}</div>
      ${photos.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">${photos.map((src: string) => `<a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${escapeHtml(item.title)}" loading="lazy" /></a>`).join('')}</div>` : ''}
    `;
    return c.html(layoutHtml(`${item.title} — Collepto`, body));
  } catch {
    return c.html(layoutHtml('Предмет — Collepto', '<p>Ошибка загрузки.</p>'));
  }
});

app.get('/blog', async (c) => {
  try {
    const res = await c.env.DB.prepare(`
      SELECT id, title, excerpt, publish_date, category, slug
      FROM blog_posts
      WHERE published = 1
      ORDER BY publish_date DESC
      LIMIT 30
    `).all();
    const posts = res.results || [];
    const body = `
      <h1>Блог</h1>
      ${posts.length === 0 ? '<p class="muted">Нет данных.</p>' : `
        <div class="grid">
          ${posts.map((p: any) => `
            <div class="card">
              <a href="/blog/${encodeURIComponent(p.slug || p.id)}"><strong>${escapeHtml(p.title)}</strong></a>
              <div class="muted">${escapeHtml(p.category || '')} · ${escapeHtml(p.publish_date || '')}</div>
              ${p.excerpt ? `<div class="muted">${escapeHtml(p.excerpt)}</div>` : ''}
            </div>`).join('')}
        </div>`}
    `;
    return c.html(layoutHtml('Блог — Collepto', body));
  } catch {
    return c.html(layoutHtml('Блог — Collepto', '<p>Ошибка загрузки.</p>'));
  }
});

app.get('/blog/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    let post = await c.env.DB.prepare('SELECT * FROM blog_posts WHERE slug = ? AND published = 1').bind(slug).first();
    if (!post) {
      post = await c.env.DB.prepare('SELECT * FROM blog_posts WHERE id = ? AND published = 1').bind(slug).first();
    }
    if (!post) return c.notFound();
    const body = `
      <h1>${escapeHtml((post as any).title)}</h1>
      <div class="muted">${escapeHtml((post as any).publish_date || '')} · ${escapeHtml((post as any).category || '')}</div>
      <article>${escapeHtml((post as any).content || '')}</article>
    `;
    return c.html(layoutHtml(`${(post as any).title} — Collepto`, body));
  } catch {
    return c.html(layoutHtml('Пост — Collepto', '<p>Ошибка загрузки.</p>'));
  }
});

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
    return c.body(object.body, 200, headers);
    
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