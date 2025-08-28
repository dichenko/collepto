export const GLOBAL_CSS = `
:root {
  --font-size: 14px;
  --background: #ffffff;
  --foreground: oklch(0.145 0 0);
  --card: #ffffff;
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: #030213;
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.95 0.0058 264.53);
  --secondary-foreground: #030213;
  --muted: #f8f9fa;
  --muted-foreground: #6b7280;
  --accent: #e9ebef;
  --accent-foreground: #030213;
  --destructive: #d4183d;
  --destructive-foreground: #ffffff;
  --border: rgba(0, 0, 0, 0.06);
  --input: transparent;
  --input-background: #f8f9fa;
  --switch-background: #cbced4;
  --font-weight-medium: 500;
  --font-weight-normal: 400;
  --ring: oklch(0.708 0 0);
  --radius: 0.5rem;
  
  /* Дополнительные переменные для публичных страниц */
  --text: var(--foreground);
  --text-secondary: var(--muted-foreground);
  --surface: var(--card);
  --radius-lg: calc(var(--radius) + 4px);
}

html { 
  font-size: var(--font-size);
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;
}

body { 
  background: var(--background); 
  color: var(--foreground);
  margin: 0;
  line-height: 1.5;
}

/* Base typography */
h1 {
  font-size: 2rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
  margin: 0 0 1rem 0;
}

h2 {
  font-size: 1.5rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.4;
  margin: 0 0 0.75rem 0;
}

h3 {
  font-size: 1.25rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.4;
  margin: 0 0 0.5rem 0;
}

p {
  font-size: 1rem;
  font-weight: var(--font-weight-normal);
  line-height: 1.6;
  margin: 0 0 1rem 0;
}

/* Refined card styles for better visual appearance */
.card-refined {
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease-in-out;
  border-radius: calc(var(--radius) + 2px);
  background: var(--card);
  color: var(--card-foreground);
}

.card-refined:hover {
  border-color: rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

/* Refined button styles */
.btn-refined {
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.15s ease-in-out;
  border-radius: var(--radius);
  font-weight: var(--font-weight-medium);
}

.btn-refined:hover {
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

/* Refined badge styles for tags */
.badge-refined {
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.15s ease-in-out;
  font-weight: 400;
  border-radius: calc(var(--radius) - 2px);
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.badge-refined:hover {
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transform: scale(1.02);
}

/* Focus and interaction states */
.focus-ring {
  outline: none;
  border-color: var(--ring);
  box-shadow: 0 0 0 3px rgba(var(--ring), 0.2);
}

/* Utility classes */
.text-muted {
  color: var(--muted-foreground);
}

.bg-muted {
  background-color: var(--muted);
}

.border-border {
  border-color: var(--border);
}

/* Base card and chip styles for public pages */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  overflow: hidden;
  display: block;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
  border-color: rgba(0, 0, 0, 0.12);
}

.card-body {
  padding: 20px;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  background: var(--accent);
  color: var(--accent-foreground);
  border-radius: calc(var(--radius) - 2px);
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid var(--border);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--primary);
  color: var(--primary-foreground);
  border: none;
  border-radius: var(--radius);
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  font-size: 14px;
}

.btn:hover {
  background: var(--primary);
  filter: brightness(0.95);
  transform: translateY(-1px);
}

.btn.ghost {
  background: transparent;
  color: var(--foreground);
  border: 1px solid var(--border);
}

.btn.ghost:hover {
  background: var(--accent);
  border-color: var(--border);
  color: var(--foreground);
}

.grid {
  display: grid;
  gap: 24px;
}

.muted {
  color: var(--muted-foreground);
}
`;


