import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Settings } from 'lucide-react';
import { ItemCard } from '../ItemCard';
import { SearchFilters } from '../SearchFilters';
import { apiClient, type CollectorItem } from '../../utils/api';
import { createItemPath } from '../../utils/slugify';

export function CollectionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<CollectorItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CollectorItem[]>([]);
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
    const loadItems = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await apiClient.getItems();
        
        if (response.success && response.data) {
          setItems(response.data);
          setFilteredItems(response.data);
        } else {
          setError(response.error || 'Failed to load items');
        }
      } catch (err) {
        console.error('Error loading items:', err);
        setError('Failed to load items');
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, []);

  // Handle URL parameters for filtering
  useEffect(() => {
    const tag = searchParams.get('tag');
    const category = searchParams.get('category');
    
    if (tag || category) {
      const newFilters = {
        title: '',
        yearFrom: null,
        yearTo: null,
        tags: tag ? [tag] : [],
        category: category || '',
      };
      setCurrentFilters(newFilters);
      handleSearch(newFilters);
    }
  }, [searchParams, items]);

  const handleSearch = (filters: typeof currentFilters) => {
    setCurrentFilters(filters);
    
    let filtered = items;

    // Filter by title
    if (filters.title) {
      const titleLower = filters.title.toLowerCase();
      filtered = filtered.filter(item => {
        if (!item) return false;
        return (item.title || '').toLowerCase().includes(titleLower) ||
               (item.description || '').toLowerCase().includes(titleLower);
      });
    }

    // Filter by year range
    if (filters.yearFrom) {
      filtered = filtered.filter(item => item.year >= filters.yearFrom!);
    }
    if (filters.yearTo) {
      filtered = filtered.filter(item => item.year <= filters.yearTo!);
    }

    // Filter by tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter(item => 
        filters.tags.some(tag => item.tags.includes(tag))
      );
    }

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    setFilteredItems(filtered);
  };

  const handleTagClick = (tag: string) => {
    setSearchParams({ tag });
  };

  const handleCategoryClick = (category: string) => {
    setSearchParams({ category });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading collection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-lg mb-4">Error: {error}</p>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h2 className="text-xl font-semibold">Моя коллекция</h2>
              <div className="flex items-center gap-1">
                <Button variant="default" size="sm" className="gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V5a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 00-2 2H5z" />
                  </svg>
                  Коллекция
                </Button>
                <Link to="/blog">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Блог
                  </Button>
                </Link>
              </div>
            </div>
            <Link to="/admin">
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto max-w-7xl p-4">
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <h1>Добро пожаловать в мою коллекцию</h1>
          <p className="text-muted-foreground">
            Исследуйте уникальные винтажные предметы, собранные с любовью за годы коллекционирования
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-6">
          <SearchFilters
            availableTags={getAllTags()}
            availableCategories={getAllCategories()}
            onSearch={handleSearch}
            initialFilters={currentFilters}
            instantSearch={true}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs hover:text-destructive"
                      onClick={() => {
                        const newFilters = { ...currentFilters, category: '' };
                        handleSearch(newFilters);
                      }}
                    >
                      ×
                    </Button>
                  </Badge>
                </div>
              )}
              {(currentFilters.title || currentFilters.yearFrom || currentFilters.yearTo || currentFilters.tags.length > 0 || currentFilters.category) && (
                <Button variant="outline" size="sm" onClick={() => handleSearch({
                  title: '',
                  yearFrom: null,
                  yearTo: null,
                  tags: [],
                  category: ''
                })} className="gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Очистить фильтры
                </Button>
              )}
            </div>
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
              <Link 
                key={item.id} 
                to={createItemPath(item.title, item.id)}
                className="block"
              >
                <ItemCard
                  item={item}
                  onTagClick={handleTagClick}
                  onCategoryClick={handleCategoryClick}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
