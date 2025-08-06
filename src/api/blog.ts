import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types';
import { DatabaseQueries } from '../db/queries';

const router = new Hono<{ Bindings: Env }>();

// Validation schemas
const BlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  excerpt: z.string().min(1, 'Excerpt is required'),
  content: z.string().min(1, 'Content is required'),
  publishDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  readTime: z.number().int().min(1),
  relatedItems: z.array(z.string()).default([]),
  category: z.string().min(1, 'Category is required'),
  published: z.boolean().default(false),
});

const BlogPostUpdateSchema = BlogPostSchema.partial();

// GET all blog posts (admin)
router.get('/', async (c) => {
  try {
    const db = new DatabaseQueries(c.env);
    const posts = await db.getAllBlogPosts();
    
    return c.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Get blog posts error:', error);
    return c.json({ success: false, error: 'Failed to fetch blog posts' }, 500);
  }
});

// GET blog post by slug (public)
router.get('/slug/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const db = new DatabaseQueries(c.env);
    let post = await db.getBlogPostBySlug(slug);
    
    // If not found by slug, try to extract ID from slug and search by ID prefix
    if (!post) {
      const { extractIdFromSlug } = await import('../lib/slugify');
      const idPrefix = extractIdFromSlug(slug);
      if (idPrefix) {
        post = await db.findBlogPostByIdPrefix(idPrefix);
      }
    }
    
    if (!post) {
      return c.json({ success: false, error: 'Blog post not found' }, 404);
    }
    
    return c.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Get blog post by slug error:', error);
    return c.json({ success: false, error: 'Failed to fetch blog post' }, 500);
  }
});

// GET blog post by ID (admin)
router.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const db = new DatabaseQueries(c.env);
    const post = await db.getBlogPostById(id);
    
    if (!post) {
      return c.json({ success: false, error: 'Blog post not found' }, 404);
    }
    
    return c.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Get blog post error:', error);
    return c.json({ success: false, error: 'Failed to fetch blog post' }, 500);
  }
});

// POST create new blog post
router.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validation = BlogPostSchema.safeParse(body);
    
    if (!validation.success) {
      return c.json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      }, 400);
    }
    
    const db = new DatabaseQueries(c.env);
    const postId = await db.createBlogPost(validation.data);
    
    return c.json({
      success: true,
      data: { id: postId }
    }, 201);
  } catch (error) {
    console.error('Create blog post error:', error);
    return c.json({ success: false, error: 'Failed to create blog post' }, 500);
  }
});

// PUT update blog post
router.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const validation = BlogPostUpdateSchema.safeParse(body);
    
    if (!validation.success) {
      return c.json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      }, 400);
    }
    
    const db = new DatabaseQueries(c.env);
    const updated = await db.updateBlogPost(id, validation.data);
    
    if (!updated) {
      return c.json({ success: false, error: 'Blog post not found' }, 404);
    }
    
    return c.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('Update blog post error:', error);
    return c.json({ success: false, error: 'Failed to update blog post' }, 500);
  }
});

// DELETE blog post
router.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const db = new DatabaseQueries(c.env);
    const deleted = await db.deleteBlogPost(id);
    
    if (!deleted) {
      return c.json({ success: false, error: 'Blog post not found' }, 404);
    }
    
    return c.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('Delete blog post error:', error);
    return c.json({ success: false, error: 'Failed to delete blog post' }, 500);
  }
});

// POST publish/unpublish blog post
router.post('/:id/publish', async (c) => {
  try {
    const id = c.req.param('id');
    const { published } = await c.req.json();
    
    if (typeof published !== 'boolean') {
      return c.json({ success: false, error: 'Published must be a boolean' }, 400);
    }
    
    const db = new DatabaseQueries(c.env);
    const updated = await db.updateBlogPost(id, { published });
    
    if (!updated) {
      return c.json({ success: false, error: 'Blog post not found' }, 404);
    }
    
    return c.json({
      success: true,
      data: { id, published }
    });
  } catch (error) {
    console.error('Publish blog post error:', error);
    return c.json({ success: false, error: 'Failed to update publish status' }, 500);
  }
});

// GET blog post statistics
router.get('/stats', async (c) => {
  try {
    // Get total count
    const totalResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM blog_posts').first();
    const total = totalResult?.count || 0;
    
    // Get published count
    const publishedResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM blog_posts WHERE published = 1').first();
    const published = publishedResult?.count || 0;
    
    // Get categories
    const categoriesResult = await c.env.DB.prepare(`
      SELECT category, COUNT(*) as count 
      FROM blog_posts 
      GROUP BY category 
      ORDER BY count DESC
    `).all();
    
    // Get recent posts
    const recentResult = await c.env.DB.prepare(`
      SELECT id, title, publish_date, published
      FROM blog_posts 
      ORDER BY created_at DESC 
      LIMIT 5
    `).all();
    
    return c.json({
      success: true,
      data: {
        total,
        published,
        draft: total - published,
        categories: categoriesResult.results || [],
        recent: recentResult.results || []
      }
    });
  } catch (error) {
    console.error('Blog stats error:', error);
    return c.json({ success: false, error: 'Failed to get blog statistics' }, 500);
  }
});

// GET search blog posts
router.get('/search', async (c) => {
  try {
    const query = c.req.query('q') || '';
    const category = c.req.query('category') || '';
    const published = c.req.query('published');
    
    let sql = 'SELECT * FROM blog_posts WHERE 1=1';
    const params: any[] = [];
    
    // Text search
    if (query) {
      sql += ' AND (title LIKE ? OR excerpt LIKE ? OR content LIKE ?)';
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Category filter
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    // Published filter
    if (published !== undefined) {
      sql += ' AND published = ?';
      params.push(published === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY publish_date DESC';
    
    const result = await c.env.DB.prepare(sql).bind(...params).all();
    
    const posts = result.results?.map(post => ({
      ...post,
      relatedItems: JSON.parse(post.related_items || '[]'),
      published: Boolean(post.published)
    })) || [];
    
    return c.json({
      success: true,
      data: posts,
      count: posts.length
    });
  } catch (error) {
    console.error('Search blog posts error:', error);
    return c.json({ success: false, error: 'Search failed' }, 500);
  }
});

export { router as blogRouter };