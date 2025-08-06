import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth';
import { itemsRouter } from './api/items';
import { blogRouter } from './api/blog';
import { photosRouter } from './api/photos';
import { exportRouter } from './api/export';
import { authRouter } from './api/auth';

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
      
      // Convert file paths to public URLs
      const photoUrls = photos.results?.map(p => {
        // For R2 photos, use R2 URL format
        if (p.thumbnail_path) {
          return `/api/photos/r2/compressed/${p.compressed_path.split('/').pop()}`;
        } else {
          // Legacy KV photos - use serve endpoint
          return `/api/photos/serve/${p.compressed_path.replace('assets/', '')}`;
        }
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
  
  // Convert file paths to public URLs
  const photoUrls = photos.results?.map(p => {
    // For R2 photos, use R2 URL format
    if (p.thumbnail_path) {
      return `/api/photos/r2/compressed/${p.compressed_path.split('/').pop()}`;
    } else {
      // Legacy KV photos - use serve endpoint
      return `/api/photos/serve/${p.compressed_path.replace('assets/', '')}`;
    }
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
    
    // Try to find by slug first
    let item = await c.env.DB.prepare(`
      SELECT * FROM items WHERE slug = ?
    `).bind(slug).first();
    
    // If not found by slug, try to extract ID from slug and search by ID prefix
    if (!item) {
      const match = slug.match(/_([a-zA-Z0-9]{4})$/);
      if (match) {
        const idPrefix = match[1];
        item = await c.env.DB.prepare(`
          SELECT * FROM items WHERE id LIKE ?
        `).bind(`${idPrefix}%`).first();
      }
    }
    
    if (!item) {
      return c.json({ success: false, error: 'Item not found' }, 404);
    }
    
    // Get photos for this item
    const photos = await c.env.DB.prepare(`
      SELECT compressed_path FROM photo_assets WHERE item_id = ?
    `).bind(item.id).all();
    
    // Convert file paths to public URLs
    const photoUrls = photos.results?.map(p => {
      return `/api/photos/serve/${p.compressed_path.replace('assets/', '')}`;
    }) || [];
    
    return c.json({
      success: true,
      data: {
        ...item,
        tags: JSON.parse(item.tags || '[]'),
        photos: photoUrls
      }
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

// Serve photos from KV storage (legacy endpoint for backward compatibility)
app.get('/api/photos/serve/*', async (c) => {
  const url = new URL(c.req.url);
  const photoPath = url.pathname.replace('/api/photos/serve/', '');
  
  try {
    // Try multiple possible key formats for legacy compatibility
    const possibleKeys = [
      `photo-storage/assets/${photoPath}`,    // New format
      `assets/${photoPath}`,                 // Legacy format 1
      `photo-storage/${photoPath}`,          // Legacy format 2
      photoPath                              // Direct path
    ];
    
    console.log(`🔍 Looking for photo: ${photoPath}`);
    
    for (const key of possibleKeys) {
      console.log(`Trying to serve photo with key: ${key}`);
      
      // Try new binary format first
      const { value: buffer, metadata } = await c.env.SESSIONS.getWithMetadata(key, 'arrayBuffer');
      
      if (buffer && metadata) {
        const { mimeType, size, isCompressed } = metadata as any;
        console.log(`Found binary data for key: ${key}, isCompressed: ${isCompressed}, includes resized: ${key.includes('resized/')}`);
        
        // Only serve compressed images through public endpoint
        if (isCompressed || key.includes('resized/')) {
          console.log(`✅ Serving binary photo from key: ${key}`);
          return c.body(buffer, 200, {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000', // 1 year cache
            'Content-Length': size.toString()
          });
        } else {
          console.log(`❌ Skipping binary photo from key: ${key} (not compressed)`);
        }
      } else {
        console.log(`No binary data found for key: ${key}`);
      }
      
      // Try legacy JSON+base64 format
      const legacyData = await c.env.SESSIONS.get(key);
      if (legacyData) {
        try {
          const { data, mimeType, isCompressed } = JSON.parse(legacyData);
          console.log(`Found legacy data for key: ${key}, isCompressed: ${isCompressed}, includes resized: ${key.includes('resized/')}`);
          
          // Only serve compressed images through public endpoint
          if (isCompressed || key.includes('resized/')) {
            console.log(`✅ Serving legacy photo from key: ${key}`);
            
            // Convert base64 back to buffer with robust error handling
            let cleanBase64 = data.replace(/\s/g, '');
            
            // Fix common base64 issues
            cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, ''); // Remove invalid chars
            
            // Ensure proper padding
            while (cleanBase64.length % 4 !== 0) {
              cleanBase64 += '=';
            }
            
            console.log(`Attempting to decode base64 of length: ${cleanBase64.length}`);
            
            const binaryString = atob(cleanBase64);
            const legacyBuffer = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              legacyBuffer[i] = binaryString.charCodeAt(i);
            }
            
            console.log(`Successfully decoded legacy base64 to buffer of size: ${legacyBuffer.length}`)
            
            return c.body(legacyBuffer, 200, {
              'Content-Type': mimeType,
              'Cache-Control': 'public, max-age=31536000', // 1 year cache
              'Content-Length': legacyBuffer.length.toString()
            });
          } else {
            console.log(`❌ Skipping legacy photo from key: ${key} (not compressed)`);
          }
        } catch (legacyError) {
          console.error(`Legacy format parsing error for key ${key}:`, legacyError);
        }
      } else {
        console.log(`No legacy data found for key: ${key}`);
      }
    }
    
    console.log(`Photo not found in any format for path: ${photoPath}`);
    return c.notFound();
  } catch (error) {
    console.error('Photo serve error:', error);
    return c.notFound();
  }
});

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

// Helper function to serve static files from Assets
async function serveStaticFile(c: any, filePath: string): Promise<Response | null> {
  try {
    // Try to fetch from Assets binding
    const response = await c.env.ASSETS.fetch(`https://fake-host/${filePath}`);
    if (response.ok) {
      // Add proper headers for static files
      const headers = new Headers(response.headers);
      
      // Set cache headers for static assets
      if (filePath.includes('/static/')) {
        headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year for hashed assets
      } else {
        headers.set('Cache-Control', 'public, max-age=3600'); // 1 hour for HTML
      }
      
      return new Response(response.body, {
        status: response.status,
        headers
      });
    }
  } catch (error) {
    console.error('Static file fetch error:', error);
  }
  return null;
}

// Serve React app static files (JS, CSS, etc.)
app.get('/static/*', async (c) => {
  const url = new URL(c.req.url);
  const assetPath = url.pathname.replace('/', '');
  
  const response = await serveStaticFile(c, assetPath);
  if (response) {
    return response;
  }
  
  return c.notFound();
});

// Serve other assets (favicon, etc.)
app.get('/assets/*', async (c) => {
  const url = new URL(c.req.url);
  const assetPath = url.pathname.replace('/assets/', '');
  
  // Try to serve from Assets binding
  const response = await serveStaticFile(c, `assets/${assetPath}`);
  if (response) {
    return response;
  }
  
  return c.notFound();
});

// Handle specific files (favicon, robots.txt, etc.)
app.get('/favicon.ico', async (c) => {
  const response = await serveStaticFile(c, 'favicon.ico');
  if (response) {
    return response;
  }
  return c.notFound();
});

// Serve React app for all non-API routes (SPA routing)
app.get('/*', async (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname;
  
  // Don't handle API routes here - they should 404 if not found
  if (path.startsWith('/api/')) {
    return c.notFound();
  }
  
  // Try to serve the exact file if it exists (e.g., manifest.json)
  if (path.includes('.') && !path.endsWith('/')) {
    const response = await serveStaticFile(c, path.replace('/', ''));
    if (response) {
      return response;
    }
  }
  
  // For all other routes, serve the React app (index.html)
  const indexResponse = await serveStaticFile(c, 'index.html');
  if (indexResponse) {
    return indexResponse;
  }
  
  // Fallback if React app is not built yet
  return c.html(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎉 Collepto - Готовы к запуску!</title>
    <style>
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 2rem; 
            line-height: 1.6;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        .container {
            background: rgba(255,255,255,0.95);
            border-radius: 16px;
            padding: 2rem;
            color: #1f2937;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .header { 
            text-align: center; 
            margin-bottom: 2rem;
        }
        .section { 
            background: #f8fafc; 
            padding: 1.5rem; 
            border-radius: 12px; 
            margin-bottom: 1.5rem;
            border-left: 4px solid #3b82f6;
        }
        .endpoint { 
            background: #1f2937; 
            color: #10b981;
            padding: 0.5rem 1rem; 
            border-radius: 8px; 
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; 
            margin: 0.5rem 0;
            font-size: 0.9rem;
        }
        .status { color: #059669; font-weight: 600; }
        .warning { color: #d97706; font-weight: 600; }
        .info { color: #2563eb; font-weight: 600; }
        .build-steps { 
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
        }
        .step { margin: 0.5rem 0; }
        h1 { color: #1f2937; margin: 0; }
        h2 { color: #374151; margin-top: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Collepto Backend готов к интеграции!</h1>
            <p class="info">✨ Все системы работают, готовы принять React фронтенд</p>
        </div>
        
        <div class="section">
            <h2>🚀 Готовые системы:</h2>
            <ul>
                <li class="status">✅ Cloudflare Workers backend</li>
                <li class="status">✅ D1 база данных</li>
                <li class="status">✅ KV для сессий и изображений</li>
                <li class="status">✅ Assets binding для статических файлов</li>
                <li class="status">✅ Система авторизации</li>
                <li class="status">✅ CRUD API для предметов и блога</li>
                <li class="status">✅ Загрузка изображений</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>🔗 API Endpoints работают:</h2>
            <div class="endpoint">GET /api/items - Список предметов коллекции</div>
            <div class="endpoint">GET /api/blog - Блог посты</div>
            <div class="endpoint">POST /api/auth/login - Авторизация админа</div>
            <div class="endpoint">GET /api/admin/items - Управление предметами</div>
            <div class="endpoint">POST /api/admin/photos/upload - Загрузка фото</div>
            <div class="endpoint">GET /api/assets/* - Раздача изображений</div>
            <div class="endpoint">GET /api/admin/export - Экспорт данных</div>
        </div>
        
        <div class="section">
            <h2>⚡ Следующий шаг - сборка фронтенда:</h2>
            <div class="build-steps">
                <div class="step"><strong>1.</strong> Соберите React приложение:</div>
                <div class="endpoint">cd frontend && npm run build</div>
                
                <div class="step"><strong>2.</strong> Разверните обновления:</div>
                <div class="endpoint">wrangler deploy</div>
                
                <div class="step"><strong>3.</strong> Готово! Полноценный сайт будет доступен</div>
            </div>
        </div>

        <div class="section">
            <h2>🔐 Доступ в админку:</h2>
            <p>Используйте Basic Auth с данными из <code>wrangler.toml</code></p>
            <div class="endpoint">curl -u username:password ${url.origin}/api/auth/login</div>
        </div>
    </div>
</body>
</html>
  `);
});

export default app;