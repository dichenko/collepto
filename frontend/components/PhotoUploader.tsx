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
  AlertCircle, 
  CheckCircle,
  Loader2
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import apiClient from '../utils/api';

interface PhotoUploaderProps {
  itemId: string;
  existingPhotos?: Array<{
    id: string;
    url: string;
    filename: string;
  }>;
  onPhotosUpdated?: () => void;
  maxPhotos?: number;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
  id?: string;
}

export function PhotoUploader({ 
  itemId, 
  existingPhotos = [], 
  onPhotosUpdated,
  maxPhotos = 10 
}: PhotoUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check if we can upload more photos
  const canUploadMore = existingPhotos.length + uploadingFiles.filter(f => f.status === 'success').length < maxPhotos;
  const remainingSlots = maxPhotos - existingPhotos.length - uploadingFiles.filter(f => f.status === 'success').length;

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Файл должен быть изображением';
    }

    // Check file size (25MB max according to ТЗ)
    const maxSize = 25 * 1024 * 1024; // 25MB
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

  const uploadFile = async (file: File): Promise<void> => {
    // Add file to uploading list
    setUploadingFiles(prev => [...prev, {
      file,
      progress: 0,
      status: 'uploading'
    }]);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => prev.map(f => 
          f.file === file && f.status === 'uploading' 
            ? { ...f, progress: Math.min(f.progress + 10, 90) }
            : f
        ));
      }, 200);

      // Upload file
      const response = await apiClient.uploadPhoto(itemId, file);

      clearInterval(progressInterval);

      if (response.success && response.data) {
        // Update file status to success
        setUploadingFiles(prev => prev.map(f => 
          f.file === file 
            ? { 
                ...f, 
                progress: 100, 
                status: 'success',
                url: response.data!.publicUrl,
                id: response.data!.id
              }
            : f
        ));

        // Call callback to refresh parent component
        onPhotosUpdated?.();
      } else {
        throw new Error(response.error || 'Ошибка загрузки');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки';
      
      setUploadingFiles(prev => prev.map(f => 
        f.file === file 
          ? { 
              ...f, 
              progress: 0, 
              status: 'error',
              error: errorMessage
            }
          : f
      ));
    }
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
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

    // Upload valid files
    validFiles.forEach(file => {
      uploadFile(file);
    });
  }, [itemId, remainingSlots, maxPhotos]);

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

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
  };

  const retryUpload = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
    uploadFile(file);
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      setError(null);
      const response = await apiClient.deletePhoto(photoId);
      
      if (response.success) {
        // Call callback to refresh parent component
        onPhotosUpdated?.();
      } else {
        setError(response.error || 'Ошибка удаления фото');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка удаления фото');
    }
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
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              
              <div>
                <h3 className="font-medium">Загрузите фотографии</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Перетащите файлы сюда или нажмите для выбора
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Можно загрузить ещё {remainingSlots} из {maxPhotos} фото
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id={`photo-upload-${itemId}`}
                />
                <label htmlFor={`photo-upload-${itemId}`}>
                  <Button variant="outline" className="gap-2" asChild>
                    <span>
                      <ImageIcon className="w-4 h-4" />
                      Выбрать файлы
                    </span>
                  </Button>
                </label>
                
                <div className="text-xs text-muted-foreground">
                  Поддерживаемые форматы: JPEG, PNG, GIF, WebP, BMP, TIFF
                  <br />
                  Максимальный размер: 25MB
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

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Загрузка файлов</h4>
          {uploadingFiles.map((uploadFile, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      {uploadFile.status === 'uploading' && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {uploadFile.status === 'success' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {uploadFile.file.name}
                        </span>
                        <Badge variant={
                          uploadFile.status === 'success' ? 'default' :
                          uploadFile.status === 'error' ? 'destructive' : 'secondary'
                        }>
                          {uploadFile.status === 'uploading' ? 'Загрузка...' :
                           uploadFile.status === 'success' ? 'Готово' : 'Ошибка'}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {(uploadFile.file.size / 1024 / 1024).toFixed(1)} MB
                      </div>
                      
                      {uploadFile.status === 'uploading' && (
                        <Progress value={uploadFile.progress} className="h-1" />
                      )}
                      
                      {uploadFile.status === 'error' && uploadFile.error && (
                        <p className="text-xs text-red-600">{uploadFile.error}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {uploadFile.status === 'error' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => retryUpload(uploadFile.file)}
                      >
                        Повторить
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeUploadingFile(uploadFile.file)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Existing Photos Preview */}
      {existingPhotos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Загруженные фото ({existingPhotos.length})</h4>
            <Badge variant="secondary">{existingPhotos.length}/{maxPhotos}</Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {existingPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-square overflow-hidden rounded-lg">
                  <ImageWithFallback
                    src={photo.url}
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeletePhoto(photo.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
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