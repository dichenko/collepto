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
}

export function ItemView({ item, onBack }: ItemViewProps) {

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
            <Badge variant="secondary">
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
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}