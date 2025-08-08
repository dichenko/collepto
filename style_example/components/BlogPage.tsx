import { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, Clock, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
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
  relatedItems: string[]; // Item IDs
  category: string;
}

interface BlogPageProps {
  items: CollectorItem[];
  onItemClick: (id: string) => void;
  onPostClick: (id: string) => void;
}

// Mock blog posts
const mockBlogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'История моей Leica IIIf: От находки до реставрации',
    excerpt: 'Рассказываю о том, как я нашёл эту удивительную камеру на блошином рынке в Гамбурге и что потребовалось для её полного восстановления.',
    content: 'Полная история этой замечательной находки...',
    publishDate: '2024-01-15',
    readTime: 8,
    relatedItems: ['1'],
    category: 'Винтажные камеры'
  },
  {
    id: '2',
    title: 'Abbey Road: Почему этот винил особенный',
    excerpt: 'Разбираю детали первого издания Abbey Road и объясняю, что делает эту пластинку такой ценной для коллекционеров.',
    content: 'Подробный анализ этого культового альбома...',
    publishDate: '2024-01-10',
    readTime: 6,
    relatedItems: ['2'],
    category: 'Виниловые пластинки'
  },
  {
    id: '3',
    title: 'Rolex Submariner: Легенда дайвинга',
    excerpt: 'Погружаюсь в историю моего Submariner 5513 и рассказываю, почему эта модель стала иконой часового мира.',
    content: 'История создания и развития легендарных часов...',
    publishDate: '2024-01-05',
    readTime: 10,
    relatedItems: ['4'],
    category: 'Винтажные часы'
  },
  {
    id: '4',
    title: 'Комиксы как инвестиция: Amazing Spider-Man #1',
    excerpt: 'Анализирую рынок коллекционных комиксов на примере моего экземпляра первого выпуска Amazing Spider-Man.',
    content: 'Подробный рыночный анализ коллекционных комиксов...',
    publishDate: '2023-12-28',
    readTime: 7,
    relatedItems: ['3'],
    category: 'Комиксы'
  },
  {
    id: '5',
    title: 'Искусство Энди Уорхола в моей коллекции',
    excerpt: 'Рассказ о приобретении работы Уорхола из серии Campbell\'s Soup и её значении в контексте поп-арта.',
    content: 'Глубокий анализ творчества Уорхола и его влияния...',
    publishDate: '2023-12-20',
    readTime: 12,
    relatedItems: ['6'],
    category: 'Арт-принты'
  },
  {
    id: '6',
    title: 'Lionel Blue Comet: Золотая эра модельных поездов',
    excerpt: 'Путешествие в мир довоенных модельных поездов через призму моего комплекта Lionel Blue Comet.',
    content: 'История модельного железнодорожного транспорта...',
    publishDate: '2023-12-15',
    readTime: 9,
    relatedItems: ['5'],
    category: 'Модельные поезда'
  },
  {
    id: '7',
    title: 'Star Wars и коллекционирование: Начало эпохи',
    excerpt: 'Как фигурка Luke Skywalker от Kenner положила начало современному коллекционированию игрушек.',
    content: 'История коллекционирования игрушек Star Wars...',
    publishDate: '2023-12-10',
    readTime: 8,
    relatedItems: ['7'],
    category: 'Винтажные игрушки'
  },
  {
    id: '8',
    title: 'Литературная классика: "Убить пересмешника"',
    excerpt: 'Рассказ о поиске и приобретении первого издания романа Харпер Ли и его значении в американской литературе.',
    content: 'Литературный анализ и история публикации...',
    publishDate: '2023-12-05',
    readTime: 11,
    relatedItems: ['8'],
    category: 'Винтажные книги'
  },
  {
    id: '9',
    title: 'Секреты аутентификации винтажных предметов',
    excerpt: 'Делюсь опытом определения подлинности коллекционных предметов и расскажу о типичных подделках.',
    content: 'Практическое руководство по аутентификации...',
    publishDate: '2023-11-28',
    readTime: 15,
    relatedItems: ['1', '2', '3'],
    category: 'Коллекционирование'
  },
  {
    id: '10',
    title: 'Хранение и уход за коллекцией',
    excerpt: 'Практические советы по правильному хранению различных типов коллекционных предметов.',
    content: 'Подробное руководство по консервации...',
    publishDate: '2023-11-20',
    readTime: 13,
    relatedItems: ['4', '5', '6'],
    category: 'Коллекционирование'
  }
];

const POSTS_PER_PAGE = 5;

export function BlogPage({ items, onItemClick, onPostClick }: BlogPageProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(mockBlogPosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const currentPosts = mockBlogPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

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
                              src={item.photos[0]}
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