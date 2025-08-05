import { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Calendar, Award, DollarSign, MapPin } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { PhotoGallery } from './PhotoGallery';

interface CollectorItem {
  id: string;
  category: string;
  photos: string[];
  title: string;
  description: string;
  year: number;
  tags: string[];
  fullDescription?: string;
  condition?: string;
  acquisition?: string;
  value?: string;
}

interface ItemViewProps {
  item: CollectorItem;
  onBack: () => void;
  onTagClick: (tag: string) => void;
  onCategoryClick: (category: string) => void;
  allItems: CollectorItem[];
  onItemClick: (id: string) => void;
}

export function ItemView({ item, onBack, onTagClick, onCategoryClick, allItems, onItemClick }: ItemViewProps) {
  // Get related items (same category, excluding current item)
  const relatedItems = allItems
    .filter(i => i.id !== item.id && i.category === item.category)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="outline" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Назад к коллекции
      </Button>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Photo Gallery Section */}
        <div className="space-y-4">
          <PhotoGallery photos={item.photos} itemTitle={item.title} />
          
          {/* Category Badge */}
          <div className="flex justify-start">
            <Badge 
              variant="secondary" 
              className="cursor-pointer transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95 active:transition-none select-none"
              onClick={() => {
                onCategoryClick(item.category);
                onBack();
              }}
            >
              {item.category}
            </Badge>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Год</p>
                  <p className="font-medium">{item.year}</p>
                </div>
              </div>
            </Card>

            {item.condition && (
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Состояние</p>
                    <p className="font-medium text-sm">{item.condition}</p>
                  </div>
                </div>
              </Card>
            )}

            {item.value && (
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Стоимость</p>
                    <p className="font-medium text-sm">{item.value}</p>
                  </div>
                </div>
              </Card>
            )}

            {item.acquisition && (
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Приобретение</p>
                    <p className="font-medium text-sm">{item.acquisition}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl leading-tight">{item.title}</h1>
            
            <div className="space-y-4">
              <div>
                <h3 className="mb-2">Краткое описание</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </div>

              {item.fullDescription && (
                <div>
                  <h3 className="mb-2">Подробное описание</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.fullDescription}</p>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <h4 className="font-medium">Теги</h4>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95 active:transition-none select-none"
                    onClick={() => {
                      onTagClick(tag);
                      onBack();
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Items */}
      {relatedItems.length > 0 && (
        <div className="space-y-4">
          <h3>Похожие предметы</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedItems.map((relatedItem) => (
              <Card
                key={relatedItem.id}
                className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
                onClick={() => onItemClick(relatedItem.id)}
              >
                <CardHeader className="p-0">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
                    <ImageWithFallback
                      src={relatedItem.photos[0]}
                      alt={relatedItem.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge 
                        variant="secondary" 
                        className="bg-white/90 text-primary cursor-pointer transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95 active:transition-none select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCategoryClick(relatedItem.category);
                          onBack();
                        }}
                      >
                        {relatedItem.category}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="line-clamp-2 leading-tight">{relatedItem.title}</h4>
                    <span className="text-muted-foreground text-sm shrink-0">{relatedItem.year}</span>
                  </div>
                  <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                    {relatedItem.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}