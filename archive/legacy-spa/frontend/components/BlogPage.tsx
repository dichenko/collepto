import { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, Clock, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { getImageUrl } from '../utils/api';

interface CollectorItem {
  id: string;
  category: string;
  photos: string[];
  title: string;
  description: string;
  year: number;
  tags: string[];
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  publishDate: string;
  readTime: number;
  relatedItems: string[]; // Item IDs
  category: string;
}

interface BlogPageProps {
  items: CollectorItem[];
  blogPosts: BlogPost[];
  onItemClick: (id: string) => void;
  onPostClick: (id: string) => void;
}

// Mock blog posts removed - now using real data from props


const POSTS_PER_PAGE = 5;

export function BlogPage({ items, blogPosts, onItemClick, onPostClick }: BlogPageProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(blogPosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const currentPosts = blogPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRelatedItems = (itemIds: string[]) => {
    return items.filter(item => itemIds.includes(item.id));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1>Блог коллекционера</h1>
        <p className="text-muted-foreground">
          Истории, размышления и экспертные мнения о мире коллекционирования
        </p>
      </div>

      {/* Blog Posts */}
      <div className="space-y-8">
        {currentPosts.map((post) => {
          const relatedItems = getRelatedItems(post.relatedItems);
          return (
            <Card key={post.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(post.publishDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {post.readTime} мин чтения
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {post.category}
                      </Badge>
                    </div>
                    <h2 className="text-2xl leading-tight">{post.title}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Related Items */}
                {relatedItems.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Связанные предметы:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {relatedItems.map((item) => (
                        <div
                          key={item.id}
                          className="group cursor-pointer transition-all duration-200 hover:scale-105"
                          onClick={() => onItemClick(item.id)}
                        >
                          <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                            <ImageWithFallback
                              src={getImageUrl(item.photos[0])}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute top-2 left-2">
                              <Badge variant="secondary" className="bg-white/90 text-primary text-xs">
                                {item.category}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-2 space-y-1">
                            <h5 className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                              {item.title}
                            </h5>
                            <p className="text-xs text-muted-foreground">
                              {item.year}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    {relatedItems.length > 0 && `${relatedItems.length} связанных предмета`}
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => onPostClick(post.id)}>
                    Читать полностью
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Предыдущая
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="w-8 h-8 p-0"
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="gap-2"
          >
            Следующая
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}