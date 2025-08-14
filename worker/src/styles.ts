export const GLOBAL_CSS = `
:root {
  --font-size: 14px;
  --background: #ffffff;
  --foreground: #111827;
  --card: #ffffff;
  --muted: #f8f9fa;
  --muted-foreground: #6b7280;
  --primary: #111827;
  --border: rgba(0, 0, 0, 0.06);
}

html { font-size: var(--font-size); }
body { background: var(--background); color: var(--foreground); }

/* Refined card styles */
.card-refined {
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease-in-out;
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
}
.btn-refined:hover {
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

/* Refined badge styles */
.badge-refined {
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.15s ease-in-out;
  font-weight: 400;
}
.badge-refined:hover {
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transform: scale(1.02);
}
`;


