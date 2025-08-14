import type { App } from './app';
import { escapeHtml } from './html';
import { SHELL_CSS, shell } from './styles';

export function adminRoutes(app: App) {
	function adminNavHtml(): string {
		return `<div class="admin-nav">
			<a class="btn" href="/admin">Админка</a>
			<a class="btn" href="/admin/collection">Коллекция</a>
			<a class="btn" href="/admin/blog">Блог</a>
			<a class="btn" href="/admin/logout">Выйти</a>
		</div>`;
	}

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
		return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
	});

	app.get('/admin/logout', async (c) => {
		await fetch(new URL('/api/auth/logout', c.req.url), { method:'POST', headers: { Cookie: c.req.header('Cookie')||'' } });
		return c.redirect('/admin/login');
	});

	app.get('/admin', async (c) => {
		if (!requireAuth(c)) return c.redirect('/admin/login');
		const itemsCount = (await c.env.DB.prepare('SELECT COUNT(*) as count FROM items').first() as any)?.count || 0;
		const blogCount = (await c.env.DB.prepare('SELECT COUNT(*) as count FROM blog_posts').first() as any)?.count || 0;
		const body = `
			<h1>Админка</h1>
			${adminNavHtml()}
			<div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
				<div class="card"><div class="muted">Всего предметов</div><div style="font-size:28px;font-weight:700">${itemsCount}</div></div>
				<div class="card"><div class="muted">Всего постов</div><div style="font-size:28px;font-weight:700">${blogCount}</div></div>
			</div>
		`;
		return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
	});

	// Список коллекции с фильтрами
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
		  ${adminNavHtml()}
		  <form method="get">
			<input name="q" value="${escapeHtml(q)}" placeholder="Поиск" />
			<input name="category" value="${escapeHtml(category)}" placeholder="Категория" />
			<input name="yearFrom" value="${escapeHtml(yearFrom||'')}" placeholder="Год от" />
			<input name="yearTo" value="${escapeHtml(yearTo||'')}" placeholder="Год до" />
			<button class="btn" type="submit">Искать</button>
			<a class="btn" href="/admin/collection/new">Добавить в коллекцию</a>
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
		return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
	});

	// Create page
	app.get('/admin/collection/new', async (c) => {
		if (!requireAuth(c)) return c.redirect('/admin/login');
		const body = `
			<h1>Добавить новый предмет</h1>
			${adminNavHtml()}
			<div class="row two">
				<div class="panel">
					<h3>Основная информация</h3>
					<form onsubmit="return saveItem(event)">
						<input name="category" id="category" placeholder="Категория" list="category-list" autocomplete="off" required />
						<datalist id="category-list"></datalist>
						<input name="organization" placeholder="Организация" />
						<input name="title" placeholder="Название" required />
						<input name="description" placeholder="Краткое описание" />
						<textarea name="fullDescription" placeholder="Подробное описание"></textarea>
						<div class="row" style="grid-template-columns:1fr 1fr">
							<input name="country" placeholder="Страна" />
							<input name="size" placeholder="Размер" />
						</div>
						<div class="row" style="grid-template-columns:1fr 1fr 1fr">
							<input name="edition" placeholder="Тираж/Издание" />
							<input name="series" placeholder="Серия" />
							<input name="condition" placeholder="Состояние" />
						</div>
						<input name="year" type="number" placeholder="Год" />
						<input name="tags" placeholder="Теги, через запятую" />
						<label class="muted"><input type="checkbox" name="isFeatured" /> Показать на главной</label>
						<div style="display:flex;gap:8px">
							<a class="btn ghost" href="/admin/collection">Отмена</a>
							<button class="btn" type="submit">Создать предмет</button>
						</div>
					</form>
				</div>
				<div class="panel">
					<h3>Фотографии</h3>
					<div class="muted">Загрузка фотографий будет добавлена позже</div>
				</div>
			</div>
			<script>
			(async function(){
				try{
					const r = await fetch('/api/admin/items/stats');
					const j = await r.json();
					const list = document.getElementById('category-list');
					if(j.success && j.data && Array.isArray(j.data.categories)){
						const cats = j.data.categories.map(c=>c.category).filter(Boolean);
						cats.forEach(c=>{ const o=document.createElement('option'); o.value=c; list.appendChild(o); });
					}
				}catch(e){}
			})();
			async function saveItem(e){
				e.preventDefault();
				const fd=new FormData(e.target.closest('form'));
				const payload={
					title: fd.get('title'),
					category: fd.get('category'),
					description: fd.get('description')||'',
					fullDescription: fd.get('fullDescription')||'',
					country: fd.get('country')||'',
					organization: fd.get('organization')||'',
					size: fd.get('size')||'',
					edition: fd.get('edition')||'',
					series: fd.get('series')||'',
					condition: fd.get('condition')||'',
					year: fd.get('year')? Number(fd.get('year')): undefined,
					isFeatured: fd.get('isFeatured')==='on',
					tags: String(fd.get('tags')||'').split(',').map(s=>s.trim()).filter(Boolean)
				};
				const res=await fetch('/api/admin/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
				const json=await res.json(); if(json.success){ location.href='/admin/collection'; } else { alert(json.error||'Save failed'); }
			}
			</script>
		`;
		return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
	});

	// Edit item page
	app.get('/admin/collection/:id', async (c) => {
		if (!requireAuth(c)) return c.redirect('/admin/login');
		const id = c.req.param('id');
		const item = await c.env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(id).first();
		if (!item) return c.notFound();
		const body = `
		  <h1>Редактировать: ${escapeHtml((item as any).title)}</h1>
		  ${adminNavHtml()}
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
			const res=await fetch('/api/admin/items/${'${encodeURIComponent(id)}'}',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
			const json=await res.json(); if(json.success){ location.href='/admin/collection'; } else { alert(json.error||'Save failed'); }
		  }
		  </script>
		`;
		return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
	});

	// Blog list
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
		  ${adminNavHtml()}
		  <form method="get">
			<input name="q" value="${escapeHtml(q)}" placeholder="Поиск" />
			<input name="category" value="${escapeHtml(category)}" placeholder="Категория" />
			<select name="published"><option value="">Любые</option><option ${'${published===\'true\'?\'selected\' : \'\'}'} value="true">Опубликованные</option><option ${'${published===\'false\'?\'selected\' : \'\'}'} value="false">Черновики</option></select>
			<button class="btn" type="submit">Искать</button>
			<a class="btn" href="/admin/blog/new">Новая запись</a>
		  </form>
		  <table>
			<thead><tr><th>Название</th><th>Категория</th><th>Дата</th><th>Статус</th><th></th></tr></thead>
			<tbody>
			  ${posts.map((p:any)=>`<tr>
				<td>${escapeHtml(p.title)}</td>
				<td>${escapeHtml(p.category||'')}</td>
				<td>${escapeHtml(p.publish_date||'')}</td>
				<td>${p.published? 'Опубликован':'Черновик'}</td>
				<td><a class=\"btn\" href=\"/admin/blog/${'${encodeURIComponent(p.id)}'}\">Редактировать</a></td>
			  </tr>`).join('')}
			</tbody>
		  </table>
		`;
		return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
	});

	// Blog new
	app.get('/admin/blog/new', async (c) => {
		if (!requireAuth(c)) return c.redirect('/admin/login');
		const body = `
		  <h1>Новая запись</h1>
		  ${adminNavHtml()}
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
		return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
	});

	// Blog edit
	app.get('/admin/blog/:id', async (c) => {
		if (!requireAuth(c)) return c.redirect('/admin/login');
		const id = c.req.param('id');
		const post = await c.env.DB.prepare('SELECT * FROM blog_posts WHERE id = ?').bind(id).first();
		if (!post) return c.notFound();
		const body = `
		  <h1>Редактировать: ${escapeHtml((post as any).title)}</h1>
		  ${adminNavHtml()}
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
			const res=await fetch('/api/admin/blog/${'${encodeURIComponent(id)}'}',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
			const json=await res.json(); if(json.success){ location.href='/admin/blog'; } else { alert(json.error||'Save failed'); }
		  }
		  </script>
		`;
		return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
	});
}


