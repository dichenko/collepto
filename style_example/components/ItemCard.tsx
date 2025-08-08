import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MoreHorizontal } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ItemCardProps {
  id: string;
  category: string;
  photos: string[];
  title: string;
  description: string;
  year: number;
  tags: string[];
  onMoreDetails?: (id: string) => void;
  onTagClick?: (tag: string) => void;
  onCategoryClick?: (category: string) => void;
}

export function ItemCard({
  id,
  category,
  photos,
  title,
  description,
  year,
  tags,
  onMoreDetails,
  onTagClick,
  onCategoryClick
}: ItemCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const index = Math.floor((x / width) * photos.length);
    setCurrentImageIndex(Math.max(0, Math.min(index, photos.length - 1)));
  };
  return (
    <Card className="h-full flex flex-col transition-all duration-200 hover:shadow-lg">
      <CardHeader className="p-0">
        <div 
          className="relative aspect-[4/3] overflow-hidden rounded-t-lg cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => {
            setIsHovering(false);
            setCurrentImageIndex(0);
          }}
        >
          <ImageWithFallback
            src={photos[currentImageIndex] || photos[0]}
            alt={title}
            className="w-full h-full object-cover transition-all duration-300"
          />
          
          {/* Category Badge */}
          <div className="absolute top-2 left-2">
            <Badge 
              variant="secondary" 
              className="bg-white/90 text-primary cursor-pointer transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95 active:transition-none select-none"
              onClick={(e) => {
                e.stopPropagation();
                onCategoryClick?.(category);
              }}
            >
              {category}
            </Badge>
          </div>

          {/* Photo Indicators - only show when hovering and have multiple photos */}
          {photos.length > 1 && isHovering && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
              {photos.map((_, index) => (
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
            <h3 className="line-clamp-2 leading-tight">{title}</h3>
            <span className="text-muted-foreground text-sm shrink-0">{year}</span>
          </div>
          
          <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 4).map((tag, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs cursor-pointer transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95 active:transition-none select-none"
                onClick={() => onTagClick?.(tag)}
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 4 && (
              <Badge 
                variant="outline" 
                className="text-xs cursor-pointer transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95 active:transition-none select-none"
                onClick={() => {
                  // Show remaining tags or handle overflow click
                  const remainingTags = tags.slice(4).join(', ');
                  alert(`Остальные теги: ${remainingTags}`);
                }}
              >
                +{tags.length - 4}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMoreDetails?.(id)}
          className="w-full gap-2"
        >
          <MoreHorizontal className="w-4 h-4" />
          Подробнее
        </Button>
      </CardFooter>
    </Card>
  );
}