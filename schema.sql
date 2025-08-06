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
    filename TEXT NOT NULL,
    size INTEGER NOT NULL,
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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_year ON items(year);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
CREATE INDEX IF NOT EXISTS idx_items_slug ON items(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_publish_date ON blog_posts(publish_date);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_photo_assets_item_id ON photo_assets(item_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);