import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ThemeProvider } from './ui/theme-provider';
import { Settings, X } from 'lucide-react';
import { ItemCard } from './ItemCard';
import { ItemView } from './ItemView';
import { BlogPage } from './BlogPage';
import { PostView } from './PostView';
import { SearchFilters } from './SearchFilters';
import { apiClient, type CollectorItem, type BlogPost } from '../utils/api';

export function MainApp() {
  const [currentPage, setCurrentPage] = useState<'collection' | 'blog' | 'item' | 'post'>('collection');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [items, setItems] = useState<CollectorItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CollectorItem[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State to track current filters for SearchFilters component
  const [currentFilters, setCurrentFilters] = useState({
    title: '',
    yearFrom: null as number | null,
    yearTo: null as number | null,
    tags: [] as string[],
    category: '' as string,
  });

  // Get all available tags
  const getAllTags = () => {
    const allTags = items.flatMap(item => item.tags);
    return [...new Set(allTags)].sort();
  };

  // Get all available categories
  const getAllCategories = () => {
    const allCategories = items.map(item => item.category).filter(Boolean);
    return [...new Set(allCategories)].sort();
  };

  // Load real data from API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Load items and blog posts in parallel
        const [itemsResponse, blogResponse] = await Promise.all([
          apiClient.getItems(),
          apiClient.getBlogPosts()
        ]);

        if (!itemsResponse.success) {
          throw new Error(itemsResponse.error || 'Failed to load items');
        }

        if (!blogResponse.success) {
          throw new Error(blogResponse.error || 'Failed to load blog posts');
        }

        const loadedItems = itemsResponse.data || [];
        const loadedPosts = blogResponse.data || [];

        setItems(loadedItems);
        setFilteredItems(loadedItems);
        setBlogPosts(loadedPosts);
      } catch (error) {
        console.error('Failed to load data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle search and filtering using API
  const handleSearch = async (filters: {
    title: string;
    yearFrom: number | null;
    yearTo: number | null;
    tags: string[];
    category?: string;
  }) => {
    const updatedFilters = { ...filters, category: filters.category || '' };
    setCurrentFilters(updatedFilters);
    
    try {
      // Use API search if we have any filters, otherwise show all items
      if (filters.title || filters.category || filters.yearFrom || filters.yearTo || filters.tags.length > 0) {
        const searchResponse = await apiClient.searchItems({
          q: filters.title || undefined,
          category: filters.category || undefined,
          yearFrom: filters.yearFrom || undefined,
          yearTo: filters.yearTo || undefined,
          tags: filters.tags.length > 0 ? filters.tags : undefined,
        });
        
        if (searchResponse.success && searchResponse.data) {
          setFilteredItems(searchResponse.data);
        } else {
          console.error('Search failed:', searchResponse.error);
          setFilteredItems([]);
        }
      } else {
        // Show all items when no filters
        setFilteredItems(items);
      }
    } catch (error) {
      console.error('Search error:', error);
      setFilteredItems([]);
    }
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      title: '',
      yearFrom: null as number | null,
      yearTo: null as number | null,
      tags: [] as string[],
      category: '',
    };
    setCurrentFilters(emptyFilters);
    setFilteredItems(items);
  };

  const handleMoreDetails = (id: string) => {
    setSelectedItemId(id);
    setCurrentPage('item');
  };

  const handlePostClick = (id: string) => {
    setSelectedPostId(id);
    setCurrentPage('post');
  };

  const handleTagClick = (tag: string) => {
    const newFilters = { ...currentFilters, tags: [tag] };
    handleSearch(newFilters);
  };

  const handleCategoryClick = (category: string) => {
    const newFilters = { ...currentFilters, category };
    handleSearch(newFilters);
  };

  const handleAdminClick = () => {
    window.location.href = '/admin';
  };

  if (isLoading) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="collepto-theme">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading collection...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="collepto-theme">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive text-lg mb-4">Error: {error}</p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="collepto-theme">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <button 
                className="flex items-center space-x-2 font-bold text-xl hover:text-primary transition-colors"
                onClick={() => {
                  setCurrentPage('collection');
                  setSelectedItemId(null);
                  setSelectedPostId(null);
                }}
              >
                <span>Collepto</span>
              </button>
            </div>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <button
                className={`transition-colors hover:text-primary ${
                  currentPage === 'collection' ? 'text-primary' : 'text-muted-foreground'
                }`}
                onClick={() => {
                  setCurrentPage('collection');
                  setSelectedItemId(null);
                  setSelectedPostId(null);
                }}
              >
                Collection
              </button>
              <button
                className={`transition-colors hover:text-primary ${
                  currentPage === 'blog' || currentPage === 'post' ? 'text-primary' : 'text-muted-foreground'
                }`}
                onClick={() => {
                  setCurrentPage('blog');
                  setSelectedItemId(null);
                  setSelectedPostId(null);
                }}
              >
                Blog
              </button>
            </nav>
            <div className="flex flex-1 items-center justify-end space-x-2">
              <Button variant="ghost" size="sm" onClick={handleAdminClick} className="gap-2">
                <Settings className="w-4 h-4" />
                Admin
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {currentPage === 'collection' && (
            <div className="space-y-6">
              {/* Hero Section */}
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">
                  Винтажная коллекция
                </h1>
                <p className="text-muted-foreground">
                  Исследуйте уникальные винтажные предметы, собранные с любовью за годы коллекционирования
                </p>
              </div>

              {/* Search and Filters */}
              <SearchFilters
                onSearch={handleSearch}
                availableTags={getAllTags()}
                availableCategories={getAllCategories()}
                initialFilters={currentFilters}
              />

              {/* Results count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-muted-foreground">
                    Показано {filteredItems.length} из {items.length} предметов
                  </p>
                  {currentFilters.category && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Категория:</span>
                      <Badge variant="secondary" className="gap-1">
                        {currentFilters.category}
                        <X 
                          className="w-3 h-3 cursor-pointer hover:text-destructive" 
                          onClick={() => {
                            const newFilters = { ...currentFilters, category: '' };
                            handleSearch(newFilters);
                          }}
                        />
                      </Badge>
                    </div>
                  )}
                  {(currentFilters.title || currentFilters.yearFrom || currentFilters.yearTo || currentFilters.tags.length > 0 || currentFilters.category) && (
                    <Button variant="outline" size="sm" onClick={handleClearFilters} className="gap-2">
                      <X className="w-4 h-4" />
                      Очистить фильтры
                    </Button>
                  )}
                </div>
              </div>

              {/* Items Grid */}
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Нет предметов, соответствующих вашим фильтрам.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Попробуйте изменить критерии поиска или очистить фильтры.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      {...item}
                      onMoreDetails={handleMoreDetails}
                      onTagClick={handleTagClick}
                      onCategoryClick={handleCategoryClick}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {currentPage === 'blog' && (
            <BlogPage
              items={items}
              blogPosts={blogPosts}
              onItemClick={handleMoreDetails}
              onPostClick={handlePostClick}
            />
          )}

          {currentPage === 'item' && selectedItemId && (() => {
            const selectedItem = items.find(item => item.id === selectedItemId);
            if (!selectedItem) {
              return (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Предмет не найден</p>
                  <Button onClick={() => setCurrentPage('collection')}>
                    Вернуться к коллекции
                  </Button>
                </div>
              );
            }
            return (
              <ItemView
                item={selectedItem}
                onBack={() => setCurrentPage('collection')}
                onTagClick={handleTagClick}
                onCategoryClick={handleCategoryClick}
                allItems={items}
                onItemClick={handleMoreDetails}
              />
            );
          })()}

          {currentPage === 'post' && selectedPostId && (
            <PostView
              postId={selectedPostId}
              items={items}
              blogPosts={blogPosts}
              onBack={() => setCurrentPage('blog')}
              onItemClick={handleMoreDetails}
              onPostClick={handlePostClick}
            />
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}