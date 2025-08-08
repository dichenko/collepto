-- Collepto Database Schema
-- Items table for storing collection items
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    full_description TEXT,
    year INTEGER NOT NULL,
    year_from INTEGER,
    year_to INTEGER,
    country TEXT,
    organization TEXT,
    size TEXT,
    edition TEXT,
    series TEXT,
    tags TEXT, -- JSON array of tags
    category TEXT NOT NULL,
    condition TEXT,
    acquisition TEXT,
    value TEXT,
    slug TEXT, -- URL slug for routing
    is_featured BOOLEAN DEFAULT 0, -- featured on homepage
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    publish_date DATE NOT NULL,
    read_time INTEGER NOT NULL,
    related_items TEXT, -- JSON array of item IDs
    category TEXT NOT NULL,
    published BOOLEAN DEFAULT 0,
    slug TEXT, -- URL slug for routing
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Photo assets table
CREATE TABLE IF NOT EXISTS photo_assets (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    original_path TEXT NOT NULL,
    compressed_path TEXT NOT NULL,
    thumbnail_path TEXT, -- 400px variant path
    filename TEXT NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    alt TEXT,
    caption TEXT,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

-- Tags normalization
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS items_tags (
    item_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (item_id, tag_id),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Admin action logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search (FTS5)
-- Items FTS: title, description, full_description
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    title,
    description,
    full_description,
    content='items',
    content_rowid='rowid'
);

-- Blog posts FTS: title, excerpt, content
CREATE VIRTUAL TABLE IF NOT EXISTS blog_posts_fts USING fts5(
    title,
    excerpt,
    content,
    content='blog_posts',
    content_rowid='rowid'
);

-- Triggers to keep FTS tables in sync - items
CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, title, description, full_description)
  VALUES (new.rowid, new.title, new.description, new.full_description);
END;

CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, title, description, full_description)
  VALUES('delete', old.rowid, old.title, old.description, old.full_description);
END;

CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, title, description, full_description)
  VALUES('delete', old.rowid, old.title, old.description, old.full_description);
  INSERT INTO items_fts(rowid, title, description, full_description)
  VALUES (new.rowid, new.title, new.description, new.full_description);
END;

-- Triggers to keep FTS tables in sync - blog_posts
CREATE TRIGGER IF NOT EXISTS blog_posts_ai AFTER INSERT ON blog_posts BEGIN
  INSERT INTO blog_posts_fts(rowid, title, excerpt, content)
  VALUES (new.rowid, new.title, new.excerpt, new.content);
END;

CREATE TRIGGER IF NOT EXISTS blog_posts_ad AFTER DELETE ON blog_posts BEGIN
  INSERT INTO blog_posts_fts(blog_posts_fts, rowid, title, excerpt, content)
  VALUES('delete', old.rowid, old.title, old.excerpt, old.content);
END;

CREATE TRIGGER IF NOT EXISTS blog_posts_au AFTER UPDATE ON blog_posts BEGIN
  INSERT INTO blog_posts_fts(blog_posts_fts, rowid, title, excerpt, content)
  VALUES('delete', old.rowid, old.title, old.excerpt, old.content);
  INSERT INTO blog_posts_fts(rowid, title, excerpt, content)
  VALUES (new.rowid, new.title, new.excerpt, new.content);
END;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_year ON items(year);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
CREATE INDEX IF NOT EXISTS idx_items_slug ON items(slug);
CREATE INDEX IF NOT EXISTS idx_items_featured ON items(is_featured);
CREATE INDEX IF NOT EXISTS idx_blog_posts_publish_date ON blog_posts(publish_date);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_photo_assets_item_id ON photo_assets(item_id);
CREATE INDEX IF NOT EXISTS idx_photo_assets_order ON photo_assets(item_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);