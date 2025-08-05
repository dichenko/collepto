import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { 
  LogOut, 
  Plus, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  Users,
  FileText,
  Image,
  Database
} from 'lucide-react';
import { ItemEditor } from './ItemEditor';
import apiClient, { type CollectorItem, type BlogPost } from '../utils/api';

type AdminView = 'dashboard' | 'item-editor' | 'item-view';

export function AdminPanel() {
  const [items, setItems] = useState<CollectorItem[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CollectorItem | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // В админке используем обычные публичные API для начала
      const [itemsResponse, blogResponse] = await Promise.all([
        apiClient.getItems(),
        apiClient.getBlogPosts()
      ]);

      if (itemsResponse.success && itemsResponse.data) {
        setItems(itemsResponse.data);
      }

      if (blogResponse.success && blogResponse.data) {
        setBlogPosts(blogResponse.data);
      }
    } catch (error) {
      setError('Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout on client side
      apiClient.clearSession();
      window.location.reload();
    }
  };

  const handleExport = async () => {
    try {
      await apiClient.downloadExport();
    } catch (error) {
      alert('Ошибка экспорта: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  };

  const handleCreateItem = () => {
    setSelectedItemId(undefined);
    setCurrentView('item-editor');
  };

// Handler functions removed - using inline handlers for simplicity

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      const response = await apiClient.deleteItem(itemToDelete.id);
      if (response.success) {
        setItems(prev => prev.filter(item => item.id !== itemToDelete.id));
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      } else {
        alert('Ошибка удаления: ' + (response.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      alert('Ошибка удаления: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  };

  const handleItemSaved = (savedItem: CollectorItem) => {
    // Update items list
    setItems(prev => {
      const existingIndex = prev.findIndex(item => item.id === savedItem.id);
      if (existingIndex >= 0) {
        // Update existing item
        const newItems = [...prev];
        newItems[existingIndex] = savedItem;
        return newItems;
      } else {
        // Add new item
        return [savedItem, ...prev];
      }
    });
    
    // Return to dashboard
    setCurrentView('dashboard');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedItemId(undefined);
  };

  // Show item editor
  if (currentView === 'item-editor') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-7xl p-4">
          <ItemEditor
            itemId={selectedItemId}
            onSave={handleItemSaved}
            onCancel={handleBackToDashboard}
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center py-12">
            <h1>Админка</h1>
            <p className="text-muted-foreground mt-2">Загрузка данных...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Админка Collepto</h1>
              <Badge variant="secondary">Администратор</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Экспорт
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2">
                <LogOut className="w-4 h-4" />
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl p-4">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Предметы</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{items.length}</div>
              <p className="text-xs text-muted-foreground">в коллекции</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Посты блога</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{blogPosts.length}</div>
              <p className="text-xs text-muted-foreground">
                {blogPosts.filter(p => p.published).length} опубликовано
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Категории</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(items.map(item => item.category)).size}
              </div>
              <p className="text-xs text-muted-foreground">уникальных</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Фотографии</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {items.reduce((total, item) => total + (item.photos?.length || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">всего загружено</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="items">Предметы коллекции</TabsTrigger>
            <TabsTrigger value="blog">Блог</TabsTrigger>
          </TabsList>
          
          <TabsContent value="items" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Управление предметами</h2>
              <Button onClick={handleCreateItem} className="gap-2">
                <Plus className="w-4 h-4" />
                Добавить предмет
              </Button>
            </div>

            <div className="grid gap-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{item.title}</h3>
                          <Badge variant="outline">{item.category}</Badge>
                          <Badge variant="secondary">{item.year}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{item.photos?.length || 0} фото</span>
                          <span>{item.tags?.length || 0} тегов</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1">
                          <Eye className="w-3 h-3" />
                          Просмотр
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Edit className="w-3 h-3" />
                          Изменить
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 text-destructive">
                          <Trash2 className="w-3 h-3" />
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="blog" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Управление блогом</h2>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Новый пост
              </Button>
            </div>

            <div className="grid gap-4">
              {blogPosts.map((post) => (
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{post.title}</h3>
                          <Badge variant={post.published ? "default" : "secondary"}>
                            {post.published ? "Опубликован" : "Черновик"}
                          </Badge>
                          <Badge variant="outline">{post.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{new Date(post.publishDate).toLocaleDateString('ru-RU')}</span>
                          <span>{post.readTime} мин чтения</span>
                          <span>{post.relatedItems?.length || 0} связанных предметов</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1">
                          <Eye className="w-3 h-3" />
                          Просмотр
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Edit className="w-3 h-3" />
                          Изменить
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 text-destructive">
                          <Trash2 className="w-3 h-3" />
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить предмет?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить предмет "{itemToDelete?.title}"? 
              Это действие нельзя отменить. Все связанные фотографии также будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}