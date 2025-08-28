import type { App } from './app';
import { escapeHtml } from './html';
import { SHELL_CSS, shell } from './styles';

export function adminRoutes(app: App) {
	function adminNavHtml(): string {
		return `<div class="admin-nav">
			<div class="nav-left">
				<a class="btn secondary" href="/admin">Главная</a>
				<a class="btn secondary" href="/admin/collection">Коллекция</a>
				<a class="btn secondary" href="/admin/blog">Блог</a>
			</div>
			<div class="nav-right">
				<a href="/" target="_blank" class="btn secondary small">Открыть сайт</a>
				<a class="btn danger small" href="/admin/logout">Выйти</a>
			</div>
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
		const stats = await fetch(new URL('/api/admin/photos/storage/stats', c.req.url), { headers: { Cookie: c.req.header('Cookie')||'' } }).then(r=>r.json()).catch(()=>({ success:false })) as any;
		const usage = stats?.success ? stats.data.usagePercentage : 0;
		const totalSize = stats?.success ? stats.data.totalSizeFormatted : 'n/a';
		const body = `
			<div class="card-header">
				<h1 class="card-title">Панель управления</h1>
				<p class="card-subtitle">Управление коллекцией и блогом</p>
			</div>

			${adminNavHtml()}

			<div class="grid cols-2 mb-xl">
				<a href="/admin/collection/new" class="card" style="text-decoration: none;">
					<div class="card-body text-center">
						<div style="font-size: 48px; margin-bottom: 16px;">📦</div>
						<h3 class="card-title">Добавить предмет</h3>
						<p class="card-subtitle">Создать новый предмет коллекции</p>
						<div class="btn large mt-md">Создать предмет</div>
					</div>
				</a>
				
				<a href="/admin/blog/new" class="card" style="text-decoration: none;">
					<div class="card-body text-center">
						<div style="font-size: 48px; margin-bottom: 16px;">✍️</div>
						<h3 class="card-title">Добавить пост</h3>
						<p class="card-subtitle">Создать новую запись в блоге</p>
						<div class="btn large mt-md">Создать пост</div>
					</div>
				</a>
			</div>

			<div class="grid cols-3 mb-xl">
				<div class="card">
					<div class="card-body text-center">
						<div style="font-size: 36px; font-weight: 700; margin-bottom: 8px;">${itemsCount}</div>
						<div class="text-muted">Всего предметов</div>
						<a href="/admin/collection" class="btn secondary small mt-md">Управлять</a>
					</div>
				</div>
				
				<div class="card">
					<div class="card-body text-center">
						<div style="font-size: 36px; font-weight: 700; margin-bottom: 8px;">${blogCount}</div>
						<div class="text-muted">Всего постов</div>
						<a href="/admin/blog" class="btn secondary small mt-md">Управлять</a>
					</div>
				</div>
				
				<div class="card">
					<div class="card-body text-center">
						<div style="font-size: 36px; font-weight: 700; margin-bottom: 8px; color: ${usage > 80 ? 'var(--admin-danger)' : 'var(--admin-text)'};">${usage}%</div>
						<div class="text-muted">Хранилище фото</div>
						<div class="text-muted" style="font-size: 12px;">${escapeHtml(String(totalSize))}</div>
					</div>
				</div>
			</div>

			<div class="grid cols-2">
				<a href="/admin/collection" class="btn large">Управление коллекцией</a>
				<a href="/admin/blog" class="btn secondary large">Управление блогом</a>
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

		// Получаем фотографии для каждого предмета
		const itemsWithPhotos = await Promise.all(items.map(async (item: any) => {
			const photosRes = await c.env.DB.prepare(`
			  SELECT thumbnail_path FROM photos WHERE item_id = ? AND status = 'active' ORDER BY sort_order ASC, created_at ASC LIMIT 1
			`).bind(item.id).all();
			
			const photos = photosRes.results || [];
			const thumbnailPhoto = photos.length > 0 ? photos[0] : null;
			const thumbnailUrl = thumbnailPhoto ? `/api/photos/r2/thumbnail/${(thumbnailPhoto as any).thumbnail_path.split('/').pop()}` : null;
			
			return { ...item, thumbnailUrl };
		}));

				const body = `
		  <div class="card-header">
			<div style="display: flex; justify-content: space-between; align-items: center;">
			  <div>
				<h1 class="card-title">Управление коллекцией</h1>
				<p class="card-subtitle">Всего предметов: ${itemsWithPhotos.length}</p>
			  </div>
			  <a class="btn large" href="/admin/collection/new">+ Добавить предмет</a>
			</div>
		  </div>

		  ${adminNavHtml()}
		  
		  <div class="card mb-lg">
			<div class="card-header">
			  <h3 class="card-title">Поиск и фильтры</h3>
			</div>
			<div class="card-body">
			  <form method="get" class="search-form">
				<div class="form-group">
				  <label class="form-label">Поиск</label>
				  <input name="q" value="${escapeHtml(q)}" placeholder="Название или описание..." class="form-input" />
				</div>
				<div class="form-group">
				  <label class="form-label">Категория</label>
				  <input name="category" value="${escapeHtml(category)}" placeholder="Категория" class="form-input" />
				</div>
				<div class="form-group">
				  <label class="form-label">Год от</label>
				  <input name="yearFrom" type="number" value="${escapeHtml(yearFrom||'')}" placeholder="1900" class="form-input" />
				</div>
				<div class="form-group">
				  <label class="form-label">Год до</label>
				  <input name="yearTo" type="number" value="${escapeHtml(yearTo||'')}" placeholder="2024" class="form-input" />
				</div>
				<div class="form-group" style="display: flex; gap: 8px;">
				  <button class="btn" type="submit">Найти</button>
				  <a class="btn secondary" href="/admin/collection">Сбросить</a>
				</div>
			  </form>
			</div>
		  </div>
		  
		  <div class="table-wrapper">
			<table>
			  <thead>
				<tr>
				  <th style="width: 80px;">Фото</th>
				  <th>Название</th>
				  <th>Категория</th>
				  <th>Год</th>
				  <th style="text-align: center;">Действия</th>
				</tr>
			  </thead>
			  <tbody>
				${itemsWithPhotos.length === 0 ? `
				  <tr>
					<td colspan="5" class="text-center" style="padding: 48px;">
					  <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
					  <p class="mb-md">Предметов пока нет</p>
					  <a class="btn" href="/admin/collection/new">Добавить первый предмет</a>
					</td>
				  </tr>
				` : itemsWithPhotos.map((i:any)=>`
				  <tr>
					<td>
					  ${i.thumbnailUrl ? `
						<img src="${i.thumbnailUrl}" alt="${escapeHtml(i.title)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid var(--admin-border);" />
					  ` : `
						<div style="width: 60px; height: 60px; background: var(--admin-bg); border: 1px solid var(--admin-border); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--admin-text-muted); font-size: 24px;">📷</div>
					  `}
					</td>
					<td><strong>${escapeHtml(i.title)}</strong></td>
					<td class="text-muted">${escapeHtml(i.category||'—')}</td>
					<td class="text-muted">${i.year??'—'}</td>
					<td class="text-center">
					  <a class="btn secondary small" href="/admin/collection/${encodeURIComponent(i.id)}">Редактировать</a>
					</td>
				  </tr>
				`).join('')}
			  </tbody>
			</table>
		  </div>
		`;
		return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
	});

	// Create page
	app.get('/admin/collection/new', async (c) => {
		if (!requireAuth(c)) return c.redirect('/admin/login');
		const body = `
			<div class="card-header">
				<div style="display: flex; justify-content: space-between; align-items: center;">
					<div>
						<h1 class="card-title">Добавить новый предмет</h1>
						<p class="card-subtitle">Создание нового предмета коллекции</p>
					</div>
					<a class="btn secondary" href="/admin/collection">← Назад к списку</a>
				</div>
			</div>

			${adminNavHtml()}

			<div class="grid cols-2">
				<!-- Основная информация -->
				<div class="card">
					<div class="card-header">
						<h3 class="card-title">📝 Основная информация</h3>
						<p class="card-subtitle">Заполните основные данные о предмете</p>
					</div>
					<div class="card-body">
						<form id="itemForm" onsubmit="return saveItem(event)">
							<div class="form-group">
								<label class="form-label">Категория *</label>
								<input name="category" id="category" placeholder="Введите категорию" list="category-list" autocomplete="off" required class="form-input" />
								<datalist id="category-list"></datalist>
							</div>
							
							<div class="form-group">
								<label class="form-label">Организация</label>
								<input name="organization" placeholder="Название организации" class="form-input" />
							</div>
							
							<div class="form-group">
								<label class="form-label">Название *</label>
								<input name="title" id="titleInput" placeholder="Название предмета" required class="form-input" />
							</div>
							
							<div class="form-group">
								<label class="form-label">Краткое описание</label>
								<input name="description" placeholder="Краткое описание в одну строку" class="form-input" />
							</div>
							
							<div class="form-group">
								<label class="form-label">Подробное описание</label>
								<textarea name="fullDescription" placeholder="Детальное описание предмета, его истории, особенностей..." class="form-input" rows="4"></textarea>
							</div>

							<div class="grid cols-2">
								<div class="form-group">
									<label class="form-label">Страна</label>
									<input name="country" placeholder="Страна происхождения" class="form-input" />
								</div>
								<div class="form-group">
									<label class="form-label">Размер</label>
									<input name="size" placeholder="Размеры предмета" class="form-input" />
								</div>
							</div>

							<div class="grid cols-3">
								<div class="form-group">
									<label class="form-label">Тираж/Издание</label>
									<input name="edition" placeholder="Тираж" class="form-input" />
								</div>
								<div class="form-group">
									<label class="form-label">Серия</label>
									<input name="series" placeholder="Серия" class="form-input" />
								</div>
								<div class="form-group">
									<label class="form-label">Состояние</label>
									<input name="condition" placeholder="Состояние" class="form-input" />
								</div>
							</div>

							<div class="form-group">
								<label class="form-label">Год</label>
								<input name="year" type="number" placeholder="Год создания/выпуска" class="form-input" />
							</div>
							
							<div class="form-group">
								<label class="form-label">Теги</label>
								<input name="tags" placeholder="Теги через запятую (например: винтаж, редкость, коллекционное)" class="form-input" />
							</div>
							
							<div class="form-group">
								<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
									<input type="checkbox" name="isFeatured" />
									<span class="form-label" style="margin: 0;">Показать на главной странице</span>
								</label>
							</div>

							<div style="display: flex; gap: 12px; margin-top: 24px;">
								<a class="btn secondary" href="/admin/collection">Отмена</a>
								<button id="saveBtn" class="btn" type="submit" disabled>Создать предмет</button>
							</div>
						</form>
					</div>
				</div>

				<!-- Фотографии -->
				<div class="card">
					<div class="card-header">
						<h3 class="card-title">📷 Фотографии</h3>
						<p class="card-subtitle">Загрузите изображения предмета</p>
					</div>
					<div class="card-body">
						<div id="dropzone" style="
							border: 2px dashed var(--admin-border); 
							border-radius: var(--admin-radius);
							padding: 32px; 
							text-align: center;
							background: var(--admin-bg);
							transition: all 0.2s ease;
							cursor: pointer;
						">
							<div style="font-size: 48px; margin-bottom: 16px;">📁</div>
							<p style="margin: 0 0 8px 0; font-weight: 500;">Перетащите файлы сюда</p>
							<p class="text-muted" style="margin: 0 0 16px 0;">или</p>
							<label class="btn secondary" style="cursor: pointer;">
								Выбрать файлы
								<input id="fileInput" type="file" multiple accept="image/*" style="display: none;" />
							</label>
						</div>
						
						<div class="text-muted mt-md" style="font-size: 13px; text-align: center;">
							<strong>Требования:</strong> максимум 25 МБ на файл<br/>
							Будут созданы версии: 1920px (JPG 80%) и превью 400px
						</div>
						
						<div id="progress" class="text-muted mt-sm"></div>
						
						<div id="queueList" class="grid auto mt-md" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));"></div>
					</div>
				</div>
			</div>
			<script>
			const SESSION_ID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { const r = Math.random() * 16 | 0; const v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); });
			let queue = [];
			let uploading = 0;
			const drop = document.getElementById('dropzone');
			const input = document.getElementById('fileInput');
			const saveBtn = document.getElementById('saveBtn');
			const progress = document.getElementById('progress');
			const titleInput = document.getElementById('titleInput');
			const queueList = document.getElementById('queueList');

			;['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,(e)=>{
				e.preventDefault(); 
				drop.style.borderColor='var(--admin-primary)'; 
				drop.style.backgroundColor='var(--admin-bg)';
			}))
			;['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,(e)=>{
				e.preventDefault(); 
				drop.style.borderColor='var(--admin-border)'; 
				drop.style.backgroundColor='var(--admin-bg)';
			}))
			drop.addEventListener('drop', (e)=>{ 
				const files = Array.from(e.dataTransfer.files||[]).filter(f=>f.type.startsWith('image/')); 
				addToQueue(files); 
			});
			input.addEventListener('change', ()=>{ const files = Array.from(input.files||[]); addToQueue(files); input.value=''; });
			
			// Клик по зоне загрузки для выбора файлов
			drop.addEventListener('click', (e) => {
				if (e.target === input) return; // Не срабатывать если кликнули прямо на input
				input.click();
			});

			function addToQueue(files){ queue.push(...files); renderQueue(); startUploads(); }
			function renderQueue(){
				queueList.innerHTML='';
				queue.forEach((f,i)=>{
					const el=document.createElement('div');
					el.className='card';
					el.style.padding = '12px';
					el.innerHTML = \`
						<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
							<div style="font-size: 20px;">📷</div>
							<div style="flex: 1; min-width: 0;">
								<div style="font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">\${f.name}</div>
								<div class="text-muted" style="font-size: 11px;">\${(f.size/1024/1024).toFixed(1)} МБ</div>
							</div>
						</div>
						<div id="bar_\${i}" style="height:6px;background:var(--admin-border);border-radius:var(--admin-radius);overflow:hidden;">
							<div style="height:100%;width:0;background:var(--admin-success);transition:width 0.3s ease;"></div>
						</div>
					\`;
					queueList.appendChild(el);
				});
			}

			function setProgress(i, pct){ const bar = document.querySelector(\`#bar_\${i} div\`); if(bar) bar.style.width = pct+'%'; }
			function updateUI(){ progress.textContent = uploading>0? ('Загрузка... файлов: '+uploading) : (queue.length? 'Ожидание загрузки' : ''); saveBtn.disabled = uploading>0; }

			async function startUploads(){
				while(queue.length){
					const idx = 0; const file = queue.shift(); uploading++; updateUI();
					try{
						const {compressed, thumbnail, width, height} = await processImage(file);
						const fd = new FormData();
						fd.append('sessionId', SESSION_ID);
						fd.append('original', file, file.name);
						fd.append('compressed', compressed, replaceExt(file.name,'jpg'));
						fd.append('thumbnail', thumbnail, replaceExt(file.name,'jpg'));
						fd.append('width', String(width)); fd.append('height', String(height));
						fd.append('alt', titleInput.value||'');
						const res = await fetch('/api/admin/photos/v2/upload',{ method:'POST', body: fd });
						if(!res.ok){ 
							const errorText = await res.text();
							console.error('Upload failed:', res.status, errorText);
							throw new Error('upload failed: ' + (res.status || 'unknown error')); 
						}
						setProgress(idx, 100);
					}catch(e){ 
						console.error('Upload error:', e);
						alert('Ошибка загрузки: '+(e.message||e)); 
					}
					finally{ uploading--; updateUI(); }
				}
			}

			function replaceExt(name, ext){ return name.replace(/\.[^/.]+$/, '') + '.' + ext; }
			function fitSize(w,h,max){ const ratio = Math.max(w,h)/max; return ratio>1? {w:Math.round(w/ratio), h:Math.round(h/ratio)} : {w,h}; }
			async function processImage(file){
				const img = await readImage(file);
				const dim1920 = fitSize(img.width, img.height, 1920);
				const dim400 = fitSize(img.width, img.height, 400);
				const compressed = await canvasToJpeg(img, dim1920.w, dim1920.h, 0.8);
				const thumbnail = await canvasToJpeg(img, dim400.w, dim400.h, 0.8);
				return { compressed, thumbnail, width: img.width, height: img.height };
			}
			function readImage(file){
				return new Promise((resolve,reject)=>{
					const fr = new FileReader();
					fr.onload = ()=>{ const img = new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=fr.result; };
					fr.onerror = reject; fr.readAsDataURL(file);
				});
			}
			function canvasToJpeg(img,w,h,quality){
				const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,w,h);
				return new Promise(resolve=>{ canvas.toBlob(b=> resolve(new File([b], 'image.jpg', { type:'image/jpeg' })), 'image/jpeg', quality); });
			}

			(async function init(){
				try{
					const r = await fetch('/api/admin/items/stats'); const j = await r.json();
					const list = document.getElementById('category-list');
					if(j.success && j.data && Array.isArray(j.data.categories)){
						const cats = j.data.categories.map(c=>c.category).filter(Boolean);
						cats.forEach(c=>{ const o=document.createElement('option'); o.value=c; list.appendChild(o); });
					}
				}catch(e){}
				updateUI();
			})();

			async function saveItem(e){
				e.preventDefault(); if(uploading>0){ return; }
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
				const json=await res.json(); if(json.success){
					await fetch('/api/admin/photos/v2/attach-to-item',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sessionId: SESSION_ID, itemId: json.data.id }) });
					location.href='/admin/collection';
				} else { alert(json.error||'Save failed'); }
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
		  <div class="row two" style="margin-top:16px">
			<div class="panel">
				<h3>Фотографии предмета</h3>
				<div id="photos-list" class="grid" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;"></div>
				<div style="margin-top:12px; display:flex; gap:8px">
					<button class="btn" onclick="saveOrder()">Сохранить порядок</button>
					<button class="btn ghost" onclick="reloadPhotos()">Обновить список</button>
				</div>
			</div>
			<div class="panel">
				<h3>Загрузка фотографий</h3>
				<div id="dropzone" style="border:2px dashed #ccc; padding:16px; text-align:center">Перетащите файлы сюда или <input id="fileInput" type="file" multiple accept="image/*" /></div>
				<div class="muted" style="margin-top:8px">Оригинал ≤25 МБ. Будут созданы версии: 1920px JPG 80% и превью 400px.</div>
				<div style="margin-top:12px; display:flex; gap:8px">
					<button class="btn" onclick="uploadQueued()">Загрузить выбранные</button>
					<div id="uploadStatus" class="muted"></div>
				</div>
			</div>
		  </div>
		  <script>
		  // Сохранение предмета - обновленная версия для новой формы
		  async function updateItem(e){
			e.preventDefault();
			
			const formData = new FormData(e.target);
			const payload = {
			  title: formData.get('title'),
			  category: formData.get('category'),
			  organization: formData.get('organization') || '',
			  description: formData.get('description') || '',
			  fullDescription: formData.get('fullDescription') || '',
			  country: formData.get('country') || '',
			  size: formData.get('size') || '',
			  edition: formData.get('edition') || '',
			  series: formData.get('series') || '',
			  condition: formData.get('condition') || '',
			  value: formData.get('value') || '',
			  acquisition: formData.get('acquisition') || '',
			  year: formData.get('year') ? Number(formData.get('year')) : null,
			  isFeatured: formData.get('isFeatured') === 'on',
			  tags: String(formData.get('tags') || '').split(',').map(s => s.trim()).filter(Boolean)
			};
			
			try{
			  console.log('Updating item:', '${id}', payload);
			  const res = await fetch('/api/admin/items/${encodeURIComponent(id)}', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			  });
			  
			  const json = await res.json();
			  if(json.success){
				alert('Предмет успешно обновлен!');
				location.href = '/admin/collection';
			  } else {
				alert('Ошибка сохранения: ' + (json.error || 'Unknown'));
				console.error('Update error:', json);
			  }
			}catch(error){
			  alert('Ошибка сохранения: ' + error.message);
			  console.error('Update error:', error);
			}
		  }

		  const ITEM_ID = ${JSON.stringify(String(id))};
		  const ITEM_TITLE = ${JSON.stringify(String((item as any).title||''))};
		  let currentPhotos = [];
		  let queue = [];

		  async function loadPhotos(){
			const r = await fetch('/api/admin/photos/item/'+encodeURIComponent(ITEM_ID));
			const j = await r.json();
			if(j.success){ currentPhotos = j.data||[]; renderPhotos(); }
		  }
		  function renderPhotos(){
			const root = document.getElementById('photos-list');
			root.innerHTML = '';
			currentPhotos.forEach((p, idx) => {
			  const el = document.createElement('div');
			  el.className = 'card';
			  el.innerHTML = \`
				<div style="display:flex; gap:8px; align-items:center">
				  <img src="\${p.thumbnailUrl||p.url}" alt="" style="width:80px;height:80px;object-fit:cover;border-radius:6px"/>
				  <div style="flex:1">
				    <input data-id="\${p.id}" data-field="alt" placeholder="alt" value="\${p.alt||''}" />
				    <input data-id="\${p.id}" data-field="caption" placeholder="caption" value="\${p.caption||''}" />
				    <div class="muted" style="font-size:12px;word-break:break-all">\${p.filename||''}</div>
				  </div>
				</div>
				<div style="display:flex; gap:6px; margin-top:8px">
				  <button class="btn ghost" onclick="moveUp(\${idx})">↑</button>
				  <button class="btn ghost" onclick="moveDown(\${idx})">↓</button>
				  <button class="btn" onclick="saveMeta('\${p.id}')">Сохранить</button>
				  <button class="btn danger" onclick="removePhoto('\${p.id}')">Удалить</button>
				</div>
			  \`;
			  root.appendChild(el);
			});
		  }
		  function moveUp(i){ if(i<=0) return; const t=currentPhotos[i-1]; currentPhotos[i-1]=currentPhotos[i]; currentPhotos[i]=t; renderPhotos(); }
		  function moveDown(i){ if(i>=currentPhotos.length-1) return; const t=currentPhotos[i+1]; currentPhotos[i+1]=currentPhotos[i]; currentPhotos[i]=t; renderPhotos(); }
		  async function saveOrder(){
			const ids = currentPhotos.map(p=>p.id);
			await fetch('/api/admin/photos/item/'+encodeURIComponent(ITEM_ID)+'/reorder',{method:'PUT',headers:{'Content-Type':'application/json'},body: JSON.stringify({ photoIds: ids })});
			alert('Порядок сохранён');
		  }
		  async function saveMeta(id){
			const inputs = Array.from(document.querySelectorAll(\`[data-id="\${id}"]\`));
			const alt = inputs.find(i=>i.getAttribute('data-field')==='alt')?.value||'';
			const caption = inputs.find(i=>i.getAttribute('data-field')==='caption')?.value||'';
			await fetch('/api/admin/photos/'+encodeURIComponent(id),{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ alt, caption })});
			alert('Сохранено');
		  }
		  async function removePhoto(id){
			if(!confirm('Удалить фото? Сжатые версии будут удалены, оригинал сохранится для экспорта.')) return;
			await fetch('/api/admin/photos/'+encodeURIComponent(id),{ method:'DELETE' });
			await loadPhotos();
		  }
		  function reloadPhotos(){ loadPhotos(); }

		  // Uploader with client-side processing
		  const drop = document.getElementById('dropzone');
		  const input = document.getElementById('fileInput');
		  const statusEl = document.getElementById('uploadStatus');
		  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,(e)=>{e.preventDefault(); drop.style.background='#f8f8f8';}));
		  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,(e)=>{e.preventDefault(); drop.style.background='';}));
		  drop.addEventListener('drop', async (e)=>{ const files = Array.from(e.dataTransfer.files||[]).filter(f=>f.type.startsWith('image/')); queue.push(...files); statusEl.textContent = 'В очереди файлов: '+queue.length; });
		  input.addEventListener('change', ()=>{ const files = Array.from(input.files||[]); queue.push(...files); input.value=''; statusEl.textContent = 'В очереди файлов: '+queue.length; });

		  async function uploadQueued(){
			if(queue.length===0){ alert('Нет файлов'); return; }
			statusEl.textContent = 'Обработка изображений...';
			
			// Загружаем файлы по одному через новый photos API
			for(let i = 0; i < queue.length; i++){
			  const file = queue[i];
			  statusEl.textContent = \`Загрузка \${i+1}/\${queue.length}: \${file.name}\`;
			  
			  try {
				const {compressed, thumbnail, width, height} = await processImage(file);
				
				const formData = new FormData();
				formData.append('compressed', compressed);
				formData.append('thumbnail', thumbnail);
				formData.append('filename', file.name);
				formData.append('width', String(width));
				formData.append('height', String(height));
				
				const res = await fetch('/api/admin/photos/item/'+encodeURIComponent(ITEM_ID)+'/upload', {
				  method: 'POST',
				  body: formData
				});
				
				const json = await res.json();
				if(!json.success){
				  throw new Error(json.error || 'Upload failed');
				}
			  } catch(error) {
				console.error('Upload error:', error);
				alert(\`Ошибка загрузки \${file.name}: \${error.message}\`);
			  }
			}
			
			queue = [];
			statusEl.textContent = 'Готово';
			await loadPhotos();
		  }

		  function replaceExt(name, ext){ return name.replace(/\.[^/.]+$/, '') + '.' + ext; }
		  function fitSize(w,h,max){ const ratio = Math.max(w,h)/max; return ratio>1? {w:Math.round(w/ratio), h:Math.round(h/ratio)} : {w,h}; }
		  async function processImage(file){
			const img = await readImage(file);
			const dim1920 = fitSize(img.width, img.height, 1920);
			const dim400 = fitSize(img.width, img.height, 400);
			const compressed = await canvasToJpeg(img, dim1920.w, dim1920.h, 0.8);
			const thumbnail = await canvasToJpeg(img, dim400.w, dim400.h, 0.8);
			return { compressed, thumbnail, width: img.width, height: img.height };
		  }
		  function readImage(file){
			return new Promise((resolve,reject)=>{
			  const fr = new FileReader();
			  fr.onload = ()=>{
				const img = new Image();
				img.onload = ()=> resolve(img);
				img.onerror = reject;
				img.src = fr.result;
			  };
			  fr.onerror = reject;
			  fr.readAsDataURL(file);
			});
		  }
		  function canvasToJpeg(img,w,h,quality){
			const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h;
			const ctx = canvas.getContext('2d'); ctx.drawImage(img,0,0,w,h);
			return new Promise(resolve=>{ canvas.toBlob(b=> resolve(new File([b], 'image.jpg', { type:'image/jpeg' })), 'image/jpeg', quality); });
		  }

		  loadPhotos();
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
		  <div class="card-header">
			<div style="display: flex; justify-content: space-between; align-items: center;">
			  <div>
				<h1 class="card-title">Управление блогом</h1>
				<p class="card-subtitle">Всего записей: ${posts.length}</p>
			  </div>
			  <a class="btn large" href="/admin/blog/new">+ Новая запись</a>
			</div>
		  </div>

		  ${adminNavHtml()}
		  
		  <div class="card mb-lg">
			<div class="card-header">
			  <h3 class="card-title">Поиск и фильтры</h3>
			</div>
			<div class="card-body">
			  <form method="get" class="search-form">
				<div class="form-group">
				  <label class="form-label">Поиск</label>
				  <input name="q" value="${escapeHtml(q)}" placeholder="Заголовок или содержание..." class="form-input" />
				</div>
				<div class="form-group">
				  <label class="form-label">Категория</label>
				  <input name="category" value="${escapeHtml(category)}" placeholder="Категория" class="form-input" />
				</div>
				<div class="form-group">
				  <label class="form-label">Статус</label>
				  <select name="published" class="form-input">
					<option value="">Любые</option>
					<option ${published==='true'?'selected' : ''} value="true">Опубликованные</option>
					<option ${published==='false'?'selected' : ''} value="false">Черновики</option>
				  </select>
				</div>
				<div class="form-group" style="display: flex; gap: 8px;">
				  <button class="btn" type="submit">Найти</button>
				  <a class="btn secondary" href="/admin/blog">Сбросить</a>
				</div>
			  </form>
			</div>
		  </div>
		  
		  <div class="table-wrapper">
			<table>
			  <thead>
				<tr>
				  <th>Название</th>
				  <th>Категория</th>
				  <th>Дата</th>
				  <th>Статус</th>
				  <th style="text-align: center;">Действия</th>
				</tr>
			  </thead>
			  <tbody>
				${posts.length === 0 ? `
				  <tr>
					<td colspan="5" class="text-center" style="padding: 48px;">
					  <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
					  <p class="mb-md">Записей пока нет</p>
					  <a class="btn" href="/admin/blog/new">Создать первую запись</a>
					</td>
				  </tr>
				` : posts.map((p:any)=>`
				  <tr>
					<td><strong>${escapeHtml(p.title)}</strong></td>
					<td class="text-muted">${escapeHtml(p.category||'—')}</td>
					<td class="text-muted">${escapeHtml(p.publish_date||'—')}</td>
					<td>
					  <span class="badge ${p.published ? 'success' : 'warning'}">
						${p.published ? 'Опубликован' : 'Черновик'}
					  </span>
					</td>
					<td class="text-center">
					  <a class="btn secondary small" href="/admin/blog/${encodeURIComponent(p.id)}">Редактировать</a>
					</td>
				  </tr>
				`).join('')}
			  </tbody>
			</table>
		  </div>
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
			const res=await fetch('/api/admin/blog/'+encodeURIComponent('${id}'),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
			const json=await res.json(); if(json.success){ location.href='/admin/blog'; } else { alert(json.error||'Save failed'); }
		  }
		  </script>
		`;
		return c.html(`<style>${SHELL_CSS}</style>${shell(body)}`);
	});
}


