import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MoreHorizontal } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

import { type CollectorItem, getImageUrl } from '../utils/api';

interface ItemCardProps {
  item: CollectorItem;
  onTagClick?: (tag: string) => void;
  onCategoryClick?: (category: string) => void;
  onItemClick?: () => void;
}

export function ItemCard({
  item,
  onTagClick,
  onCategoryClick,
  onItemClick
}: ItemCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!item.photos.length) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const index = Math.floor((x / width) * item.photos.length);
    setCurrentImageIndex(Math.max(0, Math.min(index, item.photos.length - 1)));
  };
  return (
    <Card className="h-full flex flex-col card-refined">
      <CardHeader className="p-0">
        <div 
          className="relative aspect-[4/3] overflow-hidden rounded-t-md cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => {
            setIsHovering(false);
            setCurrentImageIndex(0);
          }}
        >
          <ImageWithFallback
            src={item.photos.length > 0 ? getImageUrl(item.photos[currentImageIndex] || item.photos[0]) : '/placeholder-image.jpg'}
            alt={item.title}
            className="w-full h-full object-cover transition-all duration-300"
          />
          
          {/* Category Badge */}
          <div className="absolute top-2 left-2">
            <Badge 
              variant="secondary" 
              className="bg-white/90 text-primary cursor-pointer badge-refined select-none"
              onClick={(e) => {
                e.stopPropagation();
                onCategoryClick?.(item.category);
              }}
            >
              {item.category}
            </Badge>
          </div>

          {/* Photo Indicators - only show when hovering and have multiple photos */}
          {item.photos.length > 1 && isHovering && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
              {item.photos.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentImageIndex 
                      ? 'bg-white scale-110' 
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 leading-tight">{item.title}</h3>
            <span className="text-muted-foreground text-sm shrink-0">{item.year}</span>
          </div>
          
          <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
            {item.description}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 4).map((tag, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs cursor-pointer badge-refined select-none"
                onClick={() => onTagClick?.(tag)}
              >
                {tag}
              </Badge>
            ))}
            {item.tags.length > 4 && (
              <Badge 
                variant="outline" 
                className="text-xs cursor-pointer badge-refined select-none"
                onClick={() => {
                  // Show remaining tags or handle overflow click
                  const remainingTags = item.tags.slice(4).join(', ');
                  alert(`Остальные теги: ${remainingTags}`);
                }}
              >
                +{item.tags.length - 4}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 btn-refined"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onItemClick?.();
          }}
        >
          <MoreHorizontal className="w-4 h-4" />
          Подробнее
        </Button>
      </CardFooter>
    </Card>
  );
}