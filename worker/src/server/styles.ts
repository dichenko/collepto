import { GLOBAL_CSS } from '../styles';

export const SHELL_CSS = `
${GLOBAL_CSS}

/* Clean Admin Design System */
:root {
  /* Colors */
  --admin-bg: #f8fafc;
  --admin-surface: #ffffff;
  --admin-text: #1e293b;
  --admin-text-muted: #64748b;
  --admin-text-light: #94a3b8;
  --admin-primary: #0f172a;
  --admin-primary-hover: #334155;
  --admin-success: #10b981;
  --admin-warning: #f59e0b;
  --admin-danger: #ef4444;
  --admin-border: #e2e8f0;
  --admin-border-strong: #cbd5e1;
  
  /* Spacing */
  --admin-space-xs: 4px;
  --admin-space-sm: 8px;
  --admin-space-md: 16px;
  --admin-space-lg: 24px;
  --admin-space-xl: 32px;
  --admin-space-2xl: 48px;
  
  /* Radius */
  --admin-radius: 8px;
  --admin-radius-lg: 12px;
  
  /* Shadows */
  --admin-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --admin-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
}

* {
  box-sizing: border-box;
}

/* Admin Body */
body {
  background: var(--admin-bg);
  color: var(--admin-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  margin: 0;
}

/* Layout */
.shell {
  background: var(--admin-surface);
  border-bottom: 1px solid var(--admin-border);
  box-shadow: var(--admin-shadow);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--admin-space-xl);
}

/* Navigation */
.admin-nav {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  padding: var(--admin-space-sm);
  margin-bottom: var(--admin-space-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--admin-space-sm);
}

.nav-left {
  display: flex;
  gap: var(--admin-space-xs);
}

.nav-right {
  display: flex;
  gap: var(--admin-space-xs);
  align-items: center;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--admin-space-sm);
  padding: var(--admin-space-sm) var(--admin-space-md);
  background: var(--admin-primary);
  color: white;
  border: none;
  border-radius: var(--admin-radius);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn:hover {
  background: var(--admin-primary-hover);
  color: white;
  text-decoration: none;
}

.btn.secondary {
  background: var(--admin-surface);
  color: var(--admin-text);
  border: 1px solid var(--admin-border);
}

.btn.secondary:hover {
  background: var(--admin-bg);
  color: var(--admin-text);
}

.btn.success {
  background: var(--admin-success);
}

.btn.danger {
  background: var(--admin-danger);
}

.btn.small {
  padding: var(--admin-space-xs) var(--admin-space-sm);
  font-size: 13px;
}

.btn.large {
  padding: var(--admin-space-md) var(--admin-space-lg);
  font-size: 16px;
}

/* Cards */
.card {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  box-shadow: var(--admin-shadow);
  overflow: hidden;
}

.card-header {
  padding: var(--admin-space-lg);
  border-bottom: 1px solid var(--admin-border);
  background: var(--admin-bg);
}

.card-body {
  padding: var(--admin-space-lg);
}

.card-title {
  margin: 0 0 var(--admin-space-xs) 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--admin-text);
}

.card-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--admin-text-muted);
}

/* Grid */
.grid {
  display: grid;
  gap: var(--admin-space-lg);
}

.grid.cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid.cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

.grid.auto {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

/* Tables */
.table-wrapper {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 0;
}

th {
  background: var(--admin-bg);
  color: var(--admin-text);
  font-weight: 600;
  padding: var(--admin-space-md);
  text-align: left;
  border-bottom: 1px solid var(--admin-border);
}

td {
  padding: var(--admin-space-md);
  border-bottom: 1px solid var(--admin-border);
  color: var(--admin-text);
}

tr:last-child td {
  border-bottom: none;
}

tr:hover {
  background: var(--admin-bg);
}

/* Forms */
.form-group {
  margin-bottom: var(--admin-space-md);
}

.form-label {
  display: block;
  margin-bottom: var(--admin-space-xs);
  font-weight: 500;
  color: var(--admin-text);
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: var(--admin-space-sm) var(--admin-space-md);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  font-size: 14px;
  background: var(--admin-surface);
  color: var(--admin-text);
}

.form-input:focus {
  outline: none;
  border-color: var(--admin-primary);
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
}

/* Search Form */
.search-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--admin-space-md);
  align-items: end;
}

/* Status badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--admin-space-xs);
  padding: var(--admin-space-xs) var(--admin-space-sm);
  background: var(--admin-bg);
  color: var(--admin-text-muted);
  border-radius: calc(var(--admin-radius) / 2);
  font-size: 12px;
  font-weight: 500;
}

.badge.success {
  background: #dcfce7;
  color: #166534;
}

.badge.warning {
  background: #fef3c7;
  color: #92400e;
}

.badge.danger {
  background: #fee2e2;
  color: #991b1b;
}

/* Utilities */
.text-muted {
  color: var(--admin-text-muted);
}

.text-center {
  text-align: center;
}

.mb-0 { margin-bottom: 0; }
.mb-sm { margin-bottom: var(--admin-space-sm); }
.mb-md { margin-bottom: var(--admin-space-md); }
.mb-lg { margin-bottom: var(--admin-space-lg); }
.mb-xl { margin-bottom: var(--admin-space-xl); }

.mt-0 { margin-top: 0; }
.mt-sm { margin-top: var(--admin-space-sm); }
.mt-md { margin-top: var(--admin-space-md); }
.mt-lg { margin-top: var(--admin-space-lg); }
.mt-xl { margin-top: var(--admin-space-xl); }

/* Responsive */
@media (max-width: 768px) {
  .container {
    padding: var(--admin-space-md);
  }
  
  .admin-nav {
    flex-direction: column;
    align-items: stretch;
  }
  
  .nav-left, .nav-right {
    justify-content: center;
  }
  
  .grid.cols-2,
  .grid.cols-3 {
    grid-template-columns: 1fr;
  }
  
  .search-form {
    grid-template-columns: 1fr;
  }
}


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


