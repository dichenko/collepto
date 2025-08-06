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
  post: BlogPost;
  onBack: () => void;
}

export function PostView({ post, onBack }: PostViewProps) {
  
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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

      {/* Related Items Info */}
      {post.relatedItems.length > 0 && (
        <div className="text-center py-4">
          <p className="text-muted-foreground">
            В этом посте упоминается {post.relatedItems.length} {post.relatedItems.length === 1 ? 'предмет' : 'предметов'} из коллекции
          </p>
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