import { Hono } from 'hono';
import type { Env } from '../types';
import { R2ImageProcessor, type ImageVariant } from '../lib/r2-image-processor';
import { generateUUID } from '../utils/uuid';

const router = new Hono<{ Bindings: Env }>();

interface Photo {
  id: string;
  itemId?: string;
  filename: string;
  originalPath: string;
  compressedPath: string;
  thumbnailPath: string;
  fileSize: number;
  width?: number;
  height?: number;
  altText?: string;
  caption?: string;
  sortOrder: number;
  status: 'active' | 'deleted' | 'processing';
  uploadSession?: string;
  createdAt: string;
  updatedAt: string;
}

// Валидация файлов
function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 25 * 1024 * 1024; // 25MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Файл слишком большой: ${(file.size / 1024 / 1024).toFixed(1)}MB. Максимум: 25MB`
    };
  }
  return { valid: true };
}

// POST /upload-session - создать новую сессию загрузки
router.post('/upload-session', async (c) => {
  try {
    const sessionId = generateUUID();
    return c.json({
      success: true,
      data: { sessionId }
    });
  } catch (error) {
    console.error('Create upload session error:', error);
    return c.json({ success: false, error: 'Failed to create upload session' }, 500);
  }
});

// POST /upload - загрузить фотографию
router.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const sessionId = formData.get('sessionId') as string;
    const itemId = formData.get('itemId') as string; // Опционально
    
    const originalFile = formData.get('original') as File;
    const compressedFile = formData.get('compressed') as File;
    const thumbnailFile = formData.get('thumbnail') as File;
    const width = parseInt(formData.get('width') as string) || 0;
    const height = parseInt(formData.get('height') as string) || 0;
    const altText = (formData.get('alt') as string) || '';
    const caption = (formData.get('caption') as string) || '';

    // Валидация
    if (!originalFile || !compressedFile || !thumbnailFile) {
      return c.json({
        success: false,
        error: 'Отсутствуют обязательные файлы (original, compressed, thumbnail)'
      }, 400);
    }

    // Валидация размеров файлов
    for (const file of [originalFile, compressedFile, thumbnailFile]) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        return c.json({ success: false, error: validation.error }, 400);
      }
    }

    // Проверка лимитов
    if (itemId) {
      const existingCount = await c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM photos WHERE item_id = ? AND status = 'active'`
      ).bind(itemId).first() as any;
      
      if (existingCount?.count >= 10) {
        return c.json({
          success: false,
          error: 'Превышен лимит: максимум 10 фотографий на предмет'
        }, 400);
      }
    }

    // Загрузка в R2
    const variants: ImageVariant[] = [
      { file: originalFile, path: '', variant: 'original' },
      { file: compressedFile, path: '', variant: 'compressed' },
      { file: thumbnailFile, path: '', variant: 'thumbnail' }
    ];

    const r2Processor = new R2ImageProcessor(c.env.PHOTOS_BUCKET, c.env.R2_PUBLIC_URL);
    const processedData = await r2Processor.saveProcessedImages(variants);

    // Сохранение в БД
    const photoId = generateUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO photos (
        id, item_id, filename, original_path, compressed_path, thumbnail_path,
        file_size, width, height, alt_text, caption, sort_order, status,
        upload_session, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, ?, ?)
    `).bind(
      photoId,
      itemId || null,
      processedData.filename,
      processedData.originalPath,
      processedData.compressedPath,
      processedData.thumbnailPath,
      processedData.size,
      width,
      height,
      altText || null,
      caption || null,
      sessionId,
      now,
      now
    ).run();

    // Возврат результата
    const imageUrls = r2Processor.getImageUrls(
      processedData.originalPath,
      processedData.compressedPath,
      processedData.thumbnailPath
    );

    return c.json({
      success: true,
      data: {
        id: photoId,
        url: imageUrls.compressedUrl,
        thumbnailUrl: imageUrls.thumbnailUrl,
        filename: processedData.filename
      }
    }, 201);

  } catch (error) {
    console.error('Upload photo error:', error);
    return c.json({
      success: false,
      error: 'Ошибка загрузки фотографии'
    }, 500);
  }
});

// POST /attach-to-item - привязать фотографии к предмету
router.post('/attach-to-item', async (c) => {
  try {
    const { sessionId, itemId } = await c.req.json();
    
    if (!sessionId || !itemId) {
      return c.json({
        success: false,
        error: 'Требуются sessionId и itemId'
      }, 400);
    }

    // Обновляем все фотографии сессии
    const result = await c.env.DB.prepare(`
      UPDATE photos 
      SET item_id = ?, upload_session = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE upload_session = ? AND item_id IS NULL
    `).bind(itemId, sessionId).run();

    return c.json({
      success: true,
      data: { updatedCount: result.changes }
    });

  } catch (error) {
    console.error('Attach photos to item error:', error);
    return c.json({
      success: false,
      error: 'Ошибка привязки фотографий к предмету'
    }, 500);
  }
});

// GET /item/:itemId - получить фотографии предмета
router.get('/item/:itemId', async (c) => {
  try {
    const itemId = c.req.param('itemId');
    
    const photos = await c.env.DB.prepare(`
      SELECT * FROM photos 
      WHERE item_id = ? AND status = 'active'
      ORDER BY sort_order ASC, created_at ASC
    `).bind(itemId).all();

    const r2Processor = new R2ImageProcessor(c.env.PHOTOS_BUCKET, c.env.R2_PUBLIC_URL);
    
    const photosWithUrls = (photos.results as any[]).map(photo => {
      const imageUrls = r2Processor.getImageUrls(
        photo.original_path,
        photo.compressed_path,
        photo.thumbnail_path
      );
      
      return {
        id: photo.id,
        url: imageUrls.compressedUrl,
        thumbnailUrl: imageUrls.thumbnailUrl,
        filename: photo.filename,
        alt: photo.alt_text,
        caption: photo.caption,
        sortOrder: photo.sort_order
      };
    });

    return c.json({
      success: true,
      data: photosWithUrls
    });

  } catch (error) {
    console.error('Get photos error:', error);
    return c.json({ success: false, error: 'Ошибка получения фотографий' }, 500);
  }
});

// DELETE /:photoId - удалить фотографию
router.delete('/:photoId', async (c) => {
  try {
    const photoId = c.req.param('photoId');
    
    // Мягкое удаление
    const result = await c.env.DB.prepare(`
      UPDATE photos 
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(photoId).run();

    if (result.changes === 0) {
      return c.json({ success: false, error: 'Фотография не найдена' }, 404);
    }

    return c.json({ success: true });

  } catch (error) {
    console.error('Delete photo error:', error);
    return c.json({ success: false, error: 'Ошибка удаления фотографии' }, 500);
  }
});

// PUT /reorder - изменить порядок фотографий
router.put('/reorder', async (c) => {
  try {
    const { photoIds } = await c.req.json();
    
    if (!Array.isArray(photoIds)) {
      return c.json({ success: false, error: 'photoIds должен быть массивом' }, 400);
    }

    // Обновляем порядок
    for (let i = 0; i < photoIds.length; i++) {
      await c.env.DB.prepare(`
        UPDATE photos 
        SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(i, photoIds[i]).run();
    }

    return c.json({ success: true });

  } catch (error) {
    console.error('Reorder photos error:', error);
    return c.json({ success: false, error: 'Ошибка изменения порядка' }, 500);
  }
});

export { router as photosV2Router };
