-- Migration: Add slug fields to items and blog_posts tables
-- Run this script to add slug support for URL routing

-- Add slug column to items table
ALTER TABLE items ADD COLUMN slug TEXT;

-- Add slug column to blog_posts table  
ALTER TABLE blog_posts ADD COLUMN slug TEXT;

-- Create indexes for better performance on slug lookups
CREATE INDEX IF NOT EXISTS idx_items_slug ON items(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

-- Note: Slug values will be generated and updated via the application
-- when items and blog posts are created or updated
