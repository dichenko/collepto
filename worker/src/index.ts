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
    .btn{display:inline-block;background:#2563eb;color:#fff;border-radius:8px;padding:8px 12px;text-decoration:none}
    .btn:hover{background:#1d4ed8}
    form{display:grid;gap:8px}
    input,select,textarea{padding:8px;border:1px solid #e5e7eb;border-radius:6px}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left}
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

// ========== Admin Area ==========
function requireAuth(c: any): boolean {
  const cookie = c.req.header('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)sessionId=([^;]+)/);
  return !!match;
}

app.get('/admin/login', async (c) => {
  const body = `
    <h1>Вход в админку</h1>
    <form method="post" action="/admin/login" onsubmit="return login(event)">
      <input name="username" placeholder="Username" required />
      <input name="password" type="password" placeholder="Password" required />
      <label class="muted"><input type="checkbox" name="remember" checked /> Запомнить</label>
      <button class="btn" type="submit">Войти</button>
    </form>
    <script>
      async function login(e){
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = { username: fd.get('username'), password: fd.get('password'), remember: fd.get('remember')==='on' };
        const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        const json = await res.json();
        if(json.success){ location.href = '/admin'; } else { alert(json.error||'Login failed'); }
      }
    </script>
  `;
  return c.html(layoutHtml('Вход — Admin', body));
});

app.get('/admin/logout', async (c) => {
  await fetch(new URL('/api/auth/logout', c.req.url), { method:'POST', headers: { Cookie: c.req.header('Cookie')||'' } });
  return c.redirect('/admin/login');
});

app.get('/admin', async (c) => {
  if (!requireAuth(c)) return c.redirect('/admin/login');
  const body = `
    <h1>Админка</h1>
    <p><a class="btn" href="/admin/collection">Коллекция</a> <a class="btn" href="/admin/blog">Блог</a> <a class="btn" href="/admin/logout">Выйти</a></p>
  `;
  return c.html(layoutHtml('Админка', body));
});

// Admin: Collection list with filters
app.get('/admin/collection', async (c) => {
  if (!requireAuth(c)) return c.redirect('/admin/login');
  const url = new URL(c.req.url);
  const q = url.searchParams.get('q') || '';
  const category = url.searchParams.get('category') || '';
  const yearFrom = url.searchParams.get('yearFrom');
  const yearTo = url.searchParams.get('yearTo');
  const params: any[] = [];
  let sql = q
    ? `SELECT items.* FROM items_fts JOIN items ON items_fts.rowid = items.rowid WHERE items_fts MATCH ?`
    : 'SELECT * FROM items WHERE 1=1';
  if (q) params.push(q);
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (yearFrom) { sql += ' AND year >= ?'; params.push(parseInt(yearFrom)); }
  if (yearTo) { sql += ' AND year <= ?'; params.push(parseInt(yearTo)); }
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const res = await c.env.DB.prepare(sql).bind(...params).all();
  const items = (res.results||[]).map((it:any)=>({ ...it, tags: JSON.parse(it.tags||'[]') }));
  const body = `
    <h1>Коллекция</h1>
    <form method="get">
      <input name="q" value="${escapeHtml(q)}" placeholder="Поиск" />
      <input name="category" value="${escapeHtml(category)}" placeholder="Категория" />
      <input name="yearFrom" value="${escapeHtml(yearFrom||'')}" placeholder="Год от" />
      <input name="yearTo" value="${escapeHtml(yearTo||'')}" placeholder="Год до" />
      <button class="btn" type="submit">Искать</button>
      <a class="btn" href="/admin/collection/new">Добавить в коллекцию</a>
      <a class="btn" href="/admin">Назад</a>
    </form>
    <table>
      <thead><tr><th>Название</th><th>Категория</th><th>Год</th><th></th></tr></thead>
      <tbody>
        ${items.map((i:any)=>`<tr>
          <td>${escapeHtml(i.title)}</td>
          <td>${escapeHtml(i.category||'')}</td>
          <td>${i.year??''}</td>
          <td><a class="btn" href="/admin/collection/${encodeURIComponent(i.id)}">Редактировать</a></td>
        </tr>`).join('')}
      </tbody>
    </table>
  `;
  return c.html(layoutHtml('Админка — Коллекция', body));
});

// Admin: Collection new/edit forms
app.get('/admin/collection/new', async (c) => {
  if (!requireAuth(c)) return c.redirect('/admin/login');
  const body = `
    <h1>Новый предмет</h1>
    <form onsubmit="return saveItem(event)">
      <input name="title" placeholder="Название" required />
      <input name="category" placeholder="Категория" required />
      <input name="year" type="number" placeholder="Год" required />
      <textarea name="description" placeholder="Короткое описание"></textarea>
      <input name="tags" placeholder="Теги, через запятую" />
      <button class="btn" type="submit">Сохранить</button>
      <a class="btn" href="/admin/collection">Отмена</a>
    </form>
    <script>
      async function saveItem(e){
        e.preventDefault();
        const fd=new FormData(e.target);
        const payload={
          title: fd.get('title'),
          category: fd.get('category'),
          year: Number(fd.get('year')),
          description: fd.get('description')||'',
          tags: String(fd.get('tags')||'').split(',').map(s=>s.trim()).filter(Boolean)
        };
        const res=await fetch('/api/admin/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const json=await res.json(); if(json.success){ location.href='/admin/collection'; } else { alert(json.error||'Save failed'); }
      }
    </script>
  `;
  return c.html(layoutHtml('Новый предмет — Админка', body));
});

app.get('/admin/collection/:id', async (c) => {
  if (!requireAuth(c)) return c.redirect('/admin/login');
  const id = c.req.param('id');
  const item = await c.env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(id).first();
  if (!item) return c.notFound();
  const body = `
    <h1>Редактировать: ${escapeHtml((item as any).title)}</h1>
    <form onsubmit="return updateItem(event)">
      <input name="title" value="${escapeHtml((item as any).title)}" required />
      <input name="category" value="${escapeHtml((item as any).category||'')}" required />
      <input name="year" type="number" value="${(item as any).year||''}" required />
      <textarea name="description">${escapeHtml((item as any).description||'')}</textarea>
      <input name="tags" value="${escapeHtml(((item as any).tags||'[]').toString())}" placeholder="[теги] игнорируется" />
      <button class="btn" type="submit">Сохранить</button>
      <a class="btn" href="/admin/collection">Назад</a>
    </form>
    <script>
      async function updateItem(e){
        e.preventDefault();
        const fd=new FormData(e.target);
        const payload={
          title: fd.get('title'),
          category: fd.get('category'),
          year: Number(fd.get('year')),
          description: fd.get('description')||''
        };
        const res=await fetch('/api/admin/items/${encodeURIComponent(id)}',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const json=await res.json(); if(json.success){ location.href='/admin/collection'; } else { alert(json.error||'Save failed'); }
      }
    </script>
  `;
  return c.html(layoutHtml('Редактирование предмета — Админка', body));
});

// Admin: Blog list
app.get('/admin/blog', async (c) => {
  if (!requireAuth(c)) return c.redirect('/admin/login');
  const url = new URL(c.req.url);
  const q = url.searchParams.get('q') || '';
  const category = url.searchParams.get('category') || '';
  const published = url.searchParams.get('published');
  const params:any[]=[];
  let sql = q
    ? `SELECT blog_posts.* FROM blog_posts_fts JOIN blog_posts ON blog_posts_fts.rowid = blog_posts.rowid WHERE blog_posts_fts MATCH ?`
    : 'SELECT * FROM blog_posts WHERE 1=1';
  if (q) params.push(q);
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (published) { sql += ' AND published = ?'; params.push(published==='true'?1:0); }
  sql += ' ORDER BY publish_date DESC LIMIT 100';
  const res = await c.env.DB.prepare(sql).bind(...params).all();
  const posts = res.results||[];
  const body = `
    <h1>Блог</h1>
    <form method="get">
      <input name="q" value="${escapeHtml(q)}" placeholder="Поиск" />
      <input name="category" value="${escapeHtml(category)}" placeholder="Категория" />
      <select name="published"><option value="">Любые</option><option ${published==='true'?'selected':''} value="true">Опубликованные</option><option ${published==='false'?'selected':''} value="false">Черновики</option></select>
      <button class="btn" type="submit">Искать</button>
      <a class="btn" href="/admin/blog/new">Новая запись</a>
      <a class="btn" href="/admin">Назад</a>
    </form>
    <table>
      <thead><tr><th>Название</th><th>Категория</th><th>Дата</th><th>Статус</th><th></th></tr></thead>
      <tbody>
        ${posts.map((p:any)=>`<tr>
          <td>${escapeHtml(p.title)}</td>
          <td>${escapeHtml(p.category||'')}</td>
          <td>${escapeHtml(p.publish_date||'')}</td>
          <td>${p.published? 'Опубликован':'Черновик'}</td>
          <td><a class=\"btn\" href=\"/admin/blog/${encodeURIComponent(p.id)}\">Редактировать</a></td>
        </tr>`).join('')}
      </tbody>
    </table>
  `;
  return c.html(layoutHtml('Админка — Блог', body));
});

app.get('/admin/blog/new', async (c) => {
  if (!requireAuth(c)) return c.redirect('/admin/login');
  const body = `
    <h1>Новая запись</h1>
    <form onsubmit="return savePost(event)">
      <input name="title" placeholder="Заголовок" required />
      <input name="category" placeholder="Категория" required />
      <input name="publishDate" placeholder="YYYY-MM-DD" required />
      <input name="readTime" type="number" placeholder="Время чтения (мин.)" required />
      <textarea name="excerpt" placeholder="Короткий анонс" required></textarea>
      <textarea name="content" placeholder="Контент" required></textarea>
      <label class="muted"><input type="checkbox" name="published" /> Опубликовать</label>
      <button class="btn" type="submit">Сохранить</button>
      <a class="btn" href="/admin/blog">Отмена</a>
    </form>
    <script>
      async function savePost(e){
        e.preventDefault();
        const fd=new FormData(e.target);
        const payload={
          title: fd.get('title'),
          excerpt: fd.get('excerpt'),
          content: fd.get('content'),
          publishDate: fd.get('publishDate'),
          readTime: Number(fd.get('readTime')),
          relatedItems: [],
          category: fd.get('category'),
          published: fd.get('published')==='on'
        };
        const res=await fetch('/api/admin/blog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const json=await res.json(); if(json.success){ location.href='/admin/blog'; } else { alert(json.error||'Save failed'); }
      }
    </script>
  `;
  return c.html(layoutHtml('Новая запись — Админка', body));
});

app.get('/admin/blog/:id', async (c) => {
  if (!requireAuth(c)) return c.redirect('/admin/login');
  const id = c.req.param('id');
  const post = await c.env.DB.prepare('SELECT * FROM blog_posts WHERE id = ?').bind(id).first();
  if (!post) return c.notFound();
  const body = `
    <h1>Редактировать: ${escapeHtml((post as any).title)}</h1>
    <form onsubmit="return updatePost(event)">
      <input name="title" value="${escapeHtml((post as any).title)}" required />
      <input name="category" value="${escapeHtml((post as any).category||'')}" required />
      <input name="publishDate" value="${escapeHtml((post as any).publish_date||'')}" required />
      <input name="readTime" type="number" value="${(post as any).read_time||5}" required />
      <textarea name="excerpt">${escapeHtml((post as any).excerpt||'')}</textarea>
      <textarea name="content">${escapeHtml((post as any).content||'')}</textarea>
      <label class="muted"><input type="checkbox" name="published" ${(post as any).published? 'checked':''} /> Опубликован</label>
      <button class="btn" type="submit">Сохранить</button>
      <a class="btn" href="/admin/blog">Назад</a>
    </form>
    <script>
      async function updatePost(e){
        e.preventDefault();
        const fd=new FormData(e.target);
        const payload={
          title: fd.get('title'),
          category: fd.get('category'),
          publishDate: fd.get('publishDate'),
          readTime: Number(fd.get('readTime')),
          excerpt: fd.get('excerpt'),
          content: fd.get('content'),
          published: fd.get('published')==='on'
        };
        const res=await fetch('/api/admin/blog/${encodeURIComponent(id)}',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const json=await res.json(); if(json.success){ location.href='/admin/blog'; } else { alert(json.error||'Save failed'); }
      }
    </script>
  `;
  return c.html(layoutHtml('Редактирование поста — Админка', body));
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