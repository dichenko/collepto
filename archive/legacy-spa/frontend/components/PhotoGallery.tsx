import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogClose } from './ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { getImageUrl } from '../utils/api';

interface PhotoGalleryProps {
  photos: string[];
  itemTitle: string;
}

export function PhotoGallery({ photos, itemTitle }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) {
    return null;
  }

  const openGallery = (index: number) => {
    setSelectedIndex(index);
  };

  const closeGallery = () => {
    setSelectedIndex(null);
  };

  const navigateToNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % photos.length);
    }
  };

  const navigateToPrevious = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? photos.length - 1 : selectedIndex - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedIndex === null) return;
    
    if (e.key === 'ArrowLeft') {
      navigateToPrevious();
    } else if (e.key === 'ArrowRight') {
      navigateToNext();
    } else if (e.key === 'Escape') {
      closeGallery();
    }
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Фотографии ({photos.length})
        </h3>
        
        {photos.length === 1 ? (
          // Single photo - show large
          <div 
            className="relative w-full aspect-[4/3] rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => openGallery(0)}
          >
            <ImageWithFallback
              src={getImageUrl(photos[0])}
              alt={`${itemTitle} - фото 1`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="bg-black/50 text-white px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Увеличить
              </div>
            </div>
          </div>
        ) : photos.length === 2 ? (
          // Two photos - side by side
          <div className="grid grid-cols-2 gap-4">
            {photos.map((photo, index) => (
              <div
                key={index}
                className="relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => openGallery(index)}
              >
                <ImageWithFallback
                  src={getImageUrl(photo)}
                  alt={`${itemTitle} - фото ${index + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            ))}
          </div>
        ) : (
          // Three or more photos - grid layout
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.slice(0, 6).map((photo, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => openGallery(index)}
              >
                <ImageWithFallback
                  src={getImageUrl(photo)}
                  alt={`${itemTitle} - фото ${index + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                
                {/* Show "+N more" overlay on last visible photo if there are more */}
                {index === 5 && photos.length > 6 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-lg font-semibold">
                      +{photos.length - 6}
                    </span>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Gallery Modal */}
      <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && closeGallery()}>
        <DialogContent 
          className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-black/90"
          onKeyDown={handleKeyDown}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogClose>

            {/* Navigation Buttons */}
            {photos.length > 1 && selectedIndex !== null && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={navigateToPrevious}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={navigateToNext}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}

            {/* Main Image */}
            {selectedIndex !== null && (
              <div className="relative max-w-full max-h-full">
                <ImageWithFallback
                  src={getImageUrl(photos[selectedIndex])}
                  alt={`${itemTitle} - фото ${selectedIndex + 1}`}
                  className="max-w-full max-h-[90vh] object-contain"
                />
                
                {/* Photo Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded text-sm">
                  {selectedIndex + 1} из {photos.length}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}