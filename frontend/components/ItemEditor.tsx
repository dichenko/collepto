import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Save, 
  ArrowLeft, 
  AlertCircle,
  Plus,
  X
} from 'lucide-react';
import { PhotoUploader } from './PhotoUploader';
import { PhotoPreview } from './PhotoPreview';
import apiClient, { type CollectorItem } from '../utils/api';

interface ItemEditorProps {
  itemId?: string; // undefined for new item
  onSave: (item: CollectorItem) => void;
  onCancel: () => void;
}

export function ItemEditor({ itemId, onSave, onCancel }: ItemEditorProps) {
  const [item, setItem] = useState<Partial<CollectorItem>>({
    title: '',
    description: '',
    fullDescription: '',
    year: new Date().getFullYear(),
    yearFrom: undefined,
    yearTo: undefined,
    country: '',
    organization: '',
    size: '',
    edition: '',
    series: '',
    tags: [],
    category: '',
    condition: '',
    acquisition: '',
    value: '',
    photos: []
  });

  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]); // Временные фото для нового предмета

  // Load existing item if editing
  useEffect(() => {
    if (itemId) {
      loadItem();
    }
  }, [itemId]);

  const loadItem = async () => {
    if (!itemId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getItem(itemId);
      if (response.success && response.data) {
        setItem(response.data);
      } else {
        setError(response.error || 'Не удалось загрузить предмет');
      }
    } catch (error) {
      setError('Ошибка загрузки предмета');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!item.title?.trim()) {
      errors.title = 'Название обязательно';
    }

    if (!item.category?.trim()) {
      errors.category = 'Категория обязательна';
    }

    if (!item.year || item.year < 1800 || item.year > 2030) {
      errors.year = 'Год должен быть между 1800 и 2030';
    }

    if (item.yearFrom && item.yearTo && item.yearFrom > item.yearTo) {
      errors.yearRange = 'Год "от" не может быть больше года "до"';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let response;
      
      if (itemId) {
        // Update existing item
        response = await apiClient.updateItem(itemId, item);
        
        if (response.success) {
          // Reload item data to get updated info
          const updatedResponse = await apiClient.getItem(itemId);
          if (updatedResponse.success && updatedResponse.data) {
            onSave(updatedResponse.data);
          }
        }
      } else {
        // Create new item
        response = await apiClient.createItem(item as Omit<CollectorItem, 'id' | 'createdAt' | 'updatedAt' | 'photos'>);
        
        if (response.success && response.data?.id) {
          const newItemId = response.data.id;
          
          // Upload pending photos if any
          if (pendingPhotos.length > 0) {
            try {
              // Upload photos one by one
              for (const photo of pendingPhotos) {
                await apiClient.uploadPhoto(newItemId, photo);
              }
              
              // Clear pending photos
              setPendingPhotos([]);
            } catch (photoError) {
              console.error('Photo upload error:', photoError);
              setError('Предмет создан, но не все фото загружены. Вы можете добавить их позже.');
            }
          }
          
          // Load the created item with photos
          const newResponse = await apiClient.getItem(newItemId);
          if (newResponse.success && newResponse.data) {
            onSave(newResponse.data);
          }
        }
      }
      
      if (!response.success) {
        setError(response.error || 'Ошибка сохранения');
      }
    } catch (error) {
      setError('Ошибка сохранения предмета');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof CollectorItem, value: any) => {
    setItem(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !item.tags?.includes(newTag.trim())) {
      handleInputChange('tags', [...(item.tags || []), newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleInputChange('tags', item.tags?.filter(tag => tag !== tagToRemove) || []);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="text-lg font-medium">Загрузка предмета...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onCancel} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Button>
          <h1 className="text-2xl font-semibold">
            {itemId ? 'Редактировать предмет' : 'Новый предмет'}
          </h1>
        </div>
        
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Сохранение...' : (itemId ? 'Сохранить' : 'Создать предмет')}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Main Information */}
        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название *</Label>
              <Input
                id="title"
                value={item.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Введите название предмета"
              />
              {validationErrors.title && (
                <p className="text-sm text-red-600">{validationErrors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Категория *</Label>
              <Input
                id="category"
                value={item.category || ''}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="Например: Винтажные камеры"
              />
              {validationErrors.category && (
                <p className="text-sm text-red-600">{validationErrors.category}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Краткое описание</Label>
              <Textarea
                id="description"
                value={item.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Краткое описание предмета"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullDescription">Подробное описание</Label>
              <Textarea
                id="fullDescription"
                value={item.fullDescription || ''}
                onChange={(e) => handleInputChange('fullDescription', e.target.value)}
                placeholder="Подробное описание с историей и деталями"
                rows={5}
              />
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Детали</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Год *</Label>
                <Input
                  id="year"
                  type="number"
                  min="1800"
                  max="2024"
                  value={item.year || ''}
                  onChange={(e) => handleInputChange('year', parseInt(e.target.value) || '')}
                />
                {validationErrors.year && (
                  <p className="text-sm text-red-600">{validationErrors.year}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Страна</Label>
                <Input
                  id="country"
                  value={item.country || ''}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="Страна производства"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearFrom">Год от</Label>
                <Input
                  id="yearFrom"
                  type="number"
                  min="1800"
                  max="2024"
                  value={item.yearFrom || ''}
                  onChange={(e) => handleInputChange('yearFrom', parseInt(e.target.value) || undefined)}
                  placeholder="Начало диапазона"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearTo">Год до</Label>
                <Input
                  id="yearTo"
                  type="number"
                  min="1800"
                  max="2024"
                  value={item.yearTo || ''}
                  onChange={(e) => handleInputChange('yearTo', parseInt(e.target.value) || undefined)}
                  placeholder="Конец диапазона"
                />
              </div>
            </div>
            {validationErrors.yearRange && (
              <p className="text-sm text-red-600">{validationErrors.yearRange}</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="organization">Организация/Издатель</Label>
              <Input
                id="organization"
                value={item.organization || ''}
                onChange={(e) => handleInputChange('organization', e.target.value)}
                placeholder="Производитель или издатель"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="size">Размер</Label>
                <Input
                  id="size"
                  value={item.size || ''}
                  onChange={(e) => handleInputChange('size', e.target.value)}
                  placeholder="Размеры предмета"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edition">Тираж</Label>
                <Input
                  id="edition"
                  value={item.edition || ''}
                  onChange={(e) => handleInputChange('edition', e.target.value)}
                  placeholder="Тираж или серийность"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="series">Серия</Label>
              <Input
                id="series"
                value={item.series || ''}
                onChange={(e) => handleInputChange('series', e.target.value)}
                placeholder="Серия или коллекция"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Состояние</Label>
              <Input
                id="condition"
                value={item.condition || ''}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                placeholder="Состояние предмета"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acquisition">Как приобретен</Label>
              <Input
                id="acquisition"
                value={item.acquisition || ''}
                onChange={(e) => handleInputChange('acquisition', e.target.value)}
                placeholder="История приобретения"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Стоимость</Label>
              <Input
                id="value"
                value={item.value || ''}
                onChange={(e) => handleInputChange('value', e.target.value)}
                placeholder="Примерная стоимость"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Теги</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Добавить тег"
              className="flex-1"
            />
            <Button onClick={handleAddTag} disabled={!newTag.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-secondary-foreground/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Management */}
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Фотографии предмета</CardTitle>
        </CardHeader>
        <CardContent>
          {itemId ? (
            // For existing items, use PhotoUploader
            <PhotoUploader
              itemId={itemId}
              existingPhotos={item.photos?.map((url, index) => ({
                id: `photo-${index}`,
                url,
                filename: `photo-${index + 1}.jpg`
              })) || []}
              onPhotosUpdated={() => {
                loadItem();
              }}
            />
          ) : (
            // For new items, use PhotoPreview
            <PhotoPreview
              photos={pendingPhotos}
              onPhotosChange={setPendingPhotos}
              maxPhotos={10}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}