import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ArrowLeft, Search } from 'lucide-react';
import { BlogPostsList } from '../BlogPostsList';
import { apiClient, type BlogPost } from '../../utils/api';

export function BlogListPage() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [filteredBlogPosts, setFilteredBlogPosts] = useState<BlogPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBlogPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await apiClient.getBlogPosts();
        
        if (response.success && response.data) {
          setBlogPosts(response.data);
          setFilteredBlogPosts(response.data);
        } else {
          setError(response.error || 'Failed to load blog posts');
        }
      } catch (err) {
        console.error('Error loading blog posts:', err);
        setError('Failed to load blog posts');
      } finally {
        setIsLoading(false);
      }
    };

    loadBlogPosts();
  }, []);

  // Мгновенный поиск по блогам
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBlogPosts(blogPosts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = blogPosts.filter(post => {
      const titleMatch = post.title.toLowerCase().includes(query);
      const excerptMatch = post.excerpt.toLowerCase().includes(query);
      const categoryMatch = post.category.toLowerCase().includes(query);
      const contentMatch = post.content && post.content.toLowerCase().includes(query);
      
      return titleMatch || excerptMatch || categoryMatch || contentMatch;
    });

    setFilteredBlogPosts(filtered);
  }, [searchQuery, blogPosts]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading blog posts...</p>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Блог</h1>
            <p className="text-muted-foreground">
              Показано {filteredBlogPosts.length} из {blogPosts.length} постов
            </p>
          </div>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              К коллекции
            </Button>
          </Link>
        </div>

        {/* Поиск */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Поиск по заголовку, содержанию, категории..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <BlogPostsList posts={filteredBlogPosts} />
      </div>
    </div>
  );
}
