import type { App } from './app';
import { escapeHtml } from './html';
import { GLOBAL_CSS } from '../styles';

function publicShell(body: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Моя коллекция</title>
  <style>${GLOBAL_CSS}</style>
</head>
<body>
  <div style="max-width: 1400px; margin: 0 auto; padding: 32px 24px;">
    ${body}
  </div>
</body>
</html>`;
}

export function publicRoutes(app: App) {
	// Главная страница
	app.get('/', async (c) => {
		try {
			// Получаем последние 4 предмета
			const itemsRes = await c.env.DB.prepare(`
			  SELECT id, title, description, year, tags, category, slug, created_at, is_featured
			  FROM items
			  ORDER BY is_featured DESC, created_at DESC
			  LIMIT 4
			`).all();
			const items = (itemsRes.results || []).map((it: any) => ({ ...it, tags: JSON.parse(it.tags || '[]') }));

			// Получаем фотографии для предметов на главной
			const itemsWithPhotos = await Promise.all(items.map(async (item: any) => {
				const photosRes = await c.env.DB.prepare(`
				  SELECT compressed_path FROM photos WHERE item_id = ? AND status = 'active' ORDER BY sort_order ASC, created_at ASC LIMIT 1
				`).bind(item.id).all();
				
				const photos = photosRes.results || [];
				const coverPhoto = photos.length > 0 ? photos[0] : null;
				const coverUrl = coverPhoto ? `/api/photos/r2/compressed/${(coverPhoto as any).compressed_path.split('/').pop()}` : null;
				
				return { ...item, coverPhoto: coverUrl };
			}));

			// Получаем последние 4 поста блога
			const postsRes = await c.env.DB.prepare(`
			  SELECT id, title, excerpt, publish_date, category, slug
			  FROM blog_posts
			  WHERE published = 1
			  ORDER BY publish_date DESC
			  LIMIT 4
			`).all();
			const posts = postsRes.results || [];

			const body = `
			  <h1>Моя коллекция</h1>
			  <nav style="margin-bottom: 32px;">
				<a href="/items" style="margin-right: 16px; color: var(--primary); text-decoration: none;">Коллекция</a>
				<a href="/blog" style="margin-right: 16px; color: var(--primary); text-decoration: none;">Блог</a>
				<a href="/admin" style="color: var(--primary); text-decoration: none;">Админка</a>
			  </nav>
			  
			  <section style="margin-bottom: 48px;">
				<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
				  <h2>Последние предметы</h2>
				  <a href="/items" style="color: var(--primary); text-decoration: none;">Смотреть все →</a>
				</div>
				
				${itemsWithPhotos.length === 0 ? `
				  <div class="card" style="padding: 48px; text-align: center;">
					<h3>Коллекция пуста</h3>
					<p>Добавьте первые предметы через админку</p>
				  </div>
				` : `
				  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
					${itemsWithPhotos.map((item: any) => `
					  <div class="card" style="padding: 0; overflow: hidden;">
						${item.coverPhoto ? `
						  <a href="/items/${item.slug || item.id}" style="display: block;">
							<img src="${item.coverPhoto}" alt="${escapeHtml(item.title)}" style="width: 100%; height: 150px; object-fit: cover;" />
						  </a>
						` : ''}
						<div style="padding: 16px;">
						<h3 style="margin: 0 0 8px 0;"><a href="/items/${item.slug || item.id}" style="color: var(--primary); text-decoration: none;">${escapeHtml(item.title)}</a></h3>
						<p class="muted" style="margin: 0 0 8px 0;">${escapeHtml(item.category || '')}</p>
						<p style="margin: 0 0 8px 0;">${escapeHtml(item.description || '')}</p>
						${item.year ? `<p class="muted" style="margin: 0;">Год: ${item.year}</p>` : ''}
						</div>
					  </div>
					`).join('')}
				  </div>
				`}
			  </section>
			  
			  <section>
				<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
				  <h2>Последние записи блога</h2>
				  <a href="/blog" style="color: var(--primary); text-decoration: none;">Смотреть все →</a>
				</div>
				
				${posts.length === 0 ? `
				  <div class="card" style="padding: 48px; text-align: center;">
					<h3>Блог пуст</h3>
					<p>Добавьте первые записи через админку</p>
				  </div>
				` : `
				  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
					${posts.map((post: any) => `
					  <div class="card" style="padding: 16px;">
						<h3 style="margin: 0 0 8px 0;"><a href="/blog/${post.slug || post.id}" style="color: var(--primary); text-decoration: none;">${escapeHtml(post.title)}</a></h3>
						<p class="muted" style="margin: 0 0 8px 0;">${escapeHtml(post.category || 'Блог')}</p>
						<p style="margin: 0 0 8px 0;">${escapeHtml(post.excerpt || '')}</p>
						<p class="muted" style="margin: 0;">Дата: ${new Date(post.publish_date).toLocaleDateString('ru-RU')}</p>
					  </div>
					`).join('')}
				  </div>
				`}
			  </section>
			`;
			return c.html(publicShell(body));
		} catch (error) {
			console.error('Homepage error:', error);
			return c.html(publicShell('<h1>Ошибка загрузки</h1><p>Попробуйте обновить страницу. Ошибка: ' + (error as Error).message + '</p>'));
		}
	});

	// Страница коллекции
	app.get('/items', async (c) => {
		try {
			const res = await c.env.DB.prepare(`
			  SELECT id, title, description, year, tags, category, created_at, slug
			  FROM items
			  ORDER BY created_at DESC
			  LIMIT 30
			`).all();
			const items = (res.results || []).map((it: any) => ({ ...it, tags: JSON.parse(it.tags || '[]') }));

			// Получаем фотографии для каждого предмета
			const itemsWithPhotos = await Promise.all(items.map(async (item: any) => {
				const photosRes = await c.env.DB.prepare(`
				  SELECT compressed_path FROM photos WHERE item_id = ? AND status = 'active' ORDER BY sort_order ASC, created_at ASC LIMIT 1
				`).bind(item.id).all();
				
				const photos = photosRes.results || [];
				const coverPhoto = photos.length > 0 ? photos[0] : null;
				const coverUrl = coverPhoto ? `/api/photos/r2/compressed/${(coverPhoto as any).compressed_path.split('/').pop()}` : null;
				
				return { ...item, coverPhoto: coverUrl };
			}));

			const body = `
			  <h1>Коллекция</h1>
			  <nav style="margin-bottom: 32px;">
				<a href="/" style="margin-right: 16px; color: var(--primary); text-decoration: none;">Главная</a>
				<a href="/blog" style="margin-right: 16px; color: var(--primary); text-decoration: none;">Блог</a>
				<a href="/admin" style="color: var(--primary); text-decoration: none;">Админка</a>
			  </nav>
			  
			  ${itemsWithPhotos.length === 0 ? `
				<div class="card" style="padding: 48px; text-align: center;">
				  <h2>Коллекция пуста</h2>
				  <p>Добавьте первые предметы через админку</p>
				</div>
			  ` : `
				<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
				  ${itemsWithPhotos.map((item: any) => `
					<div class="card" style="padding: 0; overflow: hidden;">
					  ${item.coverPhoto ? `
						<a href="/items/${item.slug || item.id}" style="display: block;">
						  <img src="${item.coverPhoto}" alt="${escapeHtml(item.title)}" style="width: 100%; height: 200px; object-fit: cover;" />
						</a>
					  ` : ''}
					  <div style="padding: 20px;">
						<h3><a href="/items/${item.slug || item.id}" style="color: var(--primary); text-decoration: none;">${escapeHtml(item.title)}</a></h3>
					  <p class="muted">${escapeHtml(item.category || '')}</p>
					  <p>${escapeHtml(item.description || '')}</p>
					  ${item.year ? `<p>Год: ${item.year}</p>` : ''}
					  </div>
					</div>
				  `).join('')}
				</div>
			  `}
			`;
			return c.html(publicShell(body));
		} catch (error) {
			console.error('Items page error:', error);
			return c.html(publicShell('<h1>Ошибка загрузки</h1><p>Попробуйте обновить страницу</p>'));
		}
	});

	// Страница блога
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
			  <nav style="margin-bottom: 32px;">
				<a href="/" style="margin-right: 16px; color: var(--primary); text-decoration: none;">Главная</a>
				<a href="/items" style="margin-right: 16px; color: var(--primary); text-decoration: none;">Коллекция</a>
				<a href="/admin" style="color: var(--primary); text-decoration: none;">Админка</a>
			  </nav>
			  
			  ${posts.length === 0 ? `
				<div class="card" style="padding: 48px; text-align: center;">
				  <h2>Блог пуст</h2>
				  <p>Добавьте первые записи через админку</p>
				</div>
			  ` : `
				<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px;">
				  ${posts.map((post: any) => `
					<div class="card" style="padding: 20px;">
					  <h3>${escapeHtml(post.title)}</h3>
					  <p class="muted">${escapeHtml(post.category || 'Блог')}</p>
					  <p>${escapeHtml(post.excerpt || '')}</p>
					  <p class="muted">Дата: ${new Date(post.publish_date).toLocaleDateString('ru-RU')}</p>
					</div>
				  `).join('')}
				</div>
			  `}
			`;
			return c.html(publicShell(body));
		} catch (error) {
			console.error('Blog page error:', error);
			return c.html(publicShell('<h1>Ошибка загрузки</h1><p>Попробуйте обновить страницу</p>'));
		}
	});

	// Страница отдельного предмета
	app.get('/items/:id', async (c) => {
		try {
			const id = c.req.param('id');
			const res = await c.env.DB.prepare(`
			  SELECT * FROM items WHERE id = ? OR slug = ?
			`).bind(id, id).first();

			if (!res) {
				return c.html(publicShell('<h1>Предмет не найден</h1><p><a href="/items">← Назад к коллекции</a></p>'));
			}

			const item = { ...res, tags: JSON.parse((res as any).tags || '[]') };

			// Получаем фотографии предмета
			const photosRes = await c.env.DB.prepare(`
			  SELECT compressed_path, thumbnail_path FROM photos WHERE item_id = ? AND status = 'active' ORDER BY sort_order ASC, created_at ASC
			`).bind((res as any).id).all();
			
			const photos = photosRes.results || [];
			const photoUrls = photos.map((p: any) => {
				const cp = String(p.compressed_path || '');
				return `/api/photos/r2/compressed/${cp.split('/').pop()}`;
			});

			const body = `
			  <nav style="margin-bottom: 32px;">
				<a href="/" style="margin-right: 16px; color: var(--primary); text-decoration: none;">Главная</a>
				<a href="/items" style="margin-right: 16px; color: var(--primary); text-decoration: none;">← Коллекция</a>
				<a href="/blog" style="margin-right: 16px; color: var(--primary); text-decoration: none;">Блог</a>
			  </nav>
			  
			  <div style="display: grid; grid-template-columns: 1fr 400px; gap: 40px; max-width: 1200px; margin: 0 auto;">
				<!-- Галерея слева -->
				<div>
				  ${photoUrls.length > 0 ? `
					<div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
					  <!-- Главное изображение -->
					  <div id="mainImageContainer" style="position: relative; margin-bottom: 16px;">
						<img id="mainImage" src="${photoUrls[0]}" alt="${escapeHtml(item.title)}" 
						  style="width: 100%; height: 500px; object-fit: contain; border-radius: 8px; background: white;" />
						${photoUrls.length > 1 ? `
						  <div style="position: absolute; bottom: 16px; right: 16px; background: rgba(0,0,0,0.7); color: white; padding: 8px 12px; border-radius: 6px; font-size: 14px;">
							<span id="currentIndex">1</span> / ${photoUrls.length}
						  </div>
						` : ''}
					  </div>
					  
					  <!-- Миниатюры -->
					  ${photoUrls.length > 1 ? `
						<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 12px; max-width: 400px;">
						  ${photoUrls.map((url, index) => `
							<button onclick="switchImage(${index})" 
							  style="border: 2px solid ${index === 0 ? '#0f172a' : 'transparent'}; border-radius: 8px; padding: 0; background: none; cursor: pointer; transition: all 0.2s ease;"
							  class="thumbnail-btn" data-index="${index}">
							  <img src="${url}" alt="${escapeHtml(item.title)} - фото ${index + 1}" 
								style="width: 100%; height: 80px; object-fit: cover; border-radius: 6px; display: block;" />
							</button>
						  `).join('')}
						</div>
					  ` : ''}
					</div>
					
					<script>
					const photoUrls = ${JSON.stringify(photoUrls)};
					let currentImageIndex = 0;
					
					function switchImage(index) {
					  currentImageIndex = index;
					  document.getElementById('mainImage').src = photoUrls[index];
					  document.getElementById('currentIndex').textContent = index + 1;
					  
					  // Обновляем стили миниатюр
					  document.querySelectorAll('.thumbnail-btn').forEach((btn, i) => {
						btn.style.borderColor = i === index ? '#0f172a' : 'transparent';
					  });
					}
					</script>
				  ` : `
					<div style="background: #f8fafc; border-radius: 12px; padding: 80px; text-align: center; color: #64748b;">
					  <div style="font-size: 64px; margin-bottom: 16px;">📷</div>
					  <p>Фотографии не загружены</p>
					</div>
				  `}
				</div>
				
				<!-- Информация справа -->
				<div>
				  <div style="background: white; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
					<!-- Категория -->
					<div style="background: #f9fafb; padding: 12px 20px; border-bottom: 1px solid #e5e7eb;">
					  <span style="color: #6b7280; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(item.category || 'Без категории')}</span>
					</div>
					
					<!-- Заголовок -->
					<div style="padding: 24px 20px;">
					  <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.3;">${escapeHtml(item.title)}</h1>
					  
					  <!-- Краткое описание -->
					  ${item.description ? `
						<div style="margin-bottom: 20px;">
						  <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Краткое описание</h3>
						  <p style="margin: 0; color: #6b7280; line-height: 1.5; font-size: 15px;">${escapeHtml(item.description)}</p>
						</div>
					  ` : ''}
					  
					  <!-- Подробное описание -->
					  ${item.full_description ? `
						<div style="margin-bottom: 20px;">
						  <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Подробное описание</h3>
						  <p style="margin: 0; color: #6b7280; line-height: 1.5; font-size: 15px; white-space: pre-wrap;">${escapeHtml(item.full_description)}</p>
						</div>
					  ` : ''}
					  
					  <!-- Теги -->
					  ${Array.isArray(item.tags) && item.tags.length > 0 ? `
						<div style="margin-bottom: 20px;">
						  <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Теги</h3>
						  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
							${item.tags.map(tag => `
							  <span style="background: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 4px; font-size: 13px; border: 1px solid #e5e7eb;">
								${escapeHtml(tag)}
							  </span>
							`).join('')}
						  </div>
						</div>
					  ` : ''}
					</div>
					
					<!-- Технические характеристики -->
					<div style="background: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
					  <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Характеристики</h3>
					  
					  <div style="display: grid; gap: 12px;">
						${item.year ? `
						  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
							<span style="font-size: 14px; color: #6b7280;">Год</span>
							<span style="font-size: 14px; color: #111827; font-weight: 500;">${item.year}</span>
						  </div>
						` : ''}
						
						${item.country ? `
						  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
							<span style="font-size: 14px; color: #6b7280;">Страна</span>
							<span style="font-size: 14px; color: #111827; font-weight: 500;">${escapeHtml(item.country)}</span>
						  </div>
						` : ''}
						
						${item.organization ? `
						  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
							<span style="font-size: 14px; color: #6b7280;">Организация</span>
							<span style="font-size: 14px; color: #111827; font-weight: 500;">${escapeHtml(item.organization)}</span>
						  </div>
						` : ''}
						
						${item.size ? `
						  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
							<span style="font-size: 14px; color: #6b7280;">Размер</span>
							<span style="font-size: 14px; color: #111827; font-weight: 500;">${escapeHtml(item.size)}</span>
						  </div>
						` : ''}
						
						${item.condition ? `
						  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
							<span style="font-size: 14px; color: #6b7280;">Состояние</span>
							<span style="font-size: 14px; color: #111827; font-weight: 500;">${escapeHtml(item.condition)}</span>
						  </div>
						` : ''}
						
						${item.edition ? `
						  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
							<span style="font-size: 14px; color: #6b7280;">Тираж/Издание</span>
							<span style="font-size: 14px; color: #111827; font-weight: 500;">${escapeHtml(item.edition)}</span>
						  </div>
						` : ''}
						
						${item.series ? `
						  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
							<span style="font-size: 14px; color: #6b7280;">Серия</span>
							<span style="font-size: 14px; color: #111827; font-weight: 500;">${escapeHtml(item.series)}</span>
						  </div>
						` : ''}
						
						${item.value ? `
						  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
							<span style="font-size: 14px; color: #6b7280;">Стоимость</span>
							<span style="font-size: 14px; color: #111827; font-weight: 600;">${escapeHtml(item.value)}</span>
						  </div>
						` : ''}
						
						${item.acquisition ? `
						  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
							<span style="font-size: 14px; color: #6b7280;">Приобретение</span>
							<span style="font-size: 14px; color: #111827; font-weight: 500;">${escapeHtml(item.acquisition)}</span>
						  </div>
						` : ''}
					  </div>
					</div>
				  </div>
				</div>
			  </div>
			  
			  <!-- Адаптивный дизайн -->
			  <style>
				@media (max-width: 768px) {
				  div[style*="grid-template-columns: 1fr 400px"] {
					display: block !important;
				  }
				  div[style*="grid-template-columns: 1fr 400px"] > div:last-child {
					margin-top: 32px;
				  }
				}
			  </style>
			`;
			return c.html(publicShell(body));
		} catch (error) {
			console.error('Item page error:', error);
			return c.html(publicShell('<h1>Ошибка загрузки</h1><p><a href="/items">← Назад к коллекции</a></p>'));
		}
	});

	// Страница отдельного поста
	app.get('/blog/:id', async (c) => {
		try {
			const id = c.req.param('id');
			const res = await c.env.DB.prepare(`
			  SELECT * FROM blog_posts WHERE id = ? OR slug = ?
			`).bind(id, id).first();

			if (!res) {
				return c.html(publicShell('<h1>Пост не найден</h1><p><a href="/blog">← Назад к блогу</a></p>'));
			}

			const post = res as any;

			const body = `
			  <nav style="margin-bottom: 32px;">
				<a href="/" style="margin-right: 16px; color: var(--primary); text-decoration: none;">Главная</a>
				<a href="/items" style="margin-right: 16px; color: var(--primary); text-decoration: none;">Коллекция</a>
				<a href="/blog" style="margin-right: 16px; color: var(--primary); text-decoration: none;">← Блог</a>
			  </nav>
			  
			  <div class="card" style="padding: 32px;">
				<h1>${escapeHtml(post.title)}</h1>
				<p class="muted">${escapeHtml(post.category || 'Блог')} • ${new Date(post.publish_date).toLocaleDateString('ru-RU')}</p>
				${post.excerpt ? `<p><em>${escapeHtml(post.excerpt)}</em></p>` : ''}
				${post.content ? `<div style="margin-top: 24px;">${escapeHtml(post.content)}</div>` : ''}
			  </div>
			`;
			return c.html(publicShell(body));
		} catch (error) {
			console.error('Blog post error:', error);
			return c.html(publicShell('<h1>Ошибка загрузки</h1><p><a href="/blog">← Назад к блогу</a></p>'));
		}
	});
}