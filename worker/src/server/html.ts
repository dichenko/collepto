export const escapeHtml = (s: string): string =>
	s.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

export function pageLayout(title: string, inlineStyles: string, body: string): string {
	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="/favicon.svg" />
  <style>${inlineStyles}</style>
</head>
<body>${body}</body>
</html>`;
}


