import { Hono } from 'hono';
import type { Env, ExportData } from '../types';
import { DatabaseQueries } from '../db/queries';

const router = new Hono<{ Bindings: Env }>();

// GET export collection as CSV + photo archive
router.get('/', async (c) => {
  try {
    const db = new DatabaseQueries(c.env);
    
    // Get all data
    const items = await db.getAllItems();
    const posts = await db.getAllBlogPosts();
    
    // Get all photos for all items
    const allPhotos = [];
    for (const item of items) {
      const photos = await db.getPhotosByItemId(item.id);
      allPhotos.push(...photos);
    }

    const exportData: ExportData = {
      items,
      posts,
      photos: allPhotos
    };

    return c.json({
      success: true,
      data: {
        totalItems: items.length,
        totalPosts: posts.length,
        totalPhotos: allPhotos.length,
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
    
    // Create CSV data for items
    const itemsCsv = await generateItemsCsv(items, db);
    
    // Create CSV data for blog posts
    const postsCsv = await generatePostsCsv(posts);
    
    // For now, return CSV data as JSON (in a real implementation, you'd create a zip file)
    // TODO: Implement actual ZIP file creation with photos and CSV files
    
    const exportData = {
      items_csv: itemsCsv,
      posts_csv: postsCsv,
      timestamp: new Date().toISOString(),
      total_items: items.length,
      total_posts: posts.length
    };

    // Set headers for file download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `collepto_export_${timestamp}.json`;
    
    return c.json(exportData, 200, {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'application/json'
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
    // Get photos for this item
    const photos = await db.getPhotosByItemId(item.id);
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