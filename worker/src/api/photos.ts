import { Hono } from 'hono';
import type { Env } from '../types';
import { DatabaseQueries } from '../db/queries';
import { R2ImageProcessor, type ImageVariant } from '../lib/r2-image-processor';

// No longer needed - KV stores binary data directly

const router = new Hono<{ Bindings: Env }>();

// GET photos for an item
router.get('/item/:itemId', async (c) => {
  try {
    const itemId = c.req.param('itemId');
    const db = new DatabaseQueries(c.env);
    const photos = await db.getPhotosByItemId(itemId);
    
    // Convert to format expected by PhotoUploader with public URLs
    const r2Processor = new R2ImageProcessor(c.env.PHOTOS_BUCKET, c.env.R2_PUBLIC_URL);
    const photosWithUrls = photos.map(photo => {
      // All photos are now in R2
      const imageUrls = r2Processor.getImageUrls(
        photo.originalPath, 
        photo.compressedPath, 
        photo.thumbnailPath
      );
      return {
        id: photo.id,
        url: imageUrls.compressedUrl,
        thumbnailUrl: imageUrls.thumbnailUrl,
        filename: photo.filename,
        alt: photo.alt,
        caption: photo.caption,
        orderIndex: photo.orderIndex
      };
    });
    
    return c.json({
      success: true,
      data: photosWithUrls
    });
  } catch (error) {
    console.error('Get photos error:', error);
    return c.json({ success: false, error: 'Failed to fetch photos' }, 500);
  }
});

// Validation function for image files
function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 25MB)
  const maxSize = 25 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size too large (max 25MB)' };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' };
  }

  return { valid: true };
}

// POST upload photo for an item (expects pre-resized variants from client)
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

    // Get uploaded files (client sends 3 variants: original, compressed, thumbnail)
    const formData = await c.req.formData();
    const originalFile = formData.get('original') as File;
    const compressedFile = formData.get('compressed') as File;
    const thumbnailFile = formData.get('thumbnail') as File;
    const width = parseInt(formData.get('width') as string);
    const height = parseInt(formData.get('height') as string);
    const alt = (formData.get('alt') as string) || null;
    const caption = (formData.get('caption') as string) || null;
    
    if (!originalFile || !compressedFile || !thumbnailFile) {
      return c.json({ 
        success: false, 
        error: 'Missing image variants. Client must send original, compressed (1920px), and thumbnail (400px) versions.' 
      }, 400);
    }

    // Validate files
    const validationResults = [
      { file: originalFile, name: 'original' },
      { file: compressedFile, name: 'compressed' },
      { file: thumbnailFile, name: 'thumbnail' }
    ].map(({ file, name }) => ({ 
      name, 
      validation: validateImageFile(file) 
    }));

    const invalidFiles = validationResults.filter(r => !r.validation.valid);
    if (invalidFiles.length > 0) {
      return c.json({ 
        success: false, 
        error: `Invalid files: ${invalidFiles.map(f => `${f.name}: ${f.validation.error}`).join(', ')}` 
      }, 400);
    }

    // Prepare variants for R2 storage
    const variants: ImageVariant[] = [
      { file: originalFile, path: '', variant: 'original' },
      { file: compressedFile, path: '', variant: 'compressed' },
      { file: thumbnailFile, path: '', variant: 'thumbnail' }
    ];

    // Save to R2
    const r2Processor = new R2ImageProcessor(c.env.PHOTOS_BUCKET, c.env.R2_PUBLIC_URL);
    const processedData = await r2Processor.saveProcessedImages(variants);
    
    // Update with actual dimensions
    processedData.width = width || 0;
    processedData.height = height || 0;

    // Default alt from item title if not provided
    const derivedAlt = alt || item.title;

    // Save to database
    const photoId = await db.createPhotoAsset({
      itemId,
      originalPath: processedData.originalPath,
      compressedPath: processedData.compressedPath,
      thumbnailPath: processedData.thumbnailPath,
      filename: processedData.filename,
      size: processedData.size,
      width: processedData.width,
      height: processedData.height,
      alt: derivedAlt || undefined,
      caption: caption || undefined
    });

    // Get URLs for response
    const imageUrls = r2Processor.getImageUrls(
      processedData.originalPath,
      processedData.compressedPath,
      processedData.thumbnailPath
    );

    return c.json({
      success: true,
      data: {
        id: photoId,
        filename: processedData.filename,
        size: processedData.size,
        width: processedData.width,
        height: processedData.height,
        url: imageUrls.compressedUrl,
        thumbnailUrl: imageUrls.thumbnailUrl
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

// POST upload multiple photos for an item (expects pre-resized variants from client)
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
    
    // Parse multiple sets of variants (each photo sends 3 files + metadata)
    const photoSets: Array<{
      original: File;
      compressed: File;
      thumbnail: File;
      width: number;
      height: number;
      filename: string;
      alt: string | null;
      caption: string | null;
    }> = [];

    // Group files by photo index
    const photoIndices = new Set<string>();
    for (const [key] of formData.entries()) {
      const match = key.match(/^photo_(\d+)_/);
      if (match) {
        photoIndices.add(match[1]);
      }
    }

    for (const index of photoIndices) {
      const original = formData.get(`photo_${index}_original`) as File;
      const compressed = formData.get(`photo_${index}_compressed`) as File;
      const thumbnail = formData.get(`photo_${index}_thumbnail`) as File;
      const width = parseInt(formData.get(`photo_${index}_width`) as string);
      const height = parseInt(formData.get(`photo_${index}_height`) as string);
      const filename = formData.get(`photo_${index}_filename`) as string;
      const alt = (formData.get(`photo_${index}_alt`) as string) || null;
      const caption = (formData.get(`photo_${index}_caption`) as string) || null;

      if (original && compressed && thumbnail) {
        photoSets.push({ original, compressed, thumbnail, width, height, filename, alt, caption });
      }
    }
    
    if (photoSets.length === 0) {
      return c.json({ success: false, error: 'No photo sets uploaded' }, 400);
    }

    if (existingPhotos.length + photoSets.length > 10) {
      return c.json({ 
        success: false, 
        error: `Cannot upload ${photoSets.length} photos. Maximum 10 photos allowed per item (currently ${existingPhotos.length})` 
      }, 400);
    }

    // Validate all files first
    for (const photoSet of photoSets) {
      const validationResults = [
        { file: photoSet.original, name: 'original' },
        { file: photoSet.compressed, name: 'compressed' },
        { file: photoSet.thumbnail, name: 'thumbnail' }
      ].map(({ file, name }) => ({ name, validation: validateImageFile(file) }));

      const invalidFiles = validationResults.filter(r => !r.validation.valid);
      if (invalidFiles.length > 0) {
        return c.json({ 
          success: false, 
          error: `File ${photoSet.filename}: ${invalidFiles.map(f => `${f.name}: ${f.validation.error}`).join(', ')}` 
        }, 400);
      }
    }

    // Process all images
    const r2Processor = new R2ImageProcessor(c.env.PHOTOS_BUCKET, c.env.R2_PUBLIC_URL);
    const results = [];
    const errors = [];

    for (const photoSet of photoSets) {
      try {
        const variants: ImageVariant[] = [
          { file: photoSet.original, path: '', variant: 'original' },
          { file: photoSet.compressed, path: '', variant: 'compressed' },
          { file: photoSet.thumbnail, path: '', variant: 'thumbnail' }
        ];

        const processedData = await r2Processor.saveProcessedImages(variants);
        processedData.width = photoSet.width || 0;
        processedData.height = photoSet.height || 0;
        
        const photoId = await db.createPhotoAsset({
          itemId,
          originalPath: processedData.originalPath,
          compressedPath: processedData.compressedPath,
          thumbnailPath: processedData.thumbnailPath,
          filename: processedData.filename,
          size: processedData.size,
          width: processedData.width,
          height: processedData.height,
          alt: (photoSet.alt || item.title) || undefined,
          caption: photoSet.caption || undefined
        });

        const imageUrls = r2Processor.getImageUrls(
          processedData.originalPath,
          processedData.compressedPath,
          processedData.thumbnailPath
        );

        results.push({
          id: photoId,
          filename: photoSet.filename,
          url: imageUrls.compressedUrl,
          thumbnailUrl: imageUrls.thumbnailUrl
        });
      } catch (error) {
        errors.push({
          filename: photoSet.filename,
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

// POST upload-both (compatibility endpoint for old frontend)
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

    // Get uploaded files (old frontend sends original and processed)
    const formData = await c.req.formData();
    const originalFile = formData.get('original') as File;
    const processedFile = formData.get('processed') as File;
    
    if (!originalFile || !processedFile) {
      return c.json({ 
        success: false, 
        error: 'Missing files. Expected original and processed files.' 
      }, 400);
    }

    // Validate files
    const validationResults = [
      { file: originalFile, name: 'original' },
      { file: processedFile, name: 'processed' }
    ].map(({ file, name }) => ({ 
      name, 
      validation: validateImageFile(file) 
    }));

    const invalidFiles = validationResults.filter(r => !r.validation.valid);
    if (invalidFiles.length > 0) {
      return c.json({ 
        success: false, 
        error: `Invalid files: ${invalidFiles.map(f => `${f.name}: ${f.validation.error}`).join(', ')}` 
      }, 400);
    }

    // For compatibility, create a simple thumbnail from the processed file
    // We'll store: original, processed (as compressed), processed (as thumbnail)
    const variants: ImageVariant[] = [
      { file: originalFile, path: '', variant: 'original' },
      { file: processedFile, path: '', variant: 'compressed' },
      { file: processedFile, path: '', variant: 'thumbnail' } // Same as compressed for now
    ];

    // Save to R2
    const r2Processor = new R2ImageProcessor(c.env.PHOTOS_BUCKET, c.env.R2_PUBLIC_URL);
    const processedData = await r2Processor.saveProcessedImages(variants);
    
    // Get image dimensions from processed file (estimate)
    processedData.width = 1920; // Default assumption
    processedData.height = 1080;

    // Save to database (alt default from item title)
    const photoId = await db.createPhotoAsset({
      itemId,
      originalPath: processedData.originalPath,
      compressedPath: processedData.compressedPath,
      thumbnailPath: processedData.thumbnailPath,
      filename: processedData.filename,
      size: processedData.size,
      width: processedData.width,
      height: processedData.height,
      alt: item.title
    });

    // Get URLs for response
    const imageUrls = r2Processor.getImageUrls(
      processedData.originalPath,
      processedData.compressedPath,
      processedData.thumbnailPath
    );

    // Return in old format for compatibility
    return c.json({
      success: true,
      data: {
        id: photoId,
        url: imageUrls.compressedUrl,
        publicUrl: imageUrls.compressedUrl, // Old field name
        filename: processedData.filename
      }
    }, 201);

  } catch (error) {
    console.error('Upload both photos error:', error);
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
    const photo = await db.getPhotoById(photoId);
    
    if (!photo) {
      return c.json({ success: false, error: 'Photo not found' }, 404);
    }

    // Delete only processed variants from R2 storage (keep original for export)
    const r2Processor = new R2ImageProcessor(c.env.PHOTOS_BUCKET, c.env.R2_PUBLIC_URL);
    await r2Processor.deleteFiles({
      compressed: photo.compressedPath,
      thumbnail: photo.thumbnailPath
    });
    
    // Soft-delete in database
    await db.softDeletePhotoAsset(photoId);
    await db.logAdminAction('soft_delete', 'photo', photoId);

    return c.json({
      success: true,
      data: { id: photoId }
    });
    
  } catch (error) {
    console.error('Delete photo error:', error);
    return c.json({ success: false, error: 'Failed to delete photo' }, 500);
  }
});

// PUT restore photo (recreate compressed/thumbnail, keep original as-is)
router.put('/:photoId/restore', async (c) => {
  try {
    const photoId = c.req.param('photoId');
    const db = new DatabaseQueries(c.env);

    const photo = await db.getPhotoById(photoId);
    if (!photo) {
      return c.json({ success: false, error: 'Photo not found' }, 404);
    }

    const formData = await c.req.formData();
    const compressedFile = formData.get('compressed') as File | null;
    const thumbnailFile = formData.get('thumbnail') as File | null;

    const r2Processor = new R2ImageProcessor(c.env.PHOTOS_BUCKET, c.env.R2_PUBLIC_URL);

    let newCompressedPath: string | undefined;
    let newThumbnailPath: string | undefined;

    if (compressedFile || thumbnailFile) {
      const variants: ImageVariant[] = [];
      if (compressedFile) variants.push({ file: compressedFile, path: '', variant: 'compressed' });
      if (thumbnailFile) variants.push({ file: thumbnailFile, path: '', variant: 'thumbnail' });

      const saved = await r2Processor.saveDerivedVariants(photo.filename, variants);
      newCompressedPath = saved.compressedPath;
      newThumbnailPath = saved.thumbnailPath;
    }

    // Update DB: clear deleted, optionally update paths
    await db.restorePhotoAsset(photoId, {
      compressedPath: newCompressedPath,
      thumbnailPath: newThumbnailPath,
    });
    await db.logAdminAction('restore', 'photo', photoId);

    const urls = r2Processor.getImageUrls(photo.originalPath, newCompressedPath || photo.compressedPath, newThumbnailPath || photo.thumbnailPath);

    return c.json({
      success: true,
      data: {
        id: photoId,
        url: urls.compressedUrl,
        thumbnailUrl: urls.thumbnailUrl,
        originalUrl: urls.originalUrl,
      }
    });
  } catch (error) {
    console.error('Restore photo error:', error);
    return c.json({ success: false, error: 'Failed to restore photo' }, 500);
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

    for (let index = 0; index < photoIds.length; index++) {
      const id = photoIds[index];
      await c.env.DB.prepare(`UPDATE photo_assets SET order_index = ? WHERE id = ? AND item_id = ?`)
        .bind(index, id, itemId)
        .run();
    }

    const db = new DatabaseQueries(c.env);
    await db.logAdminAction('reorder', 'photo', itemId, { photoIds });

    return c.json({ success: true, message: 'Photo order updated' });
    
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

    const totalPhotos = (storageResult as any)?.totalPhotos || 0;
    const totalSize = (storageResult as any)?.totalSize || 0;
    
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
    
    // Generate R2 URLs for all photos
    const r2Processor = new R2ImageProcessor(c.env.PHOTOS_BUCKET, c.env.R2_PUBLIC_URL);
    const imageUrls = r2Processor.getImageUrls(
      (photo as any).original_path,
      (photo as any).compressed_path,
      (photo as any).thumbnail_path
    );
    const publicUrl = imageUrls.compressedUrl;
    const thumbnailUrl = imageUrls.thumbnailUrl;
    const originalUrl = imageUrls.originalUrl;
    
    return c.json({
      success: true,
      data: {
        id: (photo as any).id,
        itemId: (photo as any).item_id,
        filename: (photo as any).filename,
        size: (photo as any).size,
        width: (photo as any).width,
        height: (photo as any).height,
        url: publicUrl,
        thumbnailUrl,
        originalUrl,
        compressedPath: (photo as any).compressed_path,
        originalPath: (photo as any).original_path,
        thumbnailPath: (photo as any).thumbnail_path,
        createdAt: (photo as any).created_at
      }
    });
  } catch (error) {
    console.error('Get photo error:', error);
    return c.json({ success: false, error: 'Failed to get photo' }, 500);
  }
});

// PATCH update photo metadata (alt/caption)
router.patch('/:photoId', async (c) => {
  try {
    const photoId = c.req.param('photoId');
    const db = new DatabaseQueries(c.env);
    const body = await c.req.json();
    const alt = typeof body.alt === 'string' ? body.alt : null;
    const caption = typeof body.caption === 'string' ? body.caption : null;

    // Update fields
    const fields: string[] = [];
    const values: any[] = [];
    if (alt !== null) { fields.push('alt = ?'); values.push(alt); }
    if (caption !== null) { fields.push('caption = ?'); values.push(caption); }

    if (fields.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400);
    }

    values.push(photoId);
    await c.env.DB.prepare(`UPDATE photo_assets SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    await db.logAdminAction('update', 'photo', photoId, { alt, caption });

    return c.json({ success: true });
  } catch (error) {
    console.error('Update photo metadata error:', error);
    return c.json({ success: false, error: 'Failed to update photo metadata' }, 500);
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