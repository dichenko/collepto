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

      // Files are now pre-processed on client side, so just store as "compressed" version
      // No need to process again - client already resized to 1920px and converted to JPEG at 80% quality
      await this.storeFile(compressedPath, originalBuffer, file.type);

      return {
        originalPath,
        compressedPath,
        filename,
        size: file.size,
        width: 1920, // Files are pre-processed on client to max 1920px
        height: 1080 // Estimated height - actual dimensions vary
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

  // New method to handle both original and processed files separately
  async processBothFiles(originalFile: File, processedFile: File, itemId: string): Promise<{
    originalPath: string;
    compressedPath: string;
    filename: string;
    size: number;
    width: number;
    height: number;
  }> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 8);
    const baseFilename = `${itemId}_${timestamp}_${randomId}`;
    
    const originalPath = `assets/originals/${baseFilename}.${originalFile.name.split('.').pop()}`;
    const compressedPath = `assets/resized/${baseFilename}.jpg`;

    // Read file buffers
    const originalBuffer = new Uint8Array(await originalFile.arrayBuffer());
    const processedBuffer = new Uint8Array(await processedFile.arrayBuffer());

    try {
      // Store REAL original file (unprocessed)
      await this.storeFile(originalPath, originalBuffer, originalFile.type);

      // Store processed file (resized & compressed from client)
      await this.storeFile(compressedPath, processedBuffer, processedFile.type);

      return {
        originalPath,
        compressedPath,
        filename: baseFilename + '.jpg',
        size: processedFile.size,
        width: 1920, // Files are pre-processed on client to max 1920px
        height: 1080 // Estimated height - actual dimensions vary
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

  // Image processing is now handled on client-side
  // No server-side processing needed - files arrive pre-processed

  private async storeFile(path: string, buffer: Uint8Array, mimeType: string): Promise<void> {
    try {
      // Store files in KV namespace
      // Оригиналы помечаем как originals/, сжатые как resized/
      const key = `photo-storage/${path}`;
      
      // Store binary data directly in KV (no base64 needed!)
      await this.env.SESSIONS.put(key, buffer, {
        metadata: {
          mimeType,
          size: buffer.length,
          uploadedAt: new Date().toISOString(),
          isOriginal: path.includes('originals/'),
          isCompressed: path.includes('resized/')
        }
      });
      
      console.log(`Stored binary file in KV: ${path}, size: ${buffer.length}, type: ${mimeType}`);
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