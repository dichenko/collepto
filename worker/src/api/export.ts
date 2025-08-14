import { Hono } from 'hono';
import type { Env } from '../types';
import { DatabaseQueries } from '../db/queries';
import JSZip from 'jszip';

const router = new Hono<{ Bindings: Env }>();

// GET export collection as CSV + photo archive (metadata)
router.get('/', async (c) => {
  try {
    const db = new DatabaseQueries(c.env);
    
    // Get all data
    const items = await db.getAllItems();
    const posts = await db.getAllBlogPosts();
    
    // Get all photos for all items (including deleted)
    let totalPhotos = 0;
    for (const item of items) {
      const photos = await db.getPhotosByItemIdIncludingDeleted(item.id);
      totalPhotos += photos.length;
    }

    return c.json({
      success: true,
      data: {
        totalItems: items.length,
        totalPosts: posts.length,
        totalPhotos,
        exportUrl: '/api/admin/export/download'
      }
    });
    
  } catch (error) {
    console.error('Export error:', error);
    return c.json({ success: false, error: 'Failed to prepare export' }, 500);
  }
});

// GET download complete export (CSV + photo archive)
router.get('/download', async (c) => {
  try {
    const db = new DatabaseQueries(c.env);
    
    // Get all data
    const items = await db.getAllItems();
    const posts = await db.getAllBlogPosts();

    // CSV content
    const itemsCsv = await generateItemsCsv(items, db);
    const postsCsv = await generatePostsCsv(posts);

    // Build ZIP
    const zip = new JSZip();
    zip.file('items.csv', itemsCsv);
    zip.file('posts.csv', postsCsv);

    // Photos folder: include ALL originals (including deleted)
    const photosFolder = zip.folder('photos');
    for (const item of items) {
      const photos = await db.getPhotosByItemIdIncludingDeleted(item.id);
      for (const photo of photos) {
        if (!photo.originalPath) continue;
        const object = await c.env.PHOTOS_BUCKET.get(photo.originalPath);
        if (object) {
          const arrayBuffer = await object.arrayBuffer();
          // имя файла в архиве: <itemId>/<originalFilename>
          const itemFolder = photosFolder?.folder(String(item.id));
          itemFolder?.file(photo.filename, arrayBuffer);
        }
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `collepto_export_${timestamp}.zip`;

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
    
  } catch (error) {
    console.error('Download export error:', error);
    return c.json({ success: false, error: 'Failed to download export' }, 500);
  }
});

// GET export items only as CSV
router.get('/items/csv', async (c) => {
  try {
    const db = new DatabaseQueries(c.env);
    const items = await db.getAllItems();
    
    const csv = await generateItemsCsv(items, db);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `collepto_items_${timestamp}.csv`;
    
    return c.text(csv, 200, {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'text/csv; charset=utf-8'
    });
    
  } catch (error) {
    console.error('Export items CSV error:', error);
    return c.json({ success: false, error: 'Failed to export items CSV' }, 500);
  }
});

// GET export blog posts as CSV
router.get('/posts/csv', async (c) => {
  try {
    const db = new DatabaseQueries(c.env);
    const posts = await db.getAllBlogPosts();
    
    const csv = generatePostsCsv(posts);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `collepto_posts_${timestamp}.csv`;
    
    return c.text(csv, 200, {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'text/csv; charset=utf-8'
    });
    
  } catch (error) {
    console.error('Export posts CSV error:', error);
    return c.json({ success: false, error: 'Failed to export posts CSV' }, 500);
  }
});

// Helper function to generate items CSV
async function generateItemsCsv(items: any[], db: DatabaseQueries): Promise<string> {
  const headers = [
    'ID',
    'Title',
    'Description',
    'Full Description',
    'Year',
    'Year From',
    'Year To',
    'Country',
    'Organization',
    'Size',
    'Edition',
    'Series',
    'Tags',
    'Category',
    'Condition',
    'Acquisition',
    'Value',
    'Photo Files',
    'Created At',
    'Updated At'
  ];
  
  const rows = [headers];
  
  for (const item of items) {
    // Get photos for this item (including deleted for export)
    const photos = await db.getPhotosByItemIdIncludingDeleted(item.id);
    const photoFiles = photos.map(p => p.filename).join('; ');
    
    const row = [
      item.id,
      escapeCSV(item.title),
      escapeCSV(item.description || ''),
      escapeCSV(item.fullDescription || ''),
      item.year,
      item.yearFrom || '',
      item.yearTo || '',
      escapeCSV(item.country || ''),
      escapeCSV(item.organization || ''),
      escapeCSV(item.size || ''),
      escapeCSV(item.edition || ''),
      escapeCSV(item.series || ''),
      escapeCSV(Array.isArray(item.tags) ? item.tags.join('; ') : ''),
      escapeCSV(item.category),
      escapeCSV(item.condition || ''),
      escapeCSV(item.acquisition || ''),
      escapeCSV(item.value || ''),
      escapeCSV(photoFiles),
      item.createdAt || item.created_at || '',
      item.updatedAt || item.updated_at || ''
    ];
    
    rows.push(row);
  }
  
  return rows.map(row => row.join(',')).join('\n');
}

// Helper function to generate posts CSV
function generatePostsCsv(posts: any[]): string {
  const headers = [
    'ID',
    'Title',
    'Excerpt',
    'Content',
    'Publish Date',
    'Read Time',
    'Related Items',
    'Category',
    'Published',
    'Created At',
    'Updated At'
  ];
  
  const rows = [headers];
  
  for (const post of posts) {
    const row = [
      post.id,
      escapeCSV(post.title),
      escapeCSV(post.excerpt),
      escapeCSV(post.content),
      post.publishDate || post.publish_date || '',
      post.readTime || post.read_time || '',
      escapeCSV(Array.isArray(post.relatedItems) ? post.relatedItems.join('; ') : ''),
      escapeCSV(post.category),
      post.published ? 'true' : 'false',
      post.createdAt || post.created_at || '',
      post.updatedAt || post.updated_at || ''
    ];
    
    rows.push(row);
  }
  
  return rows.map(row => row.join(',')).join('\n');
}

// Helper function to escape CSV values
function escapeCSV(value: string): string {
  if (typeof value !== 'string') {
    return String(value || '');
  }
  
  // If the value contains comma, newline, or quote, wrap it in quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    // Escape quotes by doubling them
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

export { router as exportRouter };