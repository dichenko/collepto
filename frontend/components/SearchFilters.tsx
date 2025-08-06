import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Search, X, Filter } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface SearchFiltersProps {
  onSearch: (filters: {
    title: string;
    yearFrom: number | null;
    yearTo: number | null;
    tags: string[];
    category: string;
  }) => void;
  availableTags: string[];
  availableCategories: string[];
  initialFilters?: {
    title?: string;
    yearFrom?: number | null;
    yearTo?: number | null;
    tags?: string[];
    category?: string;
  };
}

export function SearchFilters({ onSearch, availableTags, availableCategories, initialFilters }: SearchFiltersProps) {
  const [title, setTitle] = useState(initialFilters?.title || '');
  const [yearFrom, setYearFrom] = useState<string>(initialFilters?.yearFrom?.toString() || '');
  const [yearTo, setYearTo] = useState<string>(initialFilters?.yearTo?.toString() || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters?.tags || []);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Update state when initialFilters changes
  useEffect(() => {
    if (initialFilters) {
      setTitle(initialFilters.title || '');
      setYearFrom(initialFilters.yearFrom?.toString() || '');
      setYearTo(initialFilters.yearTo?.toString() || '');
      setSelectedTags(initialFilters.tags || []);
      if (initialFilters.tags && initialFilters.tags.length > 0) {
        setIsFiltersOpen(true);
      }
    }
  }, [initialFilters]);

  const handleSearch = () => {
    onSearch({
      title,
      yearFrom: yearFrom ? parseInt(yearFrom) : null,
      yearTo: yearTo ? parseInt(yearTo) : null,
      tags: selectedTags,
      category: '',
    });
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleClearFilters = () => {
    setTitle('');
    setYearFrom('');
    setYearTo('');
    setSelectedTags([]);
    onSearch({
      title: '',
      yearFrom: null,
      yearTo: null,
      tags: [],
      category: '',
    });
  };

  const hasActiveFilters = title || yearFrom || yearTo || selectedTags.length > 0;

  return (
    <Card className="w-full card-refined">
      <CardContent className="p-6 space-y-4">
        {/* Main search bar */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="pl-10"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                    {[title && 'title', yearFrom && 'year', selectedTags.length && 'tags'].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          <Button onClick={handleSearch} className="gap-2">
            <Search className="w-4 h-4" />
            Search
          </Button>

          {hasActiveFilters && (
            <Button variant="outline" onClick={handleClearFilters} className="gap-2">
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Advanced filters */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <CollapsibleContent className="space-y-4">
            {/* Year range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year-from">Year From</Label>
                <Input
                  id="year-from"
                  type="number"
                  placeholder="1900"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                  min="1800"
                  max="2030"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year-to">Year To</Label>
                <Input
                  id="year-to"
                  type="number"
                  placeholder="2030"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                  min="1800"
                  max="2030"
                />
              </div>
            </div>



            {/* Tags filter */}
            <div className="space-y-2">
              <Label>Filter by Tags</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTagToggle(tag)}
                    className="h-auto py-1 px-3 text-sm btn-refined"
                  >
                    {tag}
                    {selectedTags.includes(tag) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Selected tags display */}
            {selectedTags.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Tags:</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => handleTagToggle(tag)}
                        className="hover:bg-secondary-foreground/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}