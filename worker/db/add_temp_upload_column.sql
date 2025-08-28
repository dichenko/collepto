-- Add missing temp_upload_id column to photo_assets table
ALTER TABLE photo_assets ADD COLUMN temp_upload_id TEXT;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_photo_assets_temp_upload ON photo_assets(temp_upload_id);
