import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { 
  Save, 
  ArrowLeft, 
  AlertCircle,
  Plus,
  X,
  Eye,
  Calendar
} from 'lucide-react';
import apiClient, { type BlogPost, type CollectorItem } from '../utils/api';

interface BlogEditorProps {
  postId?: string; // undefined for new post
  onSave: (post: BlogPost) => void;
  onCancel: () => void;
}

export function BlogEditor({ postId, onSave, onCancel }: BlogEditorProps) {
  const [post, setPost] = useState<Partial<BlogPost>>({
    title: '',
    excerpt: '',
    content: '',
    publishDate: new Date().toISOString().split('T')[0],
    readTime: 1,
    relatedItems: [],
    category: '',
    published: false
  });

  const [availableItems, setAvailableItems] = useState<CollectorItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Load existing post if editing
  useEffect(() => {
    if (postId) {
      loadPost();
    }
    loadAvailableItems();
  }, [postId]);

  const loadPost = async () => {
    if (!postId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getBlogPost(postId);
      if (response.success && response.data) {
        setPost(response.data);
      } else {
        setError(response.error || 'Не удалось загрузить пост');
      }
    } catch (error) {
      setError('Ошибка загрузки поста');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableItems = async () => {
    try {
      const response = await apiClient.getItems();
      if (response.success && response.data) {
        setAvailableItems(response.data);
      }
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const handleInputChange = (field: keyof BlogPost, value: any) => {
    setPost(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!post.title?.trim()) {
      errors.title = 'Заголовок обязателен';
    }

    if (!post.excerpt?.trim()) {
      errors.excerpt = 'Краткое описание обязательно';
    }

    if (!post.content?.trim()) {
      errors.content = 'Содержание обязательно';
    }

    if (!post.category?.trim()) {
      errors.category = 'Категория обязательна';
    }

    if (!post.publishDate) {
      errors.publishDate = 'Дата публикации обязательна';
    }

    if (!post.readTime || post.readTime < 1) {
      errors.readTime = 'Время чтения должно быть больше 0';
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
      
      if (postId) {
        // Update existing post
        response = await apiClient.updateBlogPost(postId, post);
        
        if (response.success) {
          // Reload post data to get updated info
          const updatedResponse = await apiClient.getBlogPost(postId);
          if (updatedResponse.success && updatedResponse.data) {
            onSave(updatedResponse.data);
          }
        }
      } else {
        // Create new post
        response = await apiClient.createBlogPost(post as Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>);
        
        if (response.success && response.data?.id) {
          const newPostId = response.data.id;
          
          // Load the created post
          const newResponse = await apiClient.getBlogPost(newPostId);
          if (newResponse.success && newResponse.data) {
            onSave(newResponse.data);
          }
        }
      }
      
      if (!response.success) {
        setError(response.error || 'Ошибка сохранения');
      }
    } catch (error) {
      setError('Ошибка сохранения поста');
    } finally {
      setIsSaving(false);
    }
  };

  const addRelatedItem = (itemId: string) => {
    if (!post.relatedItems?.includes(itemId)) {
      handleInputChange('relatedItems', [...(post.relatedItems || []), itemId]);
    }
    setSearchQuery('');
  };

  const removeRelatedItem = (itemId: string) => {
    handleInputChange('relatedItems', post.relatedItems?.filter(id => id !== itemId) || []);
  };

  const getRelatedItemsData = () => {
    return availableItems.filter(item => post.relatedItems?.includes(item.id));
  };

  const getFilteredItems = () => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return availableItems
      .filter(item => {
        if (!item) return false;
        return !post.relatedItems?.includes(item.id) &&
        ((item.title || '').toLowerCase().includes(query) ||
         (item.description || '').toLowerCase().includes(query) ||
         (item.category || '').toLowerCase().includes(query));
      })
      .slice(0, 5);
  };

  // Auto-calculate read time based on content
  useEffect(() => {
    if (post.content) {
      const wordCount = post.content.trim().split(/\s+/).length;
      const readTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute
      handleInputChange('readTime', readTime);
    }
  }, [post.content]);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="text-lg font-medium">Загрузка поста...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onCancel} className="gap-2 btn-refined">
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Button>
          <h1 className="text-2xl font-semibold">
            {postId ? 'Редактировать пост' : 'Новый пост'}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {post.published && (
            <Button variant="outline" className="gap-2" onClick={() => window.open(`/blog/${post.slug || post.id}`, '_blank')}>
              <Eye className="w-4 h-4" />
              Просмотр
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Сохранение...' : (postId ? 'Сохранить' : 'Создать пост')}
          </Button>
        </div>
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
        <Card className="card-refined">
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Заголовок *</Label>
              <Input
                id="title"
                value={post.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Введите заголовок поста"
              />
              {validationErrors.title && (
                <p className="text-sm text-red-600">{validationErrors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Краткое описание *</Label>
              <Textarea
                id="excerpt"
                value={post.excerpt || ''}
                onChange={(e) => handleInputChange('excerpt', e.target.value)}
                placeholder="Краткое описание поста для превью"
                rows={3}
              />
              {validationErrors.excerpt && (
                <p className="text-sm text-red-600">{validationErrors.excerpt}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Категория *</Label>
              <Input
                id="category"
                value={post.category || ''}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="Например: Новости коллекции"
              />
              {validationErrors.category && (
                <p className="text-sm text-red-600">{validationErrors.category}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="publishDate">Дата публикации *</Label>
                <Input
                  id="publishDate"
                  type="date"
                  value={post.publishDate || ''}
                  onChange={(e) => handleInputChange('publishDate', e.target.value)}
                />
                {validationErrors.publishDate && (
                  <p className="text-sm text-red-600">{validationErrors.publishDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="readTime">Время чтения (мин) *</Label>
                <Input
                  id="readTime"
                  type="number"
                  min="1"
                  value={post.readTime || ''}
                  onChange={(e) => handleInputChange('readTime', parseInt(e.target.value) || 1)}
                />
                {validationErrors.readTime && (
                  <p className="text-sm text-red-600">{validationErrors.readTime}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={post.published || false}
                onCheckedChange={(checked) => handleInputChange('published', checked)}
              />
              <Label htmlFor="published">Опубликовать пост</Label>
            </div>
          </CardContent>
        </Card>

        {/* Related Items */}
        <Card className="card-refined">
          <CardHeader>
            <CardTitle>Связанные предметы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="itemSearch">Поиск предметов</Label>
              <Input
                id="itemSearch"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию или описанию..."
              />
              
              {searchQuery.trim() && (
                <div className="max-h-32 overflow-y-auto border rounded-md">
                  {getFilteredItems().map((item) => (
                    <div
                      key={item.id}
                      className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => addRelatedItem(item.id)}
                    >
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.category} • {item.year}</div>
                    </div>
                  ))}
                  {getFilteredItems().length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">Предметы не найдены</div>
                  )}
                </div>
              )}
            </div>

            {getRelatedItemsData().length > 0 && (
              <div className="space-y-2">
                <Label>Выбранные предметы ({getRelatedItemsData().length})</Label>
                <div className="space-y-2">
                  {getRelatedItemsData().map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.category} • {item.year}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRelatedItem(item.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <Card className="card-refined">
        <CardHeader>
          <CardTitle>Содержание поста</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Текст поста *</Label>
            <Textarea
              id="content"
              value={post.content || ''}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Введите содержание поста..."
              rows={15}
              className="font-mono text-sm"
            />
            {validationErrors.content && (
              <p className="text-sm text-red-600">{validationErrors.content}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Поддерживается Markdown разметка. Время чтения рассчитывается автоматически.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
