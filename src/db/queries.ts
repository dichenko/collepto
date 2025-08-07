import type { Env, CollectorItem, BlogPost, PhotoAsset } from '../types';
import { R2ImageProcessor } from '../lib/r2-image-processor';
import { createSlug, extractIdFromSlug } from '../lib/slugify';

export class DatabaseQueries {
  constructor(private env: Env) {}

  // Items queries
  async getAllItems(): Promise<CollectorItem[]> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM items ORDER BY created_at DESC
    `).all();
    
    return result.results?.map(item => ({
      ...item,
      tags: JSON.parse(item.tags || '[]')
    })) as CollectorItem[] || [];
  }

  async getItemById(id: string): Promise<CollectorItem | null> {
    const item = await this.env.DB.prepare(`
      SELECT * FROM items WHERE id = ?
    `).bind(id).first();
    
    if (!item) return null;
    
    // Get photos
    const photos = await this.env.DB.prepare(`
      SELECT compressed_path, thumbnail_path FROM photo_assets WHERE item_id = ?
    `).bind(id).all();
    
    // Use R2ImageProcessor to get proper URLs
    const r2Processor = new R2ImageProcessor(this.env.PHOTOS_BUCKET, this.env.R2_PUBLIC_URL);
    
    return {
      ...item,
      tags: JSON.parse(item.tags || '[]'),
      photos: photos.results?.map(p => {
        // Use R2ImageProcessor to get proper public URL
        return r2Processor.getPublicUrl(p.compressed_path);
      }) || []
    } as CollectorItem;
  }

  async createItem(item: Omit<CollectorItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const slug = createSlug(item.title, id);
    
    // Helper function to convert empty strings and undefined to null
    const safeValue = (value: any) => (value === '' || value == null) ? null : value;
    
    await this.env.DB.prepare(`
      INSERT INTO items (
        id, title, description, full_description, year, year_from, year_to,
        country, organization, size, edition, series, tags, category,
        condition, acquisition, value, slug, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, 
      item.title, // title is required, don't null it
      safeValue(item.description), 
      safeValue(item.fullDescription), 
      item.year,
      item.yearFrom || null, 
      item.yearTo || null, 
      safeValue(item.country), 
      safeValue(item.organization),
      safeValue(item.size), 
      safeValue(item.edition), 
      safeValue(item.series), 
      JSON.stringify(item.tags || []),
      item.category, // category is required, don't null it
      safeValue(item.condition), 
      safeValue(item.acquisition), 
      safeValue(item.value),
      slug,
      now, now
    ).run();
    
    return id;
  }

  async updateItem(id: string, item: Partial<CollectorItem>): Promise<boolean> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];
    
    if (item.title !== undefined) { fields.push('title = ?'); values.push(item.title); }
    if (item.description !== undefined) { fields.push('description = ?'); values.push(item.description); }
    if (item.fullDescription !== undefined) { fields.push('full_description = ?'); values.push(item.fullDescription); }
    if (item.year !== undefined) { fields.push('year = ?'); values.push(item.year); }
    if (item.yearFrom !== undefined) { fields.push('year_from = ?'); values.push(item.yearFrom); }
    if (item.yearTo !== undefined) { fields.push('year_to = ?'); values.push(item.yearTo); }
    if (item.country !== undefined) { fields.push('country = ?'); values.push(item.country); }
    if (item.organization !== undefined) { fields.push('organization = ?'); values.push(item.organization); }
    if (item.size !== undefined) { fields.push('size = ?'); values.push(item.size); }
    if (item.edition !== undefined) { fields.push('edition = ?'); values.push(item.edition); }
    if (item.series !== undefined) { fields.push('series = ?'); values.push(item.series); }
    if (item.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(item.tags)); }
    if (item.category !== undefined) { fields.push('category = ?'); values.push(item.category); }
    if (item.condition !== undefined) { fields.push('condition = ?'); values.push(item.condition); }
    if (item.acquisition !== undefined) { fields.push('acquisition = ?'); values.push(item.acquisition); }
    if (item.value !== undefined) { fields.push('value = ?'); values.push(item.value); }
    if (item.slug !== undefined) { fields.push('slug = ?'); values.push(item.slug); }
    
    // If title is being updated, regenerate slug
    if (item.title !== undefined) {
      const newSlug = createSlug(item.title, id);
      fields.push('slug = ?'); 
      values.push(newSlug);
    }
    
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    const result = await this.env.DB.prepare(`
      UPDATE items SET ${fields.join(', ')} WHERE id = ?
    `).bind(...values).run();
    
    return result.changes > 0;
  }

  async deleteItem(id: string): Promise<boolean> {
    const result = await this.env.DB.prepare(`
      DELETE FROM items WHERE id = ?
    `).bind(id).run();
    
    return result.changes > 0;
  }

  // Blog posts queries
  async getAllBlogPosts(): Promise<BlogPost[]> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM blog_posts ORDER BY publish_date DESC
    `).all();
    
    return result.results?.map(post => ({
      ...post,
      relatedItems: JSON.parse(post.related_items || '[]'),
      published: Boolean(post.published)
    })) as BlogPost[] || [];
  }

  async getBlogPostById(id: string): Promise<BlogPost | null> {
    const post = await this.env.DB.prepare(`
      SELECT * FROM blog_posts WHERE id = ?
    `).bind(id).first();
    
    if (!post) return null;
    
    return {
      ...post,
      relatedItems: JSON.parse(post.related_items || '[]'),
      published: Boolean(post.published)
    } as BlogPost;
  }

  async createBlogPost(post: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const slug = createSlug(post.title, id);
    
    await this.env.DB.prepare(`
      INSERT INTO blog_posts (
        id, title, excerpt, content, publish_date, read_time,
        related_items, category, published, slug, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, post.title, post.excerpt, post.content, post.publishDate,
      post.readTime, JSON.stringify(post.relatedItems), post.category,
      post.published ? 1 : 0, slug, now, now
    ).run();
    
    return id;
  }

  async updateBlogPost(id: string, post: Partial<BlogPost>): Promise<boolean> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];
    
    if (post.title !== undefined) { fields.push('title = ?'); values.push(post.title); }
    if (post.excerpt !== undefined) { fields.push('excerpt = ?'); values.push(post.excerpt); }
    if (post.content !== undefined) { fields.push('content = ?'); values.push(post.content); }
    if (post.publishDate !== undefined) { fields.push('publish_date = ?'); values.push(post.publishDate); }
    if (post.readTime !== undefined) { fields.push('read_time = ?'); values.push(post.readTime); }
    if (post.relatedItems !== undefined) { fields.push('related_items = ?'); values.push(JSON.stringify(post.relatedItems)); }
    if (post.category !== undefined) { fields.push('category = ?'); values.push(post.category); }
    if (post.published !== undefined) { fields.push('published = ?'); values.push(post.published ? 1 : 0); }
    if (post.slug !== undefined) { fields.push('slug = ?'); values.push(post.slug); }
    
    // If title is being updated, regenerate slug
    if (post.title !== undefined) {
      const newSlug = createSlug(post.title, id);
      fields.push('slug = ?'); 
      values.push(newSlug);
    }
    
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    const result = await this.env.DB.prepare(`
      UPDATE blog_posts SET ${fields.join(', ')} WHERE id = ?
    `).bind(...values).run();
    
    return result.changes > 0;
  }

  async deleteBlogPost(id: string): Promise<boolean> {
    const result = await this.env.DB.prepare(`
      DELETE FROM blog_posts WHERE id = ?
    `).bind(id).run();
    
    return result.changes > 0;
  }

  // Photo assets queries
  async getPhotosByItemId(itemId: string): Promise<PhotoAsset[]> {
    const result = await this.env.DB.prepare(`
      SELECT id, item_id, original_path, compressed_path, thumbnail_path, filename, size, width, height, created_at FROM photo_assets WHERE item_id = ?
    `).bind(itemId).all();
    
    return result.results as PhotoAsset[] || [];
  }

  async createPhotoAsset(photo: Omit<PhotoAsset, 'id' | 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await this.env.DB.prepare(`
      INSERT INTO photo_assets (id, item_id, original_path, compressed_path, thumbnail_path, filename, size, width, height, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, 
      photo.itemId, 
      photo.originalPath, 
      photo.compressedPath, 
      photo.thumbnailPath,
      photo.filename, 
      photo.size,
      photo.width || null,
      photo.height || null,
      now
    ).run();
    
    return id;
  }

    async getPhotoById(id: string): Promise<PhotoAsset | null> {
    const result = await this.env.DB.prepare(`
      SELECT id, item_id, original_path, compressed_path, thumbnail_path, filename, size, width, height, created_at FROM photo_assets WHERE id = ?
    `).bind(id).first();
    
    return result as PhotoAsset || null;
  }

  async deletePhotoAsset(id: string): Promise<boolean> {
    const result = await this.env.DB.prepare(`
      DELETE FROM photo_assets WHERE id = ?
    `).bind(id).run();

    return result.changes > 0;
  }

  // Slug-based queries
  async getItemBySlug(slug: string): Promise<CollectorItem | null> {
    const item = await this.env.DB.prepare(`
      SELECT * FROM items WHERE slug = ?
    `).bind(slug).first();
    
    if (!item) return null;
    
    // Get photos
    const photos = await this.env.DB.prepare(`
      SELECT compressed_path FROM photo_assets WHERE item_id = ?
    `).bind(item.id).all();
    
    // Transform field names from database format to interface format
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      fullDescription: item.full_description,
      year: item.year,
      yearFrom: item.year_from,
      yearTo: item.year_to,
      country: item.country,
      organization: item.organization,
      size: item.size,
      edition: item.edition,
      series: item.series,
      tags: JSON.parse(item.tags || '[]'),
      category: item.category,
      condition: item.condition,
      acquisition: item.acquisition,
      value: item.value,
      slug: item.slug,
      photos: photos.results?.map(p => p.compressed_path) || [],
      createdAt: item.created_at,
      updatedAt: item.updated_at
    } as CollectorItem;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    const post = await this.env.DB.prepare(`
      SELECT * FROM blog_posts WHERE slug = ?
    `).bind(slug).first();
    
    if (!post) return null;
    
    return {
      ...post,
      relatedItems: JSON.parse(post.related_items || '[]'),
      published: Boolean(post.published)
    } as BlogPost;
  }

  async findItemByIdPrefix(idPrefix: string): Promise<CollectorItem | null> {
    const item = await this.env.DB.prepare(`
      SELECT * FROM items WHERE id LIKE ?
    `).bind(`${idPrefix}%`).first();
    
    if (!item) return null;
    
    // Get photos
    const photos = await this.env.DB.prepare(`
      SELECT compressed_path FROM photo_assets WHERE item_id = ?
    `).bind(item.id).all();
    
    // Transform field names from database format to interface format
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      fullDescription: item.full_description,
      year: item.year,
      yearFrom: item.year_from,
      yearTo: item.year_to,
      country: item.country,
      organization: item.organization,
      size: item.size,
      edition: item.edition,
      series: item.series,
      tags: JSON.parse(item.tags || '[]'),
      category: item.category,
      condition: item.condition,
      acquisition: item.acquisition,
      value: item.value,
      slug: item.slug,
      photos: photos.results?.map(p => p.compressed_path) || [],
      createdAt: item.created_at,
      updatedAt: item.updated_at
    } as CollectorItem;
  }

  async findBlogPostByIdPrefix(idPrefix: string): Promise<BlogPost | null> {
    const post = await this.env.DB.prepare(`
      SELECT * FROM blog_posts WHERE id LIKE ?
    `).bind(`${idPrefix}%`).first();
    
    if (!post) return null;
    
    return {
      ...post,
      relatedItems: JSON.parse(post.related_items || '[]'),
      published: Boolean(post.published)
    } as BlogPost;
  }

  // Session management
  async createSession(userId: string, expiresAt: number): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();
    
    await this.env.DB.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(id, userId, expiresAt, now).run();
    
    return id;
  }

  async getSession(id: string): Promise<{ userId: string; expiresAt: number } | null> {
    const session = await this.env.DB.prepare(`
      SELECT user_id, expires_at FROM sessions WHERE id = ? AND expires_at > ?
    `).bind(id, Date.now()).first();
    
    return session ? {
      userId: session.user_id as string,
      expiresAt: session.expires_at as number
    } : null;
  }

  async deleteSession(id: string): Promise<boolean> {
    const result = await this.env.DB.prepare(`
      DELETE FROM sessions WHERE id = ?
    `).bind(id).run();
    
    return result.changes > 0;
  }

  async cleanExpiredSessions(): Promise<void> {
    await this.env.DB.prepare(`
      DELETE FROM sessions WHERE expires_at <= ?
    `).bind(Date.now()).run();
  }
}