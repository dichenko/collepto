import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

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
  relatedItems: string[];
  category: string;
}

interface PostViewProps {
  postId: string;
  items: CollectorItem[];
  blogPosts: BlogPost[];
  onBack: () => void;
  onItemClick: (id: string) => void;
  onPostClick: (id: string) => void;
}

export function PostView({ postId, items, blogPosts, onBack, onItemClick, onPostClick }: PostViewProps) {
  const post = blogPosts.find(p => p.id === postId);
  
  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Пост не найден</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к блогу
        </Button>
      </div>
    );
  }

  const getRelatedItems = (itemIds: string[]) => {
    return items.filter(item => itemIds.includes(item.id));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const relatedItems = getRelatedItems(post.relatedItems);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Назад к блогу
      </Button>

      {/* Article Header */}
      <div className="space-y-4">
        <Badge variant="secondary">{post.category}</Badge>
        <h1 className="text-4xl font-bold leading-tight">{post.title}</h1>
        
        <div className="flex items-center gap-6 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(post.publishDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{post.readTime} мин. чтения</span>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <Card>
        <CardContent className="prose prose-gray max-w-none pt-6">
          <div 
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: post.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
          />
        </CardContent>
      </Card>

      {/* Related Items */}
      {relatedItems.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Связанные предметы</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedItems.map((item) => (
              <Card 
                key={item.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => onItemClick(item.id)}
              >
                <div className="aspect-square overflow-hidden rounded-t-lg">
                  <ImageWithFallback
                    src={item.photos[0]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{item.category}</Badge>
                    <span className="text-sm text-muted-foreground">{item.year}</span>
                  </div>
                  <h3 className="font-semibold line-clamp-2">{item.title}</h3>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {item.description}
                  </p>
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {item.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {item.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{item.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-8 border-t">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          К списку постов
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Понравился пост? Поделитесь им!
          </p>
        </div>
        
        <div className="w-32" /> {/* Spacer for centering */}
      </div>
    </div>
  );
}