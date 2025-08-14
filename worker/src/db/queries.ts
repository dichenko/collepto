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
    
    return result.results?.map((item: any) => ({
      ...item,
      tags: JSON.parse(String(item.tags || '[]')),
      isFeatured: Boolean(item.is_featured)
    })) as CollectorItem[] || [];
  }

  async getItemById(id: string): Promise<CollectorItem | null> {
    const item: any = await this.env.DB.prepare(`
      SELECT * FROM items WHERE id = ?
    `).bind(id).first();
    
    if (!item) return null;
    
    // Get photos (exclude soft-deleted)
    const photos = await this.env.DB.prepare(`
      SELECT compressed_path, thumbnail_path FROM photo_assets WHERE item_id = ? AND (deleted IS NULL OR deleted = 0) ORDER BY order_index ASC, created_at ASC
    `).bind(id).all();
    
    // Use R2ImageProcessor to get proper URLs
    const r2Processor = new R2ImageProcessor(this.env.PHOTOS_BUCKET, this.env.R2_PUBLIC_URL);
    
    return {
      ...item,
      tags: JSON.parse(String(item.tags || '[]')),
      isFeatured: Boolean(item.is_featured),
      photos: (photos.results as any[])?.map((p: any) => r2Processor.getPublicUrl(String(p.compressed_path))) || []
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
        condition, acquisition, value, slug, is_featured, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      item.isFeatured ? 1 : 0,
      now, now
    ).run();
    
    // Normalize tags into junction table as well
    if (Array.isArray(item.tags) && item.tags.length > 0) {
      await this.setItemTags(id, item.tags);
    }

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
    if (item.isFeatured !== undefined) { fields.push('is_featured = ?'); values.push(item.isFeatured ? 1 : 0); }
    
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
    
    if (item.tags !== undefined && Array.isArray(item.tags)) {
      await this.setItemTags(id, item.tags);
    }

    return (result as any).changes > 0;
  }

  async deleteItem(id: string): Promise<boolean> {
    const result = await this.env.DB.prepare(`
      DELETE FROM items WHERE id = ?
    `).bind(id).run();
    
    return (result as any).changes > 0;
  }

  // Admin logs
  async logAdminAction(action: string, entityType: string, entityId: string, payload?: unknown): Promise<void> {
    const id = crypto.randomUUID();
    const payloadJson = payload == null ? null : JSON.stringify(payload);
    await this.env.DB.prepare(`
      INSERT INTO admin_logs (id, action, entity_type, entity_id, payload)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, action, entityType, entityId, payloadJson).run();
  }

  // Tags normalization helpers
  private async ensureTagsExist(tagNames: string[]): Promise<void> {
    for (const name of tagNames) {
      await this.env.DB.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`).bind(name).run();
    }
  }

  private async getTagIdsByNames(tagNames: string[]): Promise<number[]> {
    if (tagNames.length === 0) return [];
    const placeholders = tagNames.map(() => '?').join(',');
    const result = await this.env.DB.prepare(`SELECT id FROM tags WHERE name IN (${placeholders})`).bind(...tagNames).all();
    return (result.results || []).map((r: any) => r.id as number);
  }

  async setItemTags(itemId: string, tagNames: string[]): Promise<void> {
    const cleanNames = Array.from(new Set(tagNames.map(t => t.trim()).filter(Boolean)));
    await this.ensureTagsExist(cleanNames);
    const tagIds = await this.getTagIdsByNames(cleanNames);

    await this.env.DB.prepare(`DELETE FROM items_tags WHERE item_id = ?`).bind(itemId).run();
    for (const tagId of tagIds) {
      await this.env.DB.prepare(`INSERT INTO items_tags (item_id, tag_id) VALUES (?, ?)`).bind(itemId, tagId).run();
    }
  }

  // Blog posts queries
  async getAllBlogPosts(): Promise<BlogPost[]> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM blog_posts ORDER BY publish_date DESC
    `).all();
    
    return result.results?.map((post: any) => ({
      ...post,
      relatedItems: JSON.parse(String(post.related_items || '[]')),
      published: Boolean(post.published)
    })) as BlogPost[] || [];
  }

  async getBlogPostById(id: string): Promise<BlogPost | null> {
    const post: any = await this.env.DB.prepare(`
      SELECT * FROM blog_posts WHERE id = ?
    `).bind(id).first();
    
    if (!post) return null;
    
    return {
      ...post,
      relatedItems: JSON.parse(String(post.related_items || '[]')),
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
    
    return (result as any).changes > 0;
  }

  async deleteBlogPost(id: string): Promise<boolean> {
    const result = await this.env.DB.prepare(`
      DELETE FROM blog_posts WHERE id = ?
    `).bind(id).run();
    
    return (result as any).changes > 0;
  }

  // Photo assets queries
  async getPhotosByItemId(itemId: string): Promise<PhotoAsset[]> {
    const result = await this.env.DB.prepare(`
      SELECT id, item_id, original_path, compressed_path, thumbnail_path, filename, size, width, height, alt, caption, deleted, order_index, created_at 
      FROM photo_assets 
      WHERE item_id = ? AND (deleted IS NULL OR deleted = 0)
      ORDER BY order_index ASC, created_at ASC
    `).bind(itemId).all();
    
    const rows = (result.results || []) as any[];
    return rows.map((r: any) => ({
      id: r.id,
      itemId: r.item_id,
      originalPath: r.original_path,
      compressedPath: r.compressed_path,
      thumbnailPath: r.thumbnail_path,
      filename: r.filename,
      size: r.size,
      width: r.width,
      height: r.height,
      alt: r.alt || undefined,
      caption: r.caption || undefined,
      deleted: Boolean(r.deleted),
      orderIndex: r.order_index,
      createdAt: r.created_at,
    }));
  }

  async createPhotoAsset(photo: Omit<PhotoAsset, 'id' | 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await this.env.DB.prepare(`
      INSERT INTO photo_assets (id, item_id, original_path, compressed_path, thumbnail_path, filename, size, width, height, alt, caption, deleted, order_index, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      photo.alt || null,
      photo.caption || null,
      photo.deleted ? 1 : 0,
      photo.orderIndex ?? 0,
      now
    ).run();
    
    return id;
  }

    async getPhotoById(id: string): Promise<PhotoAsset | null> {
    const row: any = await this.env.DB.prepare(`
      SELECT id, item_id, original_path, compressed_path, thumbnail_path, filename, size, width, height, deleted, created_at FROM photo_assets WHERE id = ?
    `).bind(id).first();
    
    if (!row) return null;
    return {
      id: row.id,
      itemId: row.item_id,
      originalPath: row.original_path,
      compressedPath: row.compressed_path,
      thumbnailPath: row.thumbnail_path,
      filename: row.filename,
      size: row.size,
      width: row.width,
      height: row.height,
      deleted: Boolean(row.deleted),
      createdAt: row.created_at,
    } as PhotoAsset;
  }

  async softDeletePhotoAsset(id: string): Promise<boolean> {
    const result = await this.env.DB.prepare(`
      UPDATE photo_assets SET deleted = 1 WHERE id = ?
    `).bind(id).run();
    return (result as any).changes > 0;
  }

  async restorePhotoAsset(id: string, updates: { compressedPath?: string; thumbnailPath?: string }): Promise<boolean> {
    const fields: string[] = ['deleted = 0'];
    const values: any[] = [];
    if (updates.compressedPath) { fields.push('compressed_path = ?'); values.push(updates.compressedPath); }
    if (updates.thumbnailPath) { fields.push('thumbnail_path = ?'); values.push(updates.thumbnailPath); }
    values.push(id);
    const result = await this.env.DB.prepare(`
      UPDATE photo_assets SET ${fields.join(', ')} WHERE id = ?
    `).bind(...values).run();
    return (result as any).changes > 0;
  }

  async getPhotosByItemIdIncludingDeleted(itemId: string): Promise<PhotoAsset[]> {
    const result = await this.env.DB.prepare(`
      SELECT id, item_id, original_path, compressed_path, thumbnail_path, filename, size, width, height, alt, caption, deleted, order_index, created_at 
      FROM photo_assets 
      WHERE item_id = ?
      ORDER BY order_index ASC, created_at ASC
    `).bind(itemId).all();
    const rows = (result.results || []) as any[];
    return rows.map((r: any) => ({
      id: r.id,
      itemId: r.item_id,
      originalPath: r.original_path,
      compressedPath: r.compressed_path,
      thumbnailPath: r.thumbnail_path,
      filename: r.filename,
      size: r.size,
      width: r.width,
      height: r.height,
      alt: r.alt || undefined,
      caption: r.caption || undefined,
      deleted: Boolean(r.deleted),
      orderIndex: r.order_index,
      createdAt: r.created_at,
    }));
  }

  async deletePhotoAsset(id: string): Promise<boolean> {
    const result = await this.env.DB.prepare(`
      DELETE FROM photo_assets WHERE id = ?
    `).bind(id).run();

    return (result as any).changes > 0;
  }

  // Slug-based queries
  async getItemBySlug(slug: string): Promise<CollectorItem | null> {
    const item: any = await this.env.DB.prepare(`
      SELECT * FROM items WHERE slug = ?
    `).bind(slug).first();
    
    if (!item) return null;
    
    // Get photos
    const photos = await this.env.DB.prepare(`
      SELECT compressed_path FROM photo_assets WHERE item_id = ? AND (deleted IS NULL OR deleted = 0) ORDER BY order_index ASC, created_at ASC
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
      tags: JSON.parse(String(item.tags || '[]')),
      category: item.category,
      condition: item.condition,
      acquisition: item.acquisition,
      value: item.value,
      slug: item.slug,
      isFeatured: Boolean(item.is_featured),
      photos: (photos.results as any[])?.map((p: any) => p.compressed_path) || [],
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
      relatedItems: JSON.parse(String(post.related_items || '[]')),
      published: Boolean(post.published)
    } as BlogPost;
  }

  async findItemByIdPrefix(idPrefix: string): Promise<CollectorItem | null> {
    const item: any = await this.env.DB.prepare(`
      SELECT * FROM items WHERE id LIKE ?
    `).bind(`${idPrefix}%`).first();
    
    if (!item) return null;
    
    // Get photos
    const photos = await this.env.DB.prepare(`
      SELECT compressed_path FROM photo_assets WHERE item_id = ? AND (deleted IS NULL OR deleted = 0) ORDER BY order_index ASC, created_at ASC
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
      tags: JSON.parse(String(item.tags || '[]')),
      category: item.category,
      condition: item.condition,
      acquisition: item.acquisition,
      value: item.value,
      slug: item.slug,
      isFeatured: Boolean(item.is_featured),
      photos: (photos.results as any[])?.map((p: any) => p.compressed_path) || [],
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
      relatedItems: JSON.parse(String(post.related_items || '[]')),
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
    
    return (result as any).changes > 0;
  }

  async cleanExpiredSessions(): Promise<void> {
    await this.env.DB.prepare(`
      DELETE FROM sessions WHERE expires_at <= ?
    `).bind(Date.now()).run();
  }
}