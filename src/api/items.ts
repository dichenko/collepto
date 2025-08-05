import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types';
import { DatabaseQueries } from '../db/queries';

const router = new Hono<{ Bindings: Env }>();

// Validation schemas
const ItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  fullDescription: z.string().optional(),
  year: z.number().int().min(1800).max(2030),
  yearFrom: z.number().int().min(1800).max(2030).optional(),
  yearTo: z.number().int().min(1800).max(2030).optional(),
  country: z.string().optional(),
  organization: z.string().optional(),
  size: z.string().optional(),
  edition: z.string().optional(),
  series: z.string().optional(),
  tags: z.array(z.string()).default([]),
  category: z.string().min(1, 'Category is required'),
  condition: z.string().optional(),
  acquisition: z.string().optional(),
  value: z.string().optional(),
});

const ItemUpdateSchema = ItemSchema.partial();

// GET all items (admin)
router.get('/', async (c) => {
  try {
    const db = new DatabaseQueries(c.env);
    const items = await db.getAllItems();
    
    return c.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Get items error:', error);
    return c.json({ success: false, error: 'Failed to fetch items' }, 500);
  }
});

// GET item by ID (admin)
router.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const db = new DatabaseQueries(c.env);
    const item = await db.getItemById(id);
    
    if (!item) {
      return c.json({ success: false, error: 'Item not found' }, 404);
    }
    
    return c.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Get item error:', error);
    return c.json({ success: false, error: 'Failed to fetch item' }, 500);
  }
});

// POST create new item
  router.post('/', async (c) => {
    try {
      console.log('POST /api/admin/items - Starting item creation');
      
      const body = await c.req.json();
      console.log('Request body:', JSON.stringify(body, null, 2));
      
      const validation = ItemSchema.safeParse(body);
      console.log('Validation result:', validation.success ? 'SUCCESS' : 'FAILED');
      
      if (!validation.success) {
        console.log('Validation errors:', validation.error.errors);
        return c.json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors
        }, 400);
      }
      
      console.log('Creating item with data:', JSON.stringify(validation.data, null, 2));
      
      const db = new DatabaseQueries(c.env);
      const itemId = await db.createItem(validation.data);
      
      console.log('Item created successfully with ID:', itemId);
      
      return c.json({
        success: true,
        data: { id: itemId }
      }, 201);
    } catch (error) {
      console.error('Create item error:', error);
      console.error('Error stack:', error.stack);
      return c.json({ 
        success: false, 
        error: 'Failed to create item',
        details: error.message 
      }, 500);
    }
  });

// PUT update item
router.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const validation = ItemUpdateSchema.safeParse(body);
    
    if (!validation.success) {
      return c.json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      }, 400);
    }
    
    const db = new DatabaseQueries(c.env);
    const updated = await db.updateItem(id, validation.data);
    
    if (!updated) {
      return c.json({ success: false, error: 'Item not found' }, 404);
    }
    
    return c.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('Update item error:', error);
    return c.json({ success: false, error: 'Failed to update item' }, 500);
  }
});

// DELETE item
router.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const db = new DatabaseQueries(c.env);
    
    // First delete associated photos from Assets
    const photos = await db.getPhotosByItemId(id);
    for (const photo of photos) {
      try {
        // Delete from Cloudflare Assets
        // await c.env.ASSETS.delete(photo.originalPath);
        // await c.env.ASSETS.delete(photo.compressedPath);
        
        // Delete from database
        await db.deletePhotoAsset(photo.id);
      } catch (photoError) {
        console.error('Error deleting photo:', photoError);
        // Continue with item deletion even if photo deletion fails
      }
    }
    
    const deleted = await db.deleteItem(id);
    
    if (!deleted) {
      return c.json({ success: false, error: 'Item not found' }, 404);
    }
    
    return c.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('Delete item error:', error);
    return c.json({ success: false, error: 'Failed to delete item' }, 500);
  }
});

// GET search items
router.get('/search', async (c) => {
  try {
    const query = c.req.query('q') || '';
    const category = c.req.query('category') || '';
    const yearFrom = c.req.query('yearFrom') ? parseInt(c.req.query('yearFrom')!) : null;
    const yearTo = c.req.query('yearTo') ? parseInt(c.req.query('yearTo')!) : null;
    const tags = c.req.query('tags')?.split(',').filter(Boolean) || [];
    
    let sql = 'SELECT * FROM items WHERE 1=1';
    const params: any[] = [];
    
    // Text search
    if (query) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR full_description LIKE ?)';
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Category filter
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    // Year range filter
    if (yearFrom) {
      sql += ' AND year >= ?';
      params.push(yearFrom);
    }
    if (yearTo) {
      sql += ' AND year <= ?';
      params.push(yearTo);
    }
    
    // Tags filter - check if any of the specified tags exist in the JSON array
    if (tags.length > 0) {
      const tagConditions = tags.map(() => 'json_extract(tags, "$") LIKE ?').join(' OR ');
      sql += ` AND (${tagConditions})`;
      tags.forEach(tag => params.push(`%"${tag}"%`));
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const result = await c.env.DB.prepare(sql).bind(...params).all();
    
    const items = result.results?.map(item => ({
      ...item,
      tags: JSON.parse(item.tags || '[]')
    })) || [];
    
    return c.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    console.error('Search items error:', error);
    return c.json({ success: false, error: 'Search failed' }, 500);
  }
});

// GET item statistics
router.get('/stats', async (c) => {
  try {
    const db = new DatabaseQueries(c.env);
    
    // Get total count
    const totalResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM items').first();
    const total = totalResult?.count || 0;
    
    // Get categories
    const categoriesResult = await c.env.DB.prepare(`
      SELECT category, COUNT(*) as count 
      FROM items 
      GROUP BY category 
      ORDER BY count DESC
    `).all();
    
    // Get countries
    const countriesResult = await c.env.DB.prepare(`
      SELECT country, COUNT(*) as count 
      FROM items 
      WHERE country IS NOT NULL AND country != ''
      GROUP BY country 
      ORDER BY count DESC
    `).all();
    
    // Get popular tags (this is complex with JSON - simplified approach)
    const itemsWithTags = await db.getAllItems();
    const tagCounts: { [key: string]: number } = {};
    
    itemsWithTags.forEach(item => {
      item.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    const popularTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
    
    return c.json({
      success: true,
      data: {
        total,
        categories: categoriesResult.results || [],
        countries: countriesResult.results || [],
        popularTags
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return c.json({ success: false, error: 'Failed to get statistics' }, 500);
  }
});

export { router as itemsRouter };