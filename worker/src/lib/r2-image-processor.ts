export interface ProcessedImageData {
  originalPath: string;
  compressedPath: string;
  thumbnailPath: string;
  filename: string;
  size: number;
  width: number;
  height: number;
}

export interface ImageVariant {
  file: File;
  path: string;
  variant: 'original' | 'compressed' | 'thumbnail';
}

export class R2ImageProcessor {
  private bucket: R2Bucket;
  private baseUrl: string;

  constructor(bucket: R2Bucket, baseUrl?: string) {
    this.bucket = bucket;
    // Use provided baseUrl or fallback to hardcoded R2 URL
    this.baseUrl = baseUrl || 'https://pub-b8b2a61ea8f94c7580a7e39b14a08c8b.r2.dev';
  }

  /**
   * Сохраняет уже обработанные клиентом изображения в R2
   * @param variants - массив изображений (оригинал, сжатая, миниатюра)
   * @returns метаданные сохраненных файлов
   */
  async saveProcessedImages(variants: ImageVariant[]): Promise<ProcessedImageData> {
    const timestamp = Date.now();
    const baseFilename = variants.find(v => v.variant === 'original')?.file.name || 'image';
    const filenameWithoutExt = baseFilename.replace(/\.[^/.]+$/, '');
    const ext = baseFilename.split('.').pop() || 'jpg';

    let processedData: Partial<ProcessedImageData> = {
      filename: baseFilename,
      size: 0,
      width: 0,
      height: 0
    };

    // Сохраняем каждый вариант в R2
    for (const variant of variants) {
      const path = this.generateFilePath(filenameWithoutExt, ext, variant.variant, timestamp);
      
      await this.bucket.put(path, variant.file.stream(), {
        httpMetadata: {
          contentType: variant.file.type,
        },
      });

      // Сохраняем пути и метаданные
      switch (variant.variant) {
        case 'original':
          processedData.originalPath = path;
          processedData.size = variant.file.size;
          // Размеры будут переданы отдельно с клиента
          break;
        case 'compressed':
          processedData.compressedPath = path;
          break;
        case 'thumbnail':
          processedData.thumbnailPath = path;
          break;
      }
    }

    return processedData as ProcessedImageData;
  }

  /**
   * Сохраняет только производные варианты (compressed/thumbnail) для существующего файла
   * @param baseFilename - исходное имя файла (для генерации путей)
   * @param variants - массив изображений (compressed и/или thumbnail)
   */
  async saveDerivedVariants(baseFilename: string, variants: ImageVariant[]): Promise<Pick<ProcessedImageData, 'compressedPath' | 'thumbnailPath' | 'filename'>> {
    const timestamp = Date.now();
    const filenameWithoutExt = baseFilename.replace(/\.[^/.]+$/, '');
    const ext = baseFilename.split('.').pop() || 'jpg';

    const result: Partial<ProcessedImageData> = { filename: baseFilename };

    for (const variant of variants) {
      const path = this.generateFilePath(filenameWithoutExt, ext, variant.variant, timestamp);
      await this.bucket.put(path, variant.file.stream(), {
        httpMetadata: {
          contentType: variant.file.type,
        },
      });

      if (variant.variant === 'compressed') {
        result.compressedPath = path;
      } else if (variant.variant === 'thumbnail') {
        result.thumbnailPath = path;
      }
    }

    return {
      compressedPath: result.compressedPath!,
      thumbnailPath: result.thumbnailPath!,
      filename: baseFilename,
    };
  }

  /**
   * Генерирует путь к файлу в R2
   */
  private generateFilePath(filename: string, ext: string, variant: string, timestamp: number): string {
    return `${variant}/${timestamp}_${filename}.${ext}`;
  }

  /**
   * Получает публичный URL для файла в R2
   */
  getPublicUrl(path: string): string {
    // Use configured base URL for R2 public access
    return `${this.baseUrl}/${path}`;
  }

  /**
   * Удаляет файл из R2
   */
  async deleteFile(path: string): Promise<void> {
    try {
      await this.bucket.delete(path);
    } catch (error) {
      console.error(`Failed to delete file ${path}:`, error);
    }
  }

  /**
   * Удаляет все варианты изображения
   */
  async deleteFiles(paths: { original?: string; compressed?: string; thumbnail?: string }): Promise<void> {
    const deletionPromises: Promise<void>[] = [];

    if (paths.original) deletionPromises.push(this.deleteFile(paths.original));
    if (paths.compressed) deletionPromises.push(this.deleteFile(paths.compressed));
    if (paths.thumbnail) deletionPromises.push(this.deleteFile(paths.thumbnail));

    await Promise.all(deletionPromises);
  }

  /**
   * Получает URL-ы для всех вариантов изображения
   */
  getImageUrls(originalPath?: string, compressedPath?: string, thumbnailPath?: string) {
    return {
      originalUrl: originalPath ? this.getPublicUrl(originalPath) : null,
      compressedUrl: compressedPath ? this.getPublicUrl(compressedPath) : null,
      thumbnailUrl: thumbnailPath ? this.getPublicUrl(thumbnailPath) : null,
    };
  }
}
