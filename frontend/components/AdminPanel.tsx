import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
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
  Database,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ItemEditor } from './ItemEditor';
import { BlogEditor } from './BlogEditor';
import apiClient, { type CollectorItem, type BlogPost, getImageUrl } from '../utils/api';

type AdminView = 'dashboard' | 'item-editor' | 'item-view' | 'blog-editor';

export function AdminPanel() {
  const [items, setItems] = useState<CollectorItem[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CollectorItem | null>(null);
  
  // Collection search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'created' | 'updated'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Blog states
  const [blogPage, setBlogPage] = useState(1);
  const [blogPerPage] = useState(5);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // В админке используем админские API для получения полных данных
      const [itemsResponse, blogResponse] = await Promise.all([
        apiClient.getAdminItems(),
        apiClient.getBlogPosts()
      ]);

      if (itemsResponse.success && itemsResponse.data) {
        setItems(itemsResponse.data);
      } else {
        console.error('Items loading error:', itemsResponse.error);
        setError(`Ошибка загрузки предметов: ${itemsResponse.error}`);
      }

      if (blogResponse.success && blogResponse.data) {
        setBlogPosts(blogResponse.data);
      } else {
        console.error('Blog posts loading error:', blogResponse.error);
      }
    } catch (error) {
      console.error('Data loading error:', error);
      setError('Ошибка загрузки данных: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
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
    setSelectedPostId(undefined);
  };

  const handleBlogPostSaved = (savedPost: BlogPost) => {
    // Update blog posts list
    setBlogPosts(prev => {
      const existingIndex = prev.findIndex(post => post.id === savedPost.id);
      if (existingIndex >= 0) {
        // Update existing post
        const newPosts = [...prev];
        newPosts[existingIndex] = savedPost;
        return newPosts;
      } else {
        // Add new post
        return [savedPost, ...prev];
      }
    });
    
    // Return to dashboard
    setCurrentView('dashboard');
  };

  // Filter and sort functions
  const getFilteredAndSortedItems = () => {
    if (!items || items.length === 0) {
      return [];
    }
    
    let filtered = [...items];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        if (!item) return false;
        
        try {
          const titleMatch = (item.title || '').toLowerCase().includes(query);
          const descMatch = (item.description || '').toLowerCase().includes(query);
          const catMatch = (item.category || '').toLowerCase().includes(query);
          const tagMatch = (item.tags || []).some(tag => {
            if (!tag) return false;
            return String(tag).toLowerCase().includes(query);
          });
          
          return titleMatch || descMatch || catMatch || tagMatch;
        } catch (error) {
          console.error('Error filtering item:', item, error);
          return false;
        }
      });
    }
    
    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (!a || !b) return 0;
      
      try {
        let aVal, bVal;
        switch (sortBy) {
          case 'title':
            aVal = String(a.title || '').toLowerCase();
            bVal = String(b.title || '').toLowerCase();
            break;
          case 'year':
            aVal = Number(a.year) || 0;
            bVal = Number(b.year) || 0;
            break;
          case 'created':
            aVal = new Date(a.createdAt || '').getTime() || 0;
            bVal = new Date(b.createdAt || '').getTime() || 0;
            break;
          case 'updated':
            aVal = new Date(a.updatedAt || '').getTime() || 0;
            bVal = new Date(b.updatedAt || '').getTime() || 0;
            break;
          default:
            return 0;
        }
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      } catch (error) {
        console.error('Error sorting items:', a, b, error);
        return 0;
      }
    });
    
    return filtered;
  };

  const getPaginatedItems = () => {
    try {
      const filtered = getFilteredAndSortedItems();
      if (!filtered || filtered.length === 0) {
        return [];
      }
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filtered.slice(startIndex, startIndex + itemsPerPage);
    } catch (error) {
      console.error('Error in getPaginatedItems:', error);
      return [];
    }
  };

  const getTotalPages = () => {
    try {
      const filtered = getFilteredAndSortedItems();
      return Math.ceil((filtered?.length || 0) / itemsPerPage);
    } catch (error) {
      console.error('Error in getTotalPages:', error);
      return 1;
    }
  };

  const getUniqueCategories = () => {
    return Array.from(new Set(items.map(item => item.category).filter(Boolean))).sort();
  };

  const getPaginatedBlogPosts = () => {
    const startIndex = (blogPage - 1) * blogPerPage;
    return blogPosts.slice(startIndex, startIndex + blogPerPage);
  };

  const getBlogTotalPages = () => {
    return Math.ceil(blogPosts.length / blogPerPage);
  };

  // Action handlers
  const handleViewItem = (item: CollectorItem) => {
    // Open item in new tab
    window.open(`/items/${item.slug || item.id}`, '_blank');
  };

  const handleEditItem = (item: CollectorItem) => {
    setSelectedItemId(item.id);
    setCurrentView('item-editor');
  };

  const handleDeleteItem = (item: CollectorItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleViewBlogPost = (post: BlogPost) => {
    // Open blog post in new tab
    window.open(`/blog/${post.slug || post.id}`, '_blank');
  };

  const handleCreateBlogPost = () => {
    setSelectedPostId(undefined);
    setCurrentView('blog-editor');
  };

  const handleEditBlogPost = (post: BlogPost) => {
    setSelectedPostId(post.id);
    setCurrentView('blog-editor');
  };

  const handleDeleteBlogPost = async (post: BlogPost) => {
    if (!confirm(`Удалить пост "${post.title}"?`)) {
      return;
    }

    try {
      const response = await apiClient.deleteBlogPost(post.id);
      if (response.success) {
        setBlogPosts(prev => prev.filter(p => p.id !== post.id));
      } else {
        alert('Ошибка удаления: ' + (response.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      alert('Ошибка удаления: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
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

  // Show blog editor
  if (currentView === 'blog-editor') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-7xl p-4">
          <BlogEditor
            postId={selectedPostId}
            onSave={handleBlogPostSaved}
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
              <Button onClick={handleExport} variant="outline" size="sm" className="gap-2 btn-refined">
                <Download className="w-4 h-4" />
                Экспорт
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2 btn-refined">
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

        {/* Main Content */}
        <Tabs defaultValue="collection" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="collection">Коллекция</TabsTrigger>
            <TabsTrigger value="blog">Блог</TabsTrigger>
          </TabsList>
          
          <TabsContent value="collection" className="space-y-6">
            {/* Collection Header */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Управление коллекцией</h2>
                <Button onClick={handleCreateItem} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Добавить предмет
                </Button>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Поиск по названию, описанию, категории, тегам..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2 items-center">
                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="">Все категории</option>
                    {getUniqueCategories().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="created">По дате добавления</option>
                    <option value="updated">По дате изменения</option>
                    <option value="title">По названию</option>
                    <option value="year">По году</option>
                  </select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="gap-1"
                  >
                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Results info */}
              <div className="text-sm text-muted-foreground">
                Показано {getPaginatedItems()?.length || 0} из {getFilteredAndSortedItems()?.length || 0} предметов
              </div>
            </div>

            {/* Collection Items */}
            <div className="grid gap-4">
              {(getPaginatedItems() || []).map((item) => (
                <Card key={item.id} className="card-refined">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                        {item.photos && item.photos.length > 0 && item.photos[0] ? (
                          <img 
                            src={getImageUrl(item.photos[0])} 
                            alt={item.title || 'Предмет'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                              const parent = img.parentElement;
                              if (parent && !parent.querySelector('.fallback-icon')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'w-full h-full flex items-center justify-center fallback-icon';
                                fallback.innerHTML = '<svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-medium truncate">{item.title}</h3>
                          <Badge variant="outline" className="badge-refined text-xs">{item.category}</Badge>
                          <Badge variant="secondary" className="badge-refined text-xs">{item.year}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{item.photos?.length || 0} фото</span>
                          <span>{item.tags?.length || 0} тегов</span>
                          <span>Обновлен: {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ru-RU') : 'Неизвестно'}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1 btn-refined"
                          onClick={() => handleViewItem(item)}
                        >
                          <Eye className="w-3 h-3" />
                          Просмотр
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1 btn-refined"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="w-3 h-3" />
                          Изменить
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <Trash2 className="w-3 h-3" />
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {getTotalPages() > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="min-w-[32px]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                  disabled={currentPage === getTotalPages()}
                  className="gap-1"
                >
                  Вперед
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="blog" className="space-y-6">
            {/* Blog Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Управление блогом</h2>
              <Button onClick={handleCreateBlogPost} className="gap-2">
                <Plus className="w-4 h-4" />
                Новый пост
              </Button>
            </div>

            {/* Blog Posts */}
            <div className="grid gap-4">
              {getPaginatedBlogPosts().map((post) => (
                <Card key={post.id} className="card-refined">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-medium truncate">{post.title}</h3>
                          <Badge variant={post.published ? "default" : "secondary"} className="badge-refined text-xs">
                            {post.published ? "Опубликован" : "Черновик"}
                          </Badge>
                          <Badge variant="outline" className="badge-refined text-xs">{post.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{new Date(post.publishDate).toLocaleDateString('ru-RU')}</span>
                          <span>{post.readTime} мин чтения</span>
                          <span>{post.relatedItems?.length || 0} связанных предметов</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1 btn-refined"
                          onClick={() => handleViewBlogPost(post)}
                        >
                          <Eye className="w-3 h-3" />
                          Просмотр
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1 btn-refined"
                          onClick={() => handleEditBlogPost(post)}
                        >
                          <Edit className="w-3 h-3" />
                          Изменить
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleDeleteBlogPost(post)}
                        >
                          <Trash2 className="w-3 h-3" />
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Blog Pagination */}
            {getBlogTotalPages() > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBlogPage(Math.max(1, blogPage - 1))}
                  disabled={blogPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: getBlogTotalPages() }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={page === blogPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBlogPage(page)}
                      className="min-w-[32px]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBlogPage(Math.min(getBlogTotalPages(), blogPage + 1))}
                  disabled={blogPage === getBlogTotalPages()}
                  className="gap-1"
                >
                  Вперед
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Compact Stats at Bottom */}
        <div className="mt-12 pt-6 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-semibold">{items.length}</div>
              <div className="text-xs text-muted-foreground">Предметы</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-semibold">{blogPosts.length}</div>
              <div className="text-xs text-muted-foreground">Посты блога</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-semibold">
                {new Set(items.map(item => item.category)).size}
              </div>
              <div className="text-xs text-muted-foreground">Категории</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-semibold">
                {items.reduce((total, item) => total + (item.photos?.length || 0), 0)}
              </div>
              <div className="text-xs text-muted-foreground">Фотографии</div>
            </div>
          </div>
        </div>
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