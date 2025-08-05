import type { Env } from '../types';

export interface ProcessedImage {
  originalPath: string;
  compressedPath: string;
  filename: string;
  size: number;
  width?: number;
  height?: number;
}

export class ImageProcessor {
  constructor(private env: Env) {}

  async processImage(file: File, itemId: string): Promise<ProcessedImage> {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (25MB max)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 25MB');
    }

    // Generate unique filename
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().split('-')[0];
    const filename = `${itemId}_${timestamp}_${randomId}`;
    
    const originalPath = `assets/originals/${filename}.${extension}`;
    const compressedPath = `assets/resized/${filename}.jpg`;

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = new Uint8Array(arrayBuffer);

    try {
      // Store original file
      await this.storeFile(originalPath, originalBuffer, file.type);

      // Process and compress image using Canvas API in Worker
      const processedResult = await this.resizeAndCompressImage(originalBuffer, file.type);
      
      // Store compressed file
      await this.storeFile(compressedPath, processedResult.buffer, 'image/jpeg');

      return {
        originalPath,
        compressedPath,
        filename,
        size: file.size,
        width: processedResult.width,
        height: processedResult.height
      };
    } catch (error) {
      // Cleanup on error
      try {
        await this.deleteFile(originalPath);
        await this.deleteFile(compressedPath);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      throw error;
    }
  }

  private async resizeAndCompressImage(buffer: Uint8Array, mimeType: string): Promise<{
    buffer: Uint8Array;
    width: number;
    height: number;
  }> {
    try {
      // Create blob from the buffer
      const blob = new Blob([buffer], { type: mimeType });
      
      // Create ImageBitmap from blob (supported in Workers)
      const imageBitmap = await createImageBitmap(blob);
      
      const originalWidth = imageBitmap.width;
      const originalHeight = imageBitmap.height;
      
      // Calculate new dimensions (max 1920px on longest side)
      const maxSize = 1920;
      let newWidth = originalWidth;
      let newHeight = originalHeight;
      
      if (originalWidth > maxSize || originalHeight > maxSize) {
        if (originalWidth > originalHeight) {
          newHeight = Math.round((originalHeight * maxSize) / originalWidth);
          newWidth = maxSize;
        } else {
          newWidth = Math.round((originalWidth * maxSize) / originalHeight);
          newHeight = maxSize;
        }
      }
      
      // Create OffscreenCanvas for processing
      const canvas = new OffscreenCanvas(newWidth, newHeight);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Cannot create canvas context');
      }
      
      // Draw the resized image
      ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);
      
      // Convert to JPEG with 80% quality
      const compressedBlob = await canvas.convertToBlob({
        type: 'image/jpeg',
        quality: 0.8 // 80% quality as per ТЗ
      });
      
      // Convert blob back to buffer
      const compressedBuffer = new Uint8Array(await compressedBlob.arrayBuffer());
      
      // Close the ImageBitmap to free memory
      imageBitmap.close();
      
      console.log(`Resized and compressed image: ${buffer.length} -> ${compressedBuffer.length} bytes, ${newWidth}x${newHeight}px`);
      
      return {
        buffer: compressedBuffer,
        width: newWidth,
        height: newHeight
      };
    } catch (error) {
      console.error('Image processing error:', error);
      
      // Fallback: simple compression without resizing
      try {
        return await this.fallbackCompression(buffer, mimeType);
      } catch (fallbackError) {
        console.error('Fallback compression failed:', fallbackError);
        return {
          buffer: buffer,
          width: 1920,
          height: 1080
        };
      }
    }
  }
  
  private async fallbackCompression(buffer: Uint8Array, mimeType: string): Promise<{
    buffer: Uint8Array;
    width: number;
    height: number;
  }> {
    try {
      // Try basic Canvas compression without resizing
      const blob = new Blob([buffer], { type: mimeType });
      const imageBitmap = await createImageBitmap(blob);
      
      const width = imageBitmap.width;
      const height = imageBitmap.height;
      
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(imageBitmap, 0, 0);
        
        const compressedBlob = await canvas.convertToBlob({
          type: 'image/jpeg',
          quality: 0.8
        });
        
        const compressedBuffer = new Uint8Array(await compressedBlob.arrayBuffer());
        imageBitmap.close();
        
        console.log(`Fallback Canvas compression: ${buffer.length} -> ${compressedBuffer.length} bytes`);
        
        return {
          buffer: compressedBuffer,
          width,
          height
        };
      }
    } catch (error) {
      console.error('Canvas fallback failed:', error);
    }
    
    // Ultimate fallback - just return original if everything fails
    console.log(`No compression applied, returning original: ${buffer.length} bytes`);
    return {
      buffer: buffer,
      width: 1920, // Estimated dimensions
      height: 1080
    };
  }

  private async storeFile(path: string, buffer: Uint8Array, mimeType: string): Promise<void> {
    try {
      // Store files in KV namespace
      // Оригиналы помечаем как originals/, сжатые как resized/
      const key = `photo-storage/${path}`;
      const base64Data = btoa(String.fromCharCode(...buffer));
      
      // Store in KV with metadata
      await this.env.SESSIONS.put(key, JSON.stringify({
        data: base64Data,
        mimeType,
        size: buffer.length,
        uploadedAt: new Date().toISOString(),
        isOriginal: path.includes('originals/'),
        isCompressed: path.includes('resized/')
      }));
      
      console.log(`Stored file in KV: ${path}, size: ${buffer.length}, type: ${mimeType}`);
    } catch (error) {
      console.error('File storage error:', error);
      throw new Error('Failed to store file');
    }
  }

  private async deleteFile(path: string): Promise<void> {
    try {
      const key = `photo-storage/${path}`;
      await this.env.SESSIONS.delete(key);
      console.log(`Deleted file from KV: ${path}`);
    } catch (error) {
      console.error('File deletion error:', error);
      // Don't throw - deletion errors shouldn't break the main flow
    }
  }

  async deleteFiles(originalPath: string, compressedPath: string): Promise<void> {
    await Promise.all([
      this.deleteFile(originalPath),
      this.deleteFile(compressedPath)
    ]);
  }

  getPublicUrl(path: string): string {
    // Return public URL for the compressed image
    // Serve through public photo endpoint (only compressed images are publicly accessible)
    return `/api/photos/serve/${path.replace('assets/', '')}`;
  }
}

// Utility function to validate image files
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }

  // Check file size (25MB max)
  const maxSize = 25 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 25MB' };
  }

  // Check supported formats
  const supportedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff'
  ];

  if (!supportedTypes.includes(file.type.toLowerCase())) {
    return { valid: false, error: 'Unsupported image format' };
  }

  return { valid: true };
}