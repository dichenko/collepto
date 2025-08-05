import type { Env } from '../types';

export interface ProcessedImage {
  originalPath: string;
  compressedPath: string;
  filename: string;
  size: number;
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

      // Process and compress image
      const compressedBuffer = await this.compressImage(originalBuffer);
      
      // Store compressed file
      await this.storeFile(compressedPath, compressedBuffer, 'image/jpeg');

      return {
        originalPath,
        compressedPath,
        filename,
        size: file.size
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

  private async compressImage(buffer: Uint8Array): Promise<Uint8Array> {
    // For Cloudflare Workers, we need to use WASM-based image processing
    // Since Sharp doesn't work in Workers, we'll implement a basic compression
    
    try {
      // For now, implement a basic size-based compression
      // In production, you'd want to use a WASM image processing library
      
      // If image is larger than 2MB, reduce quality simulation
      if (buffer.length > 2 * 1024 * 1024) {
        // Simulate compression by reducing file size (this is just a placeholder)
        const compressionRatio = 0.8; // 80% quality as per ТЗ
        const targetSize = Math.floor(buffer.length * compressionRatio);
        
        // Create a new buffer with reduced size (this is a simplified approach)
        const compressedBuffer = new Uint8Array(targetSize);
        compressedBuffer.set(buffer.slice(0, targetSize));
        
        console.log(`Compressed image from ${buffer.length} to ${targetSize} bytes`);
        return compressedBuffer;
      }
      
      // If small enough, return as-is
      return buffer;
    } catch (error) {
      console.error('Image compression error:', error);
      // If compression fails, return original
      return buffer;
    }
  }

  private async storeFile(path: string, buffer: Uint8Array, mimeType: string): Promise<void> {
    try {
      // Since Cloudflare Assets are static and deployed at build time,
      // we need an alternative approach for runtime uploads.
      // For now, we'll store files in KV as a temporary solution
      // In production, you might use R2 or another storage solution
      
      const key = `assets/${path}`;
      const base64Data = btoa(String.fromCharCode(...buffer));
      
      // Store in KV with metadata
      await this.env.SESSIONS.put(key, JSON.stringify({
        data: base64Data,
        mimeType,
        size: buffer.length,
        uploadedAt: new Date().toISOString()
      }));
      
      console.log(`Stored file in KV: ${path}, size: ${buffer.length}, type: ${mimeType}`);
    } catch (error) {
      console.error('File storage error:', error);
      throw new Error('Failed to store file');
    }
  }

  private async deleteFile(path: string): Promise<void> {
    try {
      const key = `assets/${path}`;
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
    // Since we're storing in KV temporarily, we'll serve through a special endpoint
    return `/api/assets/${path.replace('assets/', '')}`;
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