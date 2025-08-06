import { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Calendar, Award, DollarSign, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
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
  onTagClick?: (tag: string) => void;
  onCategoryClick?: (category: string) => void;
}

export function ItemView({ item, onBack, onTagClick, onCategoryClick }: ItemViewProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % item.photos.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + item.photos.length) % item.photos.length);
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="outline" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Назад к коллекции
      </Button>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image Section */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-md">
            <ImageWithFallback
              src={item.photos.length > 0 ? item.photos[currentImageIndex] : '/placeholder-image.jpg'}
              alt={item.title}
              className="w-full h-full object-cover"
            />
            
            {/* Category Badge */}
            <div className="absolute top-4 left-4">
              <Badge 
                variant="secondary" 
                className="bg-white/90 text-primary cursor-pointer transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95 active:transition-none select-none"
                onClick={() => {
                  onCategoryClick?.(item.category);
                  onBack();
                }}
              >
                {item.category}
              </Badge>
            </div>

            {/* Navigation Arrows */}
            {item.photos.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-all duration-200 hover:scale-110"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-800" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-all duration-200 hover:scale-110"
                >
                  <ChevronRight className="w-5 h-5 text-gray-800" />
                </button>

                {/* Image Indicators */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {item.photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        index === currentImageIndex 
                          ? 'bg-white scale-110' 
                          : 'bg-white/60 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>

                {/* Image Counter */}
                <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {currentImageIndex + 1} / {item.photos.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {item.photos.length > 1 && (
            <div className="grid grid-cols-3 gap-2">
              {item.photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`relative aspect-square overflow-hidden rounded-md transition-all duration-200 ${
                    index === currentImageIndex 
                      ? 'ring-2 ring-primary scale-105' 
                      : 'hover:scale-105 opacity-70 hover:opacity-100'
                  }`}
                >
                  <ImageWithFallback
                    src={photo}
                    alt={`${item.title} - изображение ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 card-refined">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Год</p>
                  <p className="font-medium">{item.year}</p>
                </div>
              </div>
            </Card>

            {item.condition && (
              <Card className="p-4 card-refined">
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
              <Card className="p-4 card-refined">
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
              <Card className="p-4 card-refined">
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
                      onTagClick?.(tag);
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


    </div>
  );
}