import { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  AlertCircle
} from 'lucide-react';

interface PhotoWithOriginal {
  original: File;
  processed: File;
}

interface PhotoPreviewProps {
  photos: PhotoWithOriginal[];
  onPhotosChange: (photos: PhotoWithOriginal[]) => void;
  maxPhotos?: number;
}

export function PhotoPreview({ photos, onPhotosChange, maxPhotos = 10 }: PhotoPreviewProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we can upload more photos
  const canUploadMore = photos.length < maxPhotos;
  const remainingSlots = maxPhotos - photos.length;

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Файл должен быть изображением';
    }

    // Check file size (25MB max)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'Размер файла не должен превышать 25MB';
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
      return 'Неподдерживаемый формат изображения';
    }

    return null;
  };

  // Client-side image processing
  const processImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Calculate new dimensions (max 1920px on longest side)
          const maxSize = 1920;
          let { width, height } = img;
          
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height * maxSize) / width;
              width = maxSize;
            } else {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Canvas context not available');
          }

          canvas.width = width;
          canvas.height = height;

          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with 80% quality
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to process image'));
                return;
              }

              // Create new File object
              const processedFile = new File(
                [blob], 
                file.name.replace(/\.[^/.]+$/, '.jpg'), // Change extension to .jpg
                { 
                  type: 'image/jpeg',
                  lastModified: Date.now()
                }
              );

              console.log(`Image processed: ${file.size} → ${processedFile.size} bytes (${Math.round(width)}x${Math.round(height)}px)`);
              resolve(processedFile);
            },
            'image/jpeg',
            0.8 // 80% quality
          );
        } catch (error) {
          console.error('Image processing error:', error);
          // If processing fails, return original file
          resolve(file);
        }
      };

      img.onerror = () => {
        console.error('Failed to load image for processing');
        // If image loading fails, return original file
        resolve(file);
      };

      // Load image
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);

    // Check if we can upload all files
    if (fileArray.length > remainingSlots) {
      setError(`Можно загрузить только ${remainingSlots} фото. Максимум ${maxPhotos} фото на предмет.`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    try {
      // Process all valid files and create PhotoWithOriginal objects
      const photoWithOriginals = await Promise.all(
        validFiles.map(async (originalFile) => {
          const processedFile = await processImage(originalFile);
          return {
            original: originalFile,
            processed: processedFile
          };
        })
      );

      // Add photo pairs to photos array
      onPhotosChange([...photos, ...photoWithOriginals]);
    } catch (error) {
      console.error('Error processing images:', error);
      setError('Ошибка обработки изображений. Попробуйте еще раз.');
    }
  }, [photos, onPhotosChange, remainingSlots, maxPhotos]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!canUploadMore) return;
    
    handleFiles(e.dataTransfer.files);
  }, [canUploadMore, handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && canUploadMore) {
      handleFiles(e.target.files);
    }
  }, [canUploadMore, handleFiles]);

  const removePhoto = (indexToRemove: number) => {
    const updatedPhotos = photos.filter((_, index) => index !== indexToRemove);
    onPhotosChange(updatedPhotos);
  };

  const createImageUrl = (photoWithOriginal: PhotoWithOriginal) => {
    // Use processed file for preview
    return URL.createObjectURL(photoWithOriginal.processed);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {canUploadMore && (
        <Card 
          className={`border-2 border-dashed transition-colors ${
            isDragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-6">
            <div className="text-center space-y-3">
              <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              
              <div>
                <h3 className="font-medium text-sm">Добавьте фотографии</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Перетащите файлы сюда или нажмите для выбора
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Можно добавить ещё {remainingSlots} из {maxPhotos} фото
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="photo-preview-upload"
                />
                <label htmlFor="photo-preview-upload">
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <span>
                      <ImageIcon className="w-4 h-4" />
                      Выбрать файлы
                    </span>
                  </Button>
                </label>
                
                <div className="text-xs text-muted-foreground">
                  JPEG, PNG, GIF, WebP, BMP, TIFF · Макс. 25MB
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-line">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Photo Preview */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Выбранные фото ({photos.length})</h4>
            <Badge variant="secondary" className="text-xs">{photos.length}/{maxPhotos}</Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                  <img
                    src={createImageUrl(photo)}
                    alt={`Предпросмотр ${index + 1}`}
                    className="w-full h-full object-cover"
                    onLoad={(e) => {
                      // Clean up object URL after loading to prevent memory leaks
                      URL.revokeObjectURL((e.target as HTMLImageElement).src);
                    }}
                  />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* File info */}
                <div className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-xs px-2 py-1 rounded truncate">
                  {photo.original.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!canUploadMore && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Достигнут лимит в {maxPhotos} фотографий для этого предмета.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}