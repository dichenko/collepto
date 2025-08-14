import type { App } from './app';
import { escapeHtml } from './html';
import { SHELL_CSS, shell } from './styles';
import { DatabaseQueries } from '../db/queries';

export function publicRoutes(app: App) {
	app.get('/', async (c) => {
		try {
			const res = await c.env.DB.prepare(`
			  SELECT id, title, description, year, tags, category, created_at
			  FROM items
			  ORDER BY created_at DESC
			  LIMIT 6
			`).all();
			const items = (res.results || []).map((it: any) => ({ ...it, tags: JSON.parse(it.tags || '[]') }));

			const blogRes = await c.env.DB.prepare(`
			  SELECT id, title, excerpt, publish_date, category, slug
			  FROM blog_posts
			  WHERE published = 1
			  ORDER BY publish_date DESC
			  LIMIT 6
			`).all();
			const posts = blogRes.results || [];

			const body = `
			  <h1 style="margin:0 0 6px 0">Добро пожаловать в мою коллекцию</h1>
			  <p class="muted">Исследуйте уникальные винтажные предметы, собранные с любовью за годы коллекционирования</p>
			  <div style="height:12px"></div>
			  <h2 style="margin:0 0 10px 0">Последние предметы</h2>
			  ${items.length === 0 ? '<p class="muted">Нет данных.</p>' : `
				<div class="grid">
				  ${items.map((i: any) => `
					<div class="card">
					  ${(i.photos&&i.photos[0])?`<img class=\"thumb\" src=\"${i.photos[0]}\" alt=\"${escapeHtml(i.title)}\" loading=\"lazy\" />`:''}
					  <div class="card-body">
						<div class="muted">${escapeHtml(i.category || '')}</div>
						<div class="title">${escapeHtml(i.title)}</div>
						<div class="muted">${i.year ?? ''}</div>
						<div style="height:8px"></div>
						<a class="btn ghost" href="/items/${encodeURIComponent(i.id)}">Подробнее</a>
					  </div>
					</div>`).join('')}
				</div>`}

			  <div style="height:18px"></div>
			  <h2 style="margin:0 0 10px 0">Последние записи</h2>
			  ${posts.length === 0 ? '<p class="muted">Нет данных.</p>' : `
				<div class="grid">
				  ${posts.map((p: any) => `
					<div class="card">
					  <div class="card-body">
						<div class="muted">${escapeHtml(p.category || '')}</div>
						<div class="title">${escapeHtml(p.title)}</div>
						<div class="muted">${escapeHtml(p.publish_date || '')}</div>
						<div style="height:8px"></div>
						<a class="btn ghost" href="/blog/${encodeURIComponent(p.slug || p.id)}">Подробнее</a>
					  </div>
					</div>`).join('')}
				</div>`}
			`;
			return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
		} catch (e) {
			return c.html(`<style>${SHELL_CSS}</style>${shell('<p>Ошибка загрузки.</p>')}`);
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
			const items = (res.results || []).map((it: any) => ({ ...it, tags: JSON.parse(it.tags || '[]') }));

			const body = `
			  <h1 style="margin:0 0 6px 0">Добро пожаловать в мою коллекцию</h1>
			  <p class="muted">Исследуйте уникальные винтажные предметы, собранные с любовью за годы коллекционирования</p>
			  <div style=\"height:12px\"></div>
			  ${items.length === 0 ? '<p class="muted">Нет данных.</p>' : `
				<div class="grid">
				  ${items.map((i: any) => `
					<div class="card">
					  ${(i.photos&&i.photos[0])?`<img class=\"thumb\" src=\"${i.photos[0]}\" alt=\"${escapeHtml(i.title)}\" loading=\"lazy\" />`:''}
					  <div class="card-body">
						<div class="muted">${escapeHtml(i.category || '')}</div>
						<div class="title">${escapeHtml(i.title)}</div>
						<div class="muted">${i.year ?? ''}</div>
						<div style="height:8px"></div>
						<a class="btn ghost" href="/items/${encodeURIComponent(i.id)}">Подробнее</a>
					  </div>
					</div>`).join('')}
				</div>`}
			`;
			return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
		} catch {
			return c.html(`<style>${SHELL_CSS}</style>${shell('<p>Ошибка загрузки.</p>')}`);
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
			return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
		} catch {
			return c.html(`<style>${SHELL_CSS}</style>${shell('<p>Ошибка загрузки.</p>')}`);
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
			return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
		} catch {
			return c.html(`<style>${SHELL_CSS}</style>${shell('<p>Ошибка загрузки.</p>')}`);
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
					item = { ...maybe, tags: JSON.parse((maybe as any).tags || '[]') } as any;
				}
			}
			if (!item) return c.notFound();

			const photosRes = await c.env.DB.prepare(`
			  SELECT compressed_path FROM photo_assets WHERE item_id = ? LIMIT 6
			`).bind(item.id).all();
			const photos = photosRes.results?.map((p: any) => `/api/photos/r2/compressed/${p.compressed_path.split('/').pop()}`) || [];

			const body = `
			  <div class="row two">
				<div>
				  <h1 class="title" style="font-size:28px">${escapeHtml(item.title)}</h1>
				  ${item.description ? `<p class="muted">${escapeHtml(item.description)}</p>` : ''}
				  <div class="muted">${escapeHtml(item.category || '')} · ${item.year ?? ''}</div>
				</div>
				<div class="panel"><h3>Фотографии</h3>${photos.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">${photos.map((src: string) => `<a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${escapeHtml(item.title)}" loading="lazy" /></a>`).join('')}</div>` : '<div class="muted">Нет фото</div>'}</div>
			  </div>
			`;
			return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
		} catch {
			return c.html(`<style>${SHELL_CSS}</style>${shell('<p>Ошибка загрузки.</p>')}`);
		}
	});
}


