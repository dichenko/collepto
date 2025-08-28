import { Hono } from 'hono';
import type { Env } from '../types';
import { DatabaseQueries } from '../db/queries';
import { R2ImageProcessor, type ImageVariant } from '../lib/r2-image-processor';
import { generateUUID } from '../utils/uuid';

const router = new Hono<{ Bindings: Env }>();

// GET photos for an item
router.get('/item/:itemId', async (c) => {
  try {
    const itemId = c.req.param('itemId');
    const db = new DatabaseQueries(c.env);
    // Используем новую таблицу photos
    const photosResult = await c.env.DB.prepare(`
      SELECT id, filename, compressed_path, thumbnail_path, alt_text as alt, caption, sort_order as orderIndex
      FROM photos WHERE item_id = ? AND status = 'active' ORDER BY sort_order ASC, created_at ASC
    `).bind(itemId).all();
    
    const photos = photosResult.results as any[];
    
    // Convert to format expected by PhotoUploader with public URLs
    const r2Processor = new R2ImageProcessor(c.env.PHOTOS_BUCKET, c.env.R2_PUBLIC_URL);
    const photosWithUrls = photos.map(photo => {
      // All photos are now in R2
      const imageUrls = r2Processor.getImageUrls(
        '', // originalPath не нужен для отображения
        photo.compressed_path, 
        photo.thumbnail_path
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
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max allowed: 25MB`
    };
  }

  return { valid: true };
}

// POST upload photo for an item (or tempUpload)
router.post('/item/:itemId/upload', async (c) => {
  try {
    const itemIdParam = c.req.param('itemId');
    const formData = await c.req.formData();
    const tempUploadId = (formData.get('tempUploadId') as string) || '';

    const db = new DatabaseQueries(c.env);
    let item: any = null;

    // Check if this is a temp upload (itemId is '_temp' or tempUploadId is provided)
    const isTempUpload = itemIdParam === '_temp' || tempUploadId;

    if (!isTempUpload) {
      const itemId = itemIdParam;
      item = await db.getItemById(itemId);
      if (!item) return c.json({ success: false, error: 'Item not found' }, 404);
      const existingPhotosCount = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM photos WHERE item_id = ? AND status = 'active'
      `).bind(itemId).first() as any;
      if (existingPhotosCount?.count >= 10) {
        return c.json({ success: false, error: 'Maximum 10 photos allowed per item' }, 400);
      }
    }

    // Клиент отправляет только compressed и thumbnail (без original)
    const compressedFile = formData.get('compressed') as File;
    const thumbnailFile = formData.get('thumbnail') as File;
    const filename = (formData.get('filename') as string) || '';
    const width = parseInt(formData.get('width') as string) || 0;
    const height = parseInt(formData.get('height') as string) || 0;
    const alt = (formData.get('alt') as string) || null;
    const caption = (formData.get('caption') as string) || null;
    
    if (!compressedFile || !thumbnailFile) {
      return c.json({ 
        success: false, 
        error: 'Missing image files. Client must send compressed and thumbnail versions.' 
      }, 400);
    }

    // Validate files
    for (const f of [compressedFile, thumbnailFile]){
      const v = validateImageFile(f);
      if(!v.valid){ return c.json({ success:false, error: v.error }, 400); }
    }

    // Сохраняем только compressed и thumbnail (без original для экономии места)
    const variants: ImageVariant[] = [
      { file: compressedFile, path: '', variant: 'compressed' },
      { file: thumbnailFile, path: '', variant: 'thumbnail' }
    ];

    const r2Processor = new R2ImageProcessor(c.env.PHOTOS_BUCKET, c.env.R2_PUBLIC_URL);
    const processedData = await r2Processor.saveProcessedImages(variants);
    processedData.width = width || 0;
    processedData.height = height || 0;

    const altToUse = alt || (item?.title || '');

    // Используем новую таблицу photos напрямую
    const photoId = generateUUID();
    const sortOrder = await c.env.DB.prepare(`
      SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order 
      FROM photos 
      WHERE item_id = ? AND status = 'active'
    `).bind(isTempUpload ? null : itemIdParam).first() as any;
    
    await c.env.DB.prepare(`
      INSERT INTO photos (
        id, item_id, upload_session, filename, 
        original_path, compressed_path, thumbnail_path,
        width, height, file_size, alt_text, caption,
        sort_order, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
    `).bind(
      photoId,
      isTempUpload ? null : itemIdParam,
      isTempUpload ? (tempUploadId || generateUUID()) : null,
      filename || processedData.filename,
      '', // нет original_path, но поле NOT NULL
      processedData.compressedPath,
      processedData.thumbnailPath,
      processedData.width,
      processedData.height,
      processedData.size,
      altToUse || null,
      caption || null,
      sortOrder?.next_order || 0
    ).run();
    
    const newPhotoId = photoId;

    const urls = r2Processor.getImageUrls('', processedData.compressedPath, processedData.thumbnailPath);
    return c.json({ success:true, data: { id: newPhotoId, url: urls.compressedUrl, thumbnailUrl: urls.thumbnailUrl }}, 201);
  } catch (error) {
    console.error('Upload photo error:', error);
    return c.json({ success:false, error: 'Failed to upload photo' }, 500);
  }
});

// POST bind temp-uploaded photos to item after item creation
router.post('/bind-temp', async (c) => {
  try {
    const { tempUploadId, itemId } = await c.req.json();
    if (!tempUploadId || !itemId) return c.json({ success:false, error:'tempUploadId and itemId are required' }, 400);
    const db = new DatabaseQueries(c.env);
    // Обновляем временные фото, привязывая их к предмету
    await c.env.DB.prepare(`
      UPDATE photos SET item_id = ?, upload_session = NULL 
      WHERE upload_session = ? AND item_id IS NULL
    `).bind(itemId, tempUploadId).run();
    await db.logAdminAction('bind', 'photo', itemId, { tempUploadId });
    return c.json({ success:true });
  } catch (error) {
    console.error('Bind temp photos error:', error);
    return c.json({ success:false, error: 'Failed to bind temp photos' }, 500);
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
    const existingPhotosCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM photos WHERE item_id = ? AND status = 'active'
    `).bind(itemId).first() as any;
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

    if ((existingPhotosCount?.count || 0) + photoSets.length > 10) {
      return c.json({ 
        success: false, 
        error: `Cannot upload ${photoSets.length} photos. Maximum 10 photos allowed per item (currently ${existingPhotosCount?.count || 0})` 
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
        
        // Используем новую таблицу photos напрямую
        const photoId = generateUUID();
        const sortOrder = await c.env.DB.prepare(`
          SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order 
          FROM photos 
          WHERE item_id = ? AND status = 'active'
        `).bind(itemId).first() as any;
        
        await c.env.DB.prepare(`
          INSERT INTO photos (
            id, item_id, filename, 
            original_path, compressed_path, thumbnail_path,
            width, height, file_size, alt_text, caption,
            sort_order, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
        `).bind(
          photoId, itemId, processedData.filename,
          '', processedData.compressedPath, processedData.thumbnailPath,
          processedData.width, processedData.height, processedData.size,
          (photoSet.alt || item.title) || null, photoSet.caption || null,
          sortOrder?.next_order || 0
        ).run();

        const imageUrls = r2Processor.getImageUrls(
          '',
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
    const existingPhotosCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM photos WHERE item_id = ? AND status = 'active'
    `).bind(itemId).first() as any;
    if ((existingPhotosCount?.count || 0) >= 10) {
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
    const photoId = generateUUID();
    const sortOrder = await c.env.DB.prepare(`
      SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order 
      FROM photos 
      WHERE item_id = ? AND status = 'active'
    `).bind(itemId).first() as any;
    
    await c.env.DB.prepare(`
      INSERT INTO photos (
        id, item_id, filename, 
        original_path, compressed_path, thumbnail_path,
        width, height, file_size, alt_text,
        sort_order, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
    `).bind(
      photoId, itemId, processedData.filename,
      '', processedData.compressedPath, processedData.thumbnailPath,
      processedData.width, processedData.height, processedData.size,
      item.title || null, sortOrder?.next_order || 0
    ).run();

    // Get URLs for response
    const imageUrls = r2Processor.getImageUrls(
      '',
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
    
    // Get photo details before deletion
    const photo = await db.getPhotoById(photoId);
    if (!photo) {
      return c.json({ success: false, error: 'Photo not found' }, 404);
    }

    // Soft delete: mark as deleted and remove compressed/thumbnail from R2, keep original
    const r2Processor = new R2ImageProcessor(c.env.PHOTOS_BUCKET, c.env.R2_PUBLIC_URL);
    
    // Delete compressed and thumbnail from R2 (keep original for export)
    await r2Processor.deleteFiles({
      compressed: photo.compressedPath,
      thumbnail: photo.thumbnailPath
    });

    // Mark as deleted in database
    await c.env.DB.prepare(`
      UPDATE photo_assets SET deleted = 1 WHERE id = ?
    `).bind(photoId).run();

    await db.logAdminAction('delete', 'photo', photoId, { soft: true });

    return c.json({ success: true });
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
    
    // Get photo details
    const photo = await db.getPhotoById(photoId);
    if (!photo) {
      return c.json({ success: false, error: 'Photo not found' }, 404);
    }

    if (!photo.deleted) {
      return c.json({ success: false, error: 'Photo is not deleted' }, 400);
    }

    // Get original file from R2
    const r2Processor = new R2ImageProcessor(c.env.PHOTOS_BUCKET, c.env.R2_PUBLIC_URL);
    const originalObject = await c.env.PHOTOS_BUCKET.get(photo.originalPath);
    
    if (!originalObject) {
      return c.json({ success: false, error: 'Original file not found in storage' }, 404);
    }

    // TODO: This would require image processing on the server side
    // For now, just unmark as deleted without recreating derivatives
    await c.env.DB.prepare(`
      UPDATE photo_assets SET deleted = 0 WHERE id = ?
    `).bind(photoId).run();

    await db.logAdminAction('restore', 'photo', photoId, {});

    return c.json({ 
      success: true, 
      message: 'Photo restored. Note: compressed/thumbnail versions may need manual recreation.' 
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

    const db = new DatabaseQueries(c.env);
    
    // Update order_index for each photo
    for (let i = 0; i < photoIds.length; i++) {
      await c.env.DB.prepare(`
        UPDATE photo_assets SET order_index = ? WHERE id = ? AND item_id = ?
      `).bind(i, photoIds[i], itemId).run();
    }

    await db.logAdminAction('reorder', 'photo', itemId, { photoIds });

    return c.json({ success: true });
  } catch (error) {
    console.error('Reorder photos error:', error);
    return c.json({ success: false, error: 'Failed to reorder photos' }, 500);
  }
});

// GET storage usage statistics
router.get('/storage/stats', async (c) => {
  try {
    // Calculate total size of all photos in R2
    const photosResult = await c.env.DB.prepare(`
      SELECT SUM(size) as totalSize, COUNT(*) as totalCount 
      FROM photo_assets 
      WHERE deleted IS NULL OR deleted = 0
    `).first();

    const totalSize = (photosResult as any)?.totalSize || 0;
    const totalCount = (photosResult as any)?.totalCount || 0;

    // Estimate usage percentage (assuming 1GB limit for now)
    const limitBytes = 1024 * 1024 * 1024; // 1GB
    const usagePercentage = Math.round((totalSize / limitBytes) * 100);

    // Format size for display
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return c.json({
      success: true,
      data: {
        totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        totalCount,
        usagePercentage: Math.min(usagePercentage, 100),
        limitFormatted: formatBytes(limitBytes)
      }
    });
  } catch (error) {
    console.error('Storage stats error:', error);
    return c.json({ success: false, error: 'Failed to get storage stats' }, 500);
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
          const buffer = Uint8Array.from(atob(data), c => c.charCodeAt(0));
          
          console.log(`Admin serving legacy photo from key: ${key}`);
          return c.body(buffer, 200, {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000', // 1 year cache
            'Content-Length': size.toString()
          });
        } catch (parseError) {
          console.warn(`Failed to parse legacy photo data for key: ${key}`, parseError);
          continue;
        }
      }
    }
    
    console.log(`Photo not found for any of the possible keys:`, possibleKeys);
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

export { router as photosRouter };