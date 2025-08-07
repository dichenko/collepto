import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';
import { ItemView } from '../ItemView';
import { apiClient, type CollectorItem } from '../../utils/api';

export function ItemPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract slug from pathname: /items/title-slug_1234 -> title-slug_1234
  const slug = location.pathname.replace('/items/', '');
  const [item, setItem] = useState<CollectorItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadItem = async () => {
      if (!slug) {
        setError('Invalid item URL');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const response = await apiClient.getItemBySlug(slug);
        
        if (response.success && response.data) {
          setItem(response.data);
        } else {
          setError(response.error || 'Item not found');
        }
      } catch (err) {
        console.error('Error loading item:', err);
        setError('Failed to load item');
      } finally {
        setIsLoading(false);
      }
    };

    loadItem();
  }, [slug]);

  // Update document title and meta tags
  useEffect(() => {
    if (item) {
      document.title = `${item.title} - Collepto`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', item.description || `${item.title} from ${item.year}`);
      }
    }

    return () => {
      document.title = 'Collepto';
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', 'Personal collection management system');
      }
    };
  }, [item]);

  const handleBack = () => {
    navigate('/');
  };

  const handleTagClick = (tag: string) => {
    // Navigate to collection page with tag filter
    navigate(`/?tag=${encodeURIComponent(tag)}`);
  };

  const handleCategoryClick = (category: string) => {
    // Navigate to collection page with category filter
    navigate(`/?category=${encodeURIComponent(category)}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading item...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-lg mb-4">Error: {error || 'Item not found'}</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collection
          </Button>
        </div>
        
        <ItemView 
          item={item} 
          onBack={handleBack}
          onTagClick={handleTagClick}
          onCategoryClick={handleCategoryClick}
        />
      </div>
    </div>
  );
}
