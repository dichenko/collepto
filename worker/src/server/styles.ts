import { GLOBAL_CSS } from '../styles';

export const SHELL_CSS = `
${GLOBAL_CSS}
:root{--bg:#f6f7fb;--card:#fff;--muted:#6b7280;--text:#111827;--primary:#111827;--primary-2:#1f2937;--brand:#111827;--line:#e5e7eb;--chip:#111827;--chip-bg:#f1f5f9}
*{box-sizing:border-box}
body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;margin:0;color:var(--text);background:var(--bg)}
.shell{background:#fff;border-bottom:1px solid var(--line)}
.topbar{max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:16px;padding:12px 16px}
.brand{font-weight:700;color:var(--brand)}
.topnav{margin-left:auto;display:flex;gap:8px}
.navbtn{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--text);text-decoration:none}
.navbtn.active{background:var(--text);color:#fff;border-color:var(--text)}
.container{max-width:1200px;margin:0 auto;padding:20px}
.grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.card{border:1px solid var(--line);border-radius:14px;background:var(--card);overflow:hidden}
.card-body{padding:14px}
.muted{color:var(--muted);font-size:12px}
.title{font-weight:600;margin:6px 0}
a{color:#0f172a;text-decoration:none}
a:hover{text-decoration:underline}
img.thumb{width:100%;height:180px;object-fit:cover}
.btn{display:inline-block;background:var(--text);color:#fff;border-radius:10px;padding:8px 12px;text-decoration:none}
.btn:hover{background:var(--primary-2)}
.btn.ghost{background:#fff;color:var(--text);border:1px solid var(--line)}
form{display:grid;gap:10px}
input,select,textarea{padding:10px;border:1px solid var(--line);border-radius:10px;background:#fff}
textarea{min-height:120px}
.row{display:grid;gap:20px}
.row.two{grid-template-columns:1.3fr 1fr}
.panel{border:1px solid var(--line);border-radius:14px;background:#fff;padding:14px}
.panel h3{margin:0 0 10px 0}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{border-bottom:1px solid var(--line);padding:10px;text-align:left}
.admin-nav{display:flex;gap:8px;margin:8px 0 16px}
.chip{display:inline-block;font-size:11px;padding:4px 8px;border-radius:999px;background:var(--chip-bg);color:var(--chip)}
`;

export function shell(body: string): string {
  return `
  <div class="shell">
    <div class="topbar">
      <div class="brand">Моя коллекция</div>
      <div class="topnav">
        <a class="navbtn" href="/items">Коллекция</a>
        <a class="navbtn" href="/blog">Блог</a>
      </div>
    </div>
  </div>
  <div class="container">${body}</div>`;
}


