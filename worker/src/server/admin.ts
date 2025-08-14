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
		const stats = await fetch(new URL('/api/admin/photos/storage/stats', c.req.url), { headers: { Cookie: c.req.header('Cookie')||'' } }).then(r=>r.json()).catch(()=>({ success:false })) as any;
		const usage = stats?.success ? stats.data.usagePercentage : 0;
		const totalSize = stats?.success ? stats.data.totalSizeFormatted : 'n/a';
		const body = `
			<h1>Админка</h1>
			${adminNavHtml()}
			<div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
				<div class="card"><div class="muted">Всего предметов</div><div style="font-size:28px;font-weight:700">${itemsCount}</div></div>
				<div class="card"><div class="muted">Всего постов</div><div style="font-size:28px;font-weight:700">${blogCount}</div></div>
				<div class="card"><div class="muted">Хранилище фото</div><div style="font-size:20px;font-weight:700">${usage}%</div><div class="muted">Использовано: ${escapeHtml(String(totalSize))}</div></div>
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
					<form id="itemForm" onsubmit="return saveItem(event)">
						<input name="category" id="category" placeholder="Категория" list="category-list" autocomplete="off" required />
						<datalist id="category-list"></datalist>
						<input name="organization" placeholder="Организация" />
						<input name="title" id="titleInput" placeholder="Название" required />
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
							<button id="saveBtn" class="btn" type="submit" disabled>Создать предмет</button>
						</div>
					</form>
				</div>
				<div class="panel">
					<h3>Фотографии</h3>
					<div id="dropzone" style="border:2px dashed #ccc; padding:16px; text-align:center">Перетащите файлы сюда или <input id="fileInput" type="file" multiple accept="image/*" /></div>
					<div class="muted" style="margin-top:8px">Оригинал ≤25 МБ. Будут созданы версии: 1920px JPG 80% и превью 400px.</div>
					<div id="progress" class="muted" style="margin-top:8px"></div>
					<div id="queueList" class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-top:8px"></div>
				</div>
			</div>
			<script>
			const TEMP_ID = crypto.randomUUID();
			let queue = [];
			let uploading = 0;
			const drop = document.getElementById('dropzone');
			const input = document.getElementById('fileInput');
			const saveBtn = document.getElementById('saveBtn');
			const progress = document.getElementById('progress');
			const titleInput = document.getElementById('titleInput');
			const queueList = document.getElementById('queueList');

			;['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,(e)=>{e.preventDefault(); drop.style.background='#f8f8f8';}))
			;['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,(e)=>{e.preventDefault(); drop.style.background='';}))
			drop.addEventListener('drop', (e)=>{ const files = Array.from(e.dataTransfer.files||[]).filter(f=>f.type.startsWith('image/')); addToQueue(files); });
			input.addEventListener('change', ()=>{ const files = Array.from(input.files||[]); addToQueue(files); input.value=''; });

			function addToQueue(files){ queue.push(...files); renderQueue(); startUploads(); }
			function renderQueue(){
				queueList.innerHTML='';
				queue.forEach((f,i)=>{
					const el=document.createElement('div');
					el.className='card';
					el.innerHTML = `<div class=muted style="font-size:12px;word-break:break-all">${'${f.name}'} (${Math.round(f.size/1024)} KB)</div><div id="bar_${'${i}'}" style="height:6px;background:#eee;border-radius:4px;overflow:hidden"><div style="height:100%;width:0;background:#4caf50"></div></div>`;
					queueList.appendChild(el);
				});
			}

			function setProgress(i, pct){ const bar = document.querySelector(`#bar_${'${i}'} div`); if(bar) bar.style.width = pct+'%'; }
			function updateUI(){ progress.textContent = uploading>0? ('Загрузка... файлов: '+uploading) : (queue.length? 'Ожидание загрузки' : ''); saveBtn.disabled = uploading>0; }

			async function startUploads(){
				while(queue.length){
					const idx = 0; const file = queue.shift(); uploading++; updateUI();
					try{
						const {compressed, thumbnail, width, height} = await processImage(file);
						const fd = new FormData();
						fd.append('tempUploadId', TEMP_ID);
						fd.append('original', file, file.name);
						fd.append('compressed', compressed, replaceExt(file.name,'jpg'));
						fd.append('thumbnail', thumbnail, replaceExt(file.name,'jpg'));
						fd.append('width', String(width)); fd.append('height', String(height));
						fd.append('alt', titleInput.value||'');
						const res = await fetch('/api/admin/photos/item/_temp/upload',{ method:'POST', body: fd });
						if(!res.ok){ throw new Error('upload failed'); }
						setProgress(idx, 100);
					}catch(e){ alert('Ошибка загрузки: '+(e.message||e)); }
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
					await fetch('/api/admin/photos/bind-temp',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tempUploadId: TEMP_ID, itemId: json.data.id }) });
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
			  el.innerHTML = `
				<div style="display:flex; gap:8px; align-items:center">
				  <img src="${'${p.thumbnailUrl||p.url}'}" alt="" style="width:80px;height:80px;object-fit:cover;border-radius:6px"/>
				  <div style="flex:1">
				    <input data-id="${'${p.id}'}" data-field="alt" placeholder="alt" value="${'${p.alt||""}'}" />
				    <input data-id="${'${p.id}'}" data-field="caption" placeholder="caption" value="${'${p.caption||""}'}" />
				    <div class="muted" style="font-size:12px;word-break:break-all">${'${p.filename||""}'}</div>
				  </div>
				</div>
				<div style="display:flex; gap:6px; margin-top:8px">
				  <button class="btn ghost" onclick="moveUp(${idx})">↑</button>
				  <button class="btn ghost" onclick="moveDown(${idx})">↓</button>
				  <button class="btn" onclick="saveMeta('${'${p.id}'}')">Сохранить</button>
				  <button class="btn danger" onclick="removePhoto('${'${p.id}'}')">Удалить</button>
				</div>
			  `;
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
			const inputs = Array.from(document.querySelectorAll(`[data-id="${'${id}'}"]`));
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
		  ;['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,(e)=>{e.preventDefault(); drop.style.background='#f8f8f8';}))
		  ;['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,(e)=>{e.preventDefault(); drop.style.background='';}))
		  drop.addEventListener('drop', async (e)=>{ const files = Array.from(e.dataTransfer.files||[]).filter(f=>f.type.startsWith('image/')); queue.push(...files); statusEl.textContent = 'В очереди файлов: '+queue.length; });
		  input.addEventListener('change', ()=>{ const files = Array.from(input.files||[]); queue.push(...files); input.value=''; statusEl.textContent = 'В очереди файлов: '+queue.length; });

		  async function uploadQueued(){
			if(queue.length===0){ alert('Нет файлов'); return; }
			statusEl.textContent = 'Обработка изображений...';
			const form = new FormData();
			let idx=0;
			for(const file of queue){
			  const {compressed, thumbnail, width, height} = await processImage(file);
			  form.append(`photo_${idx}_original`, file, file.name);
			  form.append(`photo_${idx}_compressed`, compressed, replaceExt(file.name,'jpg'));
			  form.append(`photo_${idx}_thumbnail`, thumbnail, replaceExt(file.name,'jpg'));
			  form.append(`photo_${idx}_width`, String(width));
			  form.append(`photo_${idx}_height`, String(height));
			  form.append(`photo_${idx}_filename`, file.name);
			  form.append(`photo_${idx}_alt`, ITEM_TITLE);
			  idx++;
			}
			statusEl.textContent = 'Загрузка...';
			const res = await fetch('/api/admin/photos/item/'+encodeURIComponent(ITEM_ID)+'/upload-multiple',{ method:'POST', body: form });
			const j = await res.json();
			if(!j.success){ alert('Загружено с ошибками'); }
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


