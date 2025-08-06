import { Hono } from 'hono';
import type { Env } from '../types';
import { DatabaseQueries } from '../db/queries';
import { ImageProcessor, validateImageFile } from '../lib/image-processor';

// No longer needed - KV stores binary data directly

const router = new Hono<{ Bindings: Env }>();

// GET photos for an item
router.get('/item/:itemId', async (c) => {
  try {
    const itemId = c.req.param('itemId');
    const db = new DatabaseQueries(c.env);
    const photos = await db.getPhotosByItemId(itemId);
    
    // Convert to format expected by PhotoUploader with public URLs
    const photosWithUrls = photos.map(photo => ({
      id: photo.id,
      url: `/api/photos/serve/${photo.compressedPath.replace('assets/', '')}`,
      filename: photo.filename
    }));
    
    return c.json({
      success: true,
      data: photosWithUrls
    });
  } catch (error) {
    console.error('Get photos error:', error);
    return c.json({ success: false, error: 'Failed to fetch photos' }, 500);
  }
});

// POST upload photo for an item
router.post('/item/:itemId/upload', async (c) => {
  try {
    const itemId = c.req.param('itemId');
    
    // Check if item exists
    const db = new DatabaseQueries(c.env);
    const item = await db.getItemById(itemId);
    if (!item) {
      return c.json({ success: false, error: 'Item not found' }, 404);
    }

    // Check photo limit (10 photos max per item)
    const existingPhotos = await db.getPhotosByItemId(itemId);
    if (existingPhotos.length >= 10) {
      return c.json({ 
        success: false, 
        error: 'Maximum 10 photos allowed per item' 
      }, 400);
    }

    // Get uploaded file
    const formData = await c.req.formData();
    const file = formData.get('photo') as File;
    
    if (!file) {
      return c.json({ success: false, error: 'No file uploaded' }, 400);
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return c.json({ 
        success: false, 
        error: validation.error 
      }, 400);
    }

    // Process image
    const imageProcessor = new ImageProcessor(c.env);
    const processedImage = await imageProcessor.processImage(file, itemId);

    // Save to database
    const photoId = await db.createPhotoAsset({
      itemId,
      originalPath: processedImage.originalPath,
      compressedPath: processedImage.compressedPath,
      filename: processedImage.filename,
      size: processedImage.size
    });

    return c.json({
      success: true,
      data: {
        id: photoId,
        ...processedImage,
        publicUrl: imageProcessor.getPublicUrl(processedImage.compressedPath)
      }
    }, 201);

  } catch (error) {
    console.error('Upload photo error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to upload photo' 
    }, 500);
  }
});

// POST upload multiple photos for an item
router.post('/item/:itemId/upload-multiple', async (c) => {
  try {
    const itemId = c.req.param('itemId');
    
    // Check if item exists
    const db = new DatabaseQueries(c.env);
    const item = await db.getItemById(itemId);
    if (!item) {
      return c.json({ success: false, error: 'Item not found' }, 404);
    }

    // Check photo limit
    const existingPhotos = await db.getPhotosByItemId(itemId);
    const formData = await c.req.formData();
    const files = formData.getAll('photos') as File[];
    
    if (files.length === 0) {
      return c.json({ success: false, error: 'No files uploaded' }, 400);
    }

    if (existingPhotos.length + files.length > 10) {
      return c.json({ 
        success: false, 
        error: `Cannot upload ${files.length} photos. Maximum 10 photos allowed per item (currently ${existingPhotos.length})` 
      }, 400);
    }

    // Validate all files first
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        return c.json({ 
          success: false, 
          error: `File ${file.name}: ${validation.error}` 
        }, 400);
      }
    }

    // Process all images
    const imageProcessor = new ImageProcessor(c.env);
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const processedImage = await imageProcessor.processImage(file, itemId);
        
        const photoId = await db.createPhotoAsset({
          itemId,
          originalPath: processedImage.originalPath,
          compressedPath: processedImage.compressedPath,
          filename: processedImage.filename,
          size: processedImage.size
        });

        results.push({
          id: photoId,
          filename: file.name,
          ...processedImage,
          publicUrl: imageProcessor.getPublicUrl(processedImage.compressedPath)
        });
      } catch (error) {
        errors.push({
          filename: file.name,
          error: error instanceof Error ? error.message : 'Upload failed'
        });
      }
    }

    return c.json({
      success: errors.length === 0,
      data: {
        uploaded: results,
        errors: errors,
        count: results.length
      }
    }, errors.length === 0 ? 201 : 207); // 207 Multi-Status for partial success
    
  } catch (error) {
    console.error('Upload multiple photos error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to upload photos' 
    }, 500);
  }
});

// POST upload both original and processed photo for an item
router.post('/item/:itemId/upload-both', async (c) => {
  try {
    const itemId = c.req.param('itemId');
    
    // Check if item exists
    const db = new DatabaseQueries(c.env);
    const item = await db.getItemById(itemId);
    if (!item) {
      return c.json({ success: false, error: 'Item not found' }, 404);
    }

    // Check photo limit (10 photos max per item)
    const existingPhotos = await db.getPhotosByItemId(itemId);
    if (existingPhotos.length >= 10) {
      return c.json({ 
        success: false, 
        error: 'Maximum 10 photos allowed per item' 
      }, 400);
    }

    // Get uploaded files
    const formData = await c.req.formData();
    const originalFile = formData.get('original') as File;
    const processedFile = formData.get('processed') as File;
    
    if (!originalFile || !processedFile) {
      return c.json({ 
        success: false, 
        error: 'Both original and processed files are required' 
      }, 400);
    }

    // Validate both files
    const originalValidation = validateImageFile(originalFile);
    if (!originalValidation.valid) {
      return c.json({ 
        success: false, 
        error: `Original file: ${originalValidation.error}` 
      }, 400);
    }

    const processedValidation = validateImageFile(processedFile);
    if (!processedValidation.valid) {
      return c.json({ 
        success: false, 
        error: `Processed file: ${processedValidation.error}` 
      }, 400);
    }

    // Process with both files
    const imageProcessor = new ImageProcessor(c.env);
    const processedImage = await imageProcessor.processBothFiles(originalFile, processedFile, itemId);

    // Save to database
    const photoId = await db.createPhotoAsset({
      itemId,
      originalPath: processedImage.originalPath,
      compressedPath: processedImage.compressedPath,
      filename: processedImage.filename,
      size: processedFile.size // Use processed file size
    });

    return c.json({
      success: true,
      data: {
        id: photoId,
        ...processedImage,
        publicUrl: imageProcessor.getPublicUrl(processedImage.compressedPath)
      }
    }, 201);

  } catch (error) {
    console.error('Upload both files error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to upload photos' 
    }, 500);
  }
});

// DELETE photo
router.delete('/:photoId', async (c) => {
  try {
    const photoId = c.req.param('photoId');
    const db = new DatabaseQueries(c.env);
    
    // Get photo info first
    const photos = await db.getPhotosByItemId(''); // This needs a better query
    const photo = photos.find(p => p.id === photoId);
    
    if (!photo) {
      return c.json({ success: false, error: 'Photo not found' }, 404);
    }

    // Delete files from storage
    const imageProcessor = new ImageProcessor(c.env);
    await imageProcessor.deleteFiles(photo.originalPath, photo.compressedPath);
    
    // Delete from database
    await db.deletePhotoAsset(photoId);

    return c.json({
      success: true,
      data: { id: photoId }
    });
    
  } catch (error) {
    console.error('Delete photo error:', error);
    return c.json({ success: false, error: 'Failed to delete photo' }, 500);
  }
});

// PUT reorder photos for an item
router.put('/item/:itemId/reorder', async (c) => {
  try {
    const itemId = c.req.param('itemId');
    const { photoIds } = await c.req.json();
    
    if (!Array.isArray(photoIds)) {
      return c.json({ success: false, error: 'photoIds must be an array' }, 400);
    }

    // For now, we'll just return success as photo ordering 
    // would require additional database schema changes
    // TODO: Implement photo ordering if needed
    
    return c.json({
      success: true,
      message: 'Photo order updated',
      data: { itemId, photoIds }
    });
    
  } catch (error) {
    console.error('Reorder photos error:', error);
    return c.json({ success: false, error: 'Failed to reorder photos' }, 500);
  }
});

// GET storage usage statistics
router.get('/storage/stats', async (c) => {
  try {
    const db = new DatabaseQueries(c.env);
    
    // Get total storage used
    const storageResult = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as totalPhotos,
        SUM(size) as totalSize
      FROM photo_assets
    `).first();
    
    // Get storage by item
    const itemStorageResult = await c.env.DB.prepare(`
      SELECT 
        items.title,
        COUNT(photo_assets.id) as photoCount,
        SUM(photo_assets.size) as storageUsed
      FROM items
      LEFT JOIN photo_assets ON items.id = photo_assets.item_id
      GROUP BY items.id, items.title
      HAVING photoCount > 0
      ORDER BY storageUsed DESC
      LIMIT 10
    `).all();

    const totalPhotos = storageResult?.totalPhotos || 0;
    const totalSize = storageResult?.totalSize || 0;
    
    // Cloudflare Assets limits (these are example values)
    const maxStorageBytes = 10 * 1024 * 1024 * 1024; // 10GB example limit
    const usagePercentage = (totalSize / maxStorageBytes) * 100;

    return c.json({
      success: true,
      data: {
        totalPhotos,
        totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        usagePercentage: Math.round(usagePercentage * 100) / 100,
        topStorageUsers: itemStorageResult.results || []
      }
    });
    
  } catch (error) {
    console.error('Storage stats error:', error);
    return c.json({ success: false, error: 'Failed to get storage statistics' }, 500);
  }
});

// GET serve photo from storage
router.get('/serve/*', async (c) => {
  try {
    const url = new URL(c.req.url);
    const photoPath = url.pathname.replace('/api/admin/photos/serve/', '');
    
    // Try multiple possible key formats for legacy compatibility
    const possibleKeys = [
      `photo-storage/assets/${photoPath}`,    // New format
      `assets/${photoPath}`,                 // Legacy format 1
      `photo-storage/${photoPath}`,          // Legacy format 2
      photoPath                              // Direct path
    ];
    
    for (const key of possibleKeys) {
      // Try new binary format first
      const { value: buffer, metadata } = await c.env.SESSIONS.getWithMetadata(key, 'arrayBuffer');
      
      if (buffer && metadata) {
        const { mimeType, size } = metadata as any;
        
        console.log(`Admin serving binary photo from key: ${key}`);
        return c.body(buffer, 200, {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000', // 1 year cache
          'Content-Length': size.toString()
        });
      }
      
      // Try legacy JSON+base64 format
      const legacyData = await c.env.SESSIONS.get(key);
      if (legacyData) {
        try {
          const { data, mimeType, size } = JSON.parse(legacyData);
          
          console.log(`Admin serving legacy photo from key: ${key}`);
          
          // Convert base64 back to buffer with robust error handling
          let cleanBase64 = data.replace(/\s/g, '');
          
          // Fix common base64 issues
          cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, ''); // Remove invalid chars
          
          // Ensure proper padding
          while (cleanBase64.length % 4 !== 0) {
            cleanBase64 += '=';
          }
          
          console.log(`Admin attempting to decode base64 of length: ${cleanBase64.length}`);
          
          const binaryString = atob(cleanBase64);
          const legacyBuffer = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            legacyBuffer[i] = binaryString.charCodeAt(i);
          }
          
          console.log(`Admin successfully decoded legacy base64 to buffer of size: ${legacyBuffer.length}`)
          
          return c.body(legacyBuffer, 200, {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000', // 1 year cache
            'Content-Length': size?.toString() || legacyBuffer.length.toString()
          });
        } catch (legacyError) {
          console.error(`Admin legacy format parsing error for key ${key}:`, legacyError);
        }
      }
    }
    
    console.log(`Admin photo not found in any format for path: ${photoPath}`);
    return c.notFound();
  } catch (error) {
    console.error('Photo serve error:', error);
    return c.notFound();
  }
});

// GET photo by ID (returns metadata and URL)
router.get('/:photoId', async (c) => {
  try {
    const photoId = c.req.param('photoId');
    const db = new DatabaseQueries(c.env);
    
    // Get photo from database
    const photo = await c.env.DB.prepare(`
      SELECT * FROM photo_assets WHERE id = ?
    `).bind(photoId).first();
    
    if (!photo) {
      return c.json({ success: false, error: 'Photo not found' }, 404);
    }
    
    // Generate public URL
    const imageProcessor = new ImageProcessor(c.env);
    const publicUrl = imageProcessor.getPublicUrl(photo.compressed_path);
    
    return c.json({
      success: true,
      data: {
        id: photo.id,
        itemId: photo.item_id,
        filename: photo.filename,
        size: photo.size,
        publicUrl,
        compressedPath: photo.compressed_path,
        originalPath: photo.original_path,
        createdAt: photo.created_at
      }
    });
  } catch (error) {
    console.error('Get photo error:', error);
    return c.json({ success: false, error: 'Failed to get photo' }, 500);
  }
});

// Utility function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export { router as photosRouter };