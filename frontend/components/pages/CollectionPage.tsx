import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Settings } from 'lucide-react';
import { ItemCard } from '../ItemCard';
import { SearchFilters } from '../SearchFilters';
import { apiClient, type CollectorItem } from '../../utils/api';
import { createItemPath } from '../../utils/slugify';

export function CollectionPage() {
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

  const handleSearch = (filters: typeof currentFilters) => {
    setCurrentFilters(filters);
    
    let filtered = items;

    // Filter by title
    if (filters.title) {
      const titleLower = filters.title.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(titleLower) ||
        item.description.toLowerCase().includes(titleLower)
      );
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
    const newFilters = { ...currentFilters, tags: [tag] };
    handleSearch(newFilters);
  };

  const handleCategoryClick = (category: string) => {
    const newFilters = { ...currentFilters, category };
    handleSearch(newFilters);
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">My Collection</h1>
            <p className="text-muted-foreground">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} 
              {filteredItems.length !== items.length && ` of ${items.length} total`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/blog">
              <Button variant="outline">Blog</Button>
            </Link>
            <Link to="/admin">
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <SearchFilters
            availableTags={getAllTags()}
            availableCategories={getAllCategories()}
            onSearch={handleSearch}
            initialFilters={currentFilters}
          />
        </div>

        {/* Active Filters Display */}
        {(currentFilters.title || currentFilters.yearFrom || currentFilters.yearTo || 
          currentFilters.tags.length > 0 || currentFilters.category) && (
          <div className="mb-6 flex flex-wrap gap-2">
            {currentFilters.title && (
              <Badge variant="secondary">Title: {currentFilters.title}</Badge>
            )}
            {currentFilters.yearFrom && (
              <Badge variant="secondary">From: {currentFilters.yearFrom}</Badge>
            )}
            {currentFilters.yearTo && (
              <Badge variant="secondary">To: {currentFilters.yearTo}</Badge>
            )}
            {currentFilters.tags.map(tag => (
              <Badge key={tag} variant="secondary">Tag: {tag}</Badge>
            ))}
            {currentFilters.category && (
              <Badge variant="secondary">Category: {currentFilters.category}</Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleSearch({
                title: '',
                yearFrom: null,
                yearTo: null,
                tags: [],
                category: ''
              })}
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <Link 
              key={item.id} 
              to={createItemPath(item.title, item.id)}
              className="block transition-transform hover:scale-105"
            >
              <ItemCard
                item={item}
                onTagClick={handleTagClick}
                onCategoryClick={handleCategoryClick}
              />
            </Link>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No items found</p>
            <p className="text-muted-foreground">Try adjusting your search filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
