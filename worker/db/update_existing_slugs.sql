-- Script to populate slug fields for existing records
-- This should be run after the migration to add slug columns

-- Note: This is a template. Actual slug generation should be done via application
-- because SQL doesn't have the complex transliteration logic.
-- Run this after manually updating slugs via the admin interface or API

-- For new installations, this won't be needed as slugs are generated on creation

-- Example of what the update would look like (to be done via application):
-- UPDATE items SET slug = 'generated-slug_1234' WHERE id = 'full-uuid-here';
-- UPDATE blog_posts SET slug = 'generated-slug_5678' WHERE id = 'full-uuid-here';

-- For now, this file serves as documentation of the need to update existing records
