import { useState, useEffect } from 'react';
import { ItemCard } from './components/ItemCard';
import { SearchFilters } from './components/SearchFilters';
import { BlogPage } from './components/BlogPage';
import { ItemView } from './components/ItemView';
import { PostView } from './components/PostView';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { X, Menu, Home, BookOpen } from 'lucide-react';
import { unsplash_tool } from './utils/unsplash';

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

// Mock data for collector's items
const mockItems: CollectorItem[] = [
  {
    id: '1',
    category: 'Vintage Cameras',
    photos: ['', '', ''],
    title: 'Leica IIIf Rangefinder Camera',
    description: 'A pristine 1952 Leica IIIf rangefinder camera in original leather case. This classic German-made camera represents the golden age of street photography.',
    fullDescription: 'This exceptional Leica IIIf rangefinder camera from 1952 represents the pinnacle of mid-century German precision engineering. The camera features the iconic Elmar 50mm f/3.5 lens in collapsible mount, dual-stroke film advance, and the legendary Leica build quality that made these cameras the choice of professional photographers worldwide. The original leather case shows beautiful aging and patina, while the camera body retains its original chrome finish with minimal wear. All mechanical functions operate smoothly, including the rangefinder coupling and shutter speeds from 1/1000 to B. This particular example includes the original yellow filter and lens cap.',
    year: 1952,
    tags: ['vintage', 'german', 'rangefinder', 'leather case', 'rare'],
    condition: 'Excellent - fully functional with minor cosmetic wear',
    acquisition: 'Estate sale in Hamburg, Germany - 2018',
    value: '$2,800 - $3,200'
  },
  {
    id: '2',
    category: 'Vinyl Records',
    photos: ['', '', ''],
    title: 'The Beatles - Abbey Road Original Press',
    description: 'Original 1969 UK pressing of The Beatles Abbey Road album. Features the iconic crossing cover art and includes rare misprint on track listing.',
    fullDescription: 'This is a genuine first pressing of The Beatles\' Abbey Road album from 1969, pressed at EMI Hayes in the UK. The record features the original Apple Records label with "Her Majesty" listed on the track listing - a rare misprint that was quickly corrected in later pressings. The vinyl is in remarkable condition with only the slightest surface marks that don\'t affect playback. The iconic cover art remains vibrant with sharp corners and minimal ring wear. This pressing includes the rare "SO-385" matrix number and was mastered from the original studio tapes. The gatefold sleeve contains all original inserts and the vinyl plays with the warm, rich sound that only original pressings can deliver.',
    year: 1969,
    tags: ['beatles', 'abbey road', 'original press', 'uk', 'misprint'],
    condition: 'Near Mint - exceptional preservation',
    acquisition: 'Record shop in London - 2020',
    value: '$400 - $600'
  },
  {
    id: '3',
    category: 'Comic Books',
    photos: ['', '', ''],
    title: 'Amazing Spider-Man #1',
    description: 'First appearance of Spider-Man in his own comic series. CGC graded 8.0 VF condition. This iconic issue marks the beginning of one of Marvel\'s most beloved characters.',
    fullDescription: 'Amazing Spider-Man #1 from March 1963 represents a pivotal moment in comic book history - the first solo adventure of Spider-Man following his debut in Amazing Fantasy #15. This copy has been professionally graded by CGC at 8.0 Very Fine, indicating above-average condition with minor defects. The iconic cover by Steve Ditko features Spider-Man swinging through New York with the classic "Spider-Man" logo treatment. The interior story, "Spider-Man Freak! Public Menace or Hero?" showcases Stan Lee and Steve Ditko at their creative peak. This issue also features the first appearance of J. Jonah Jameson as editor of the Daily Bugle and establishes many of the series\' key elements. The comic shows excellent color retention, good spine integrity, and clean interior pages.',
    year: 1963,
    tags: ['spider-man', 'marvel', 'first appearance', 'cgc', 'superhero'],
    condition: 'CGC 8.0 VF - professionally graded',
    acquisition: 'Comic convention in San Diego - 2019',
    value: '$8,500 - $12,000'
  },
  {
    id: '4',
    category: 'Vintage Watches',
    photos: ['', '', ''],
    title: 'Rolex Submariner 5513',
    description: 'Classic 1970s Rolex Submariner ref. 5513 with no date. Features the iconic black dial and bezel combination. Recently serviced with original papers.',
    fullDescription: 'This 1974 Rolex Submariner reference 5513 represents the golden era of the iconic dive watch. The "no date" configuration showcases the pure, symmetrical dial design that many collectors prefer. This example features the matte black dial with painted hour markers and hands that have developed a beautiful warm patina over the decades. The unidirectional rotating bezel retains excellent action and crisp timing markers. The case shows honest wear consistent with careful use but maintains strong lines and sharp edges. Recently serviced by a certified Rolex technician, the movement keeps excellent time within COSC standards. Includes original papers, box, and service documentation. The 20mm Oyster bracelet shows stretch consistent with age but remains comfortable and secure.',
    year: 1974,
    tags: ['rolex', 'submariner', 'no date', 'black dial', 'papers'],
    condition: 'Very Good - serviced and running perfectly',
    acquisition: 'Watch dealer in Switzerland - 2017',
    value: '$9,000 - $11,000'
  },
  {
    id: '5',
    category: 'Model Trains',
    photos: ['', '', ''],
    title: 'Lionel Blue Comet Set',
    description: 'Complete 1930s Lionel Blue Comet passenger train set in original boxes. Includes locomotive, tender, and three passenger cars. All pieces are in working condition.',
    fullDescription: 'This exceptional Lionel Blue Comet passenger set from 1935 represents the height of pre-war toy train manufacturing. The set consists of the iconic 400E steam locomotive in blue and cream livery, matching tender, and three passenger cars: the Westphal (baggage), the Queensboro (Pullman), and the Maplewood (observation). All pieces retain their original paint with only minor touch-ups and show excellent mechanical condition. The locomotive features working headlight, smoking unit, and powerful motor that pulls the full consist smoothly. Each car includes detailed interior appointments and operating couplers. The original boxes, while showing age, are complete and display the beautiful period graphics. This set includes original track sections, transformer, and accessories, making it a complete operating layout ready for display or running.',
    year: 1935,
    tags: ['lionel', 'blue comet', 'passenger', 'original boxes', 'working'],
    condition: 'Excellent - all original and operational',
    acquisition: 'Private collector in New York - 2016',
    value: '$3,500 - $4,500'
  },
  {
    id: '6',
    category: 'Art Prints',
    photos: ['', '', ''],
    title: 'Andy Warhol Campbell\'s Soup Screen Print',
    description: 'Limited edition screen print from Andy Warhol\'s iconic Campbell\'s Soup series. Numbered 45/250 and authenticated. Features vibrant colors and sharp registration.',
    fullDescription: 'This screenprint is from Andy Warhol\'s legendary Campbell\'s Soup portfolio, created in 1968 as a follow-up to his groundbreaking 1962 paintings. This particular print features the Tomato soup variety and is number 45 from the limited edition of 250. The print demonstrates Warhol\'s mastery of the screenprint medium with perfect registration, vibrant colors, and crisp detail work. The paper shows no foxing or discoloration, and the image remains bright and impactful. This piece includes authentication from the Andy Warhol Authentication Board and comes with a certificate of authenticity. The print is unframed but has been stored in museum-quality conditions. The signature red and white color scheme captures the essence of American consumer culture that Warhol celebrated and critiqued through his art.',
    year: 1968,
    tags: ['warhol', 'screen print', 'campbell soup', 'limited edition', 'pop art'],
    condition: 'Mint - museum quality preservation',
    acquisition: 'Gallery auction in New York - 2021',
    value: '$45,000 - $60,000'
  },
  {
    id: '7',
    category: 'Vintage Toys',
    photos: ['', '', ''],
    title: 'Original Star Wars Luke Skywalker Figure',
    description: 'Mint on card 1977 Kenner Star Wars Luke Skywalker action figure. The card is in excellent condition with minimal edge wear and the bubble is clear.',
    fullDescription: 'This mint-on-card Luke Skywalker action figure represents the very beginning of Star Wars merchandising and the birth of the modern action figure collecting hobby. Produced by Kenner in 1977, this figure captures Luke in his iconic Tatooine farmboy outfit from A New Hope. The figure remains sealed in its original blister pack, which is crystal clear without yellowing, cracking, or separation. The cardback features the classic "12 back" design showing the first wave of Star Wars figures. The card itself shows exceptional preservation with sharp corners, vibrant colors, and only the slightest edge wear. The figure inside maintains perfect paint applications and accessories. This represents one of the most sought-after pieces in vintage Star Wars collecting, especially in this condition.',
    year: 1977,
    tags: ['star wars', 'kenner', 'luke skywalker', 'mint on card', 'bubble'],
    condition: 'Mint on Card - museum quality',
    acquisition: 'Toy convention in Los Angeles - 2015',
    value: '$2,200 - $2,800'
  },
  {
    id: '8',
    category: 'Vintage Books',
    photos: ['', '', ''],
    title: 'First Edition To Kill a Mockingbird',
    description: 'True first edition of Harper Lee\'s To Kill a Mockingbird from 1960. Features original dust jacket in very fine condition. One of the most important American novels.',
    fullDescription: 'This true first edition of Harper Lee\'s Pulitzer Prize-winning novel "To Kill a Mockingbird" is one of the most significant pieces of 20th-century American literature. Published by J.B. Lippincott Company in July 1960, this copy contains all the first edition points including "publishers" on the rear panel of the dust jacket. The book is in remarkable condition with tight binding, clean pages, and minimal age toning. The dust jacket, often missing or damaged on copies of this title, is present in very fine condition with only slight edge wear and no chips or tears. The spine color remains vibrant and unfaded. This novel\'s exploration of racial injustice in the American South remains as relevant today as when it was first published. The book was adapted into the acclaimed 1962 film starring Gregory Peck.',
    year: 1960,
    tags: ['first edition', 'harper lee', 'dust jacket', 'american literature', 'classic'],
    condition: 'Very Fine - exceptional for this title',
    acquisition: 'Rare book dealer in Boston - 2014',
    value: '$5,500 - $7,500'
  }
];

type Page = 'collection' | 'blog' | 'item' | 'post';

export default function App() {
  const [items, setItems] = useState<CollectorItem[]>(mockItems);
  const [filteredItems, setFilteredItems] = useState<CollectorItem[]>(mockItems);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('collection');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Load images using Unsplash
  useEffect(() => {
    const loadImages = async () => {
      const imagePromises = mockItems.map(async (item, index) => {
        let queries = [];
        switch (item.category) {
          case 'Vintage Cameras':
            queries = ['vintage camera leica', 'antique camera equipment', 'classic camera detail'];
            break;
          case 'Vinyl Records':
            queries = ['vinyl record beatles', 'vintage album cover', 'retro music record'];
            break;
          case 'Comic Books':
            queries = ['comic book spider-man', 'vintage comic collection', 'superhero comic art'];
            break;
          case 'Vintage Watches':
            queries = ['vintage rolex watch', 'classic wristwatch detail', 'antique timepiece'];
            break;
          case 'Model Trains':
            queries = ['vintage model train', 'toy train collection', 'classic railroad model'];
            break;
          case 'Art Prints':
            queries = ['andy warhol art', 'pop art prints', 'vintage art poster'];
            break;
          case 'Vintage Toys':
            queries = ['vintage star wars toys', 'retro action figures', 'classic toy collection'];
            break;
          case 'Vintage Books':
            queries = ['vintage classic books', 'antique book collection', 'old literature'];
            break;
          default:
            queries = ['vintage collectible', 'antique items', 'retro objects'];
        }
        
        try {
          const photoPromises = queries.map(async (query, photoIndex) => {
            try {
              const imageUrl = await unsplash_tool({ query });
              return imageUrl;
            } catch (error) {
              return `https://picsum.photos/400/300?random=${index * 3 + photoIndex}`;
            }
          });
          
          const photos = await Promise.all(photoPromises);
          return { ...item, photos };
        } catch (error) {
          const photos = [
            `https://picsum.photos/400/300?random=${index * 3}`,
            `https://picsum.photos/400/300?random=${index * 3 + 1}`,
            `https://picsum.photos/400/300?random=${index * 3 + 2}`
          ];
          return { ...item, photos };
        }
      });

      const itemsWithImages = await Promise.all(imagePromises);
      setItems(itemsWithImages);
      setFilteredItems(itemsWithImages);
      setIsLoading(false);
    };

    loadImages();
  }, []);

  // State to track current filters for SearchFilters component
  const [currentFilters, setCurrentFilters] = useState({
    title: '',
    yearFrom: null as number | null,
    yearTo: null as number | null,
    tags: [] as string[],
    category: '' as string,
  });

  // Get all available tags
  const getAllTags = () => {
    const allTags = items.flatMap(item => item.tags);
    return [...new Set(allTags)].sort();
  };

  // Handle search and filtering
  const handleSearch = (filters: {
    title: string;
    yearFrom: number | null;
    yearTo: number | null;
    tags: string[];
    category?: string;
  }) => {
    const updatedFilters = { ...filters, category: filters.category || '' };
    setCurrentFilters(updatedFilters);
    let filtered = items;

    // Filter by title
    if (filters.title) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(filters.title.toLowerCase()) ||
        item.description.toLowerCase().includes(filters.title.toLowerCase())
      );
    }

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    // Filter by year range
    if (filters.yearFrom) {
      filtered = filtered.filter(item => item.year >= filters.yearFrom!);
    }
    if (filters.yearTo) {
      filtered = filtered.filter(item => item.year <= filters.yearTo!);
    }

    // Filter by tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter(item =>
        filters.tags.some(tag => item.tags.includes(tag))
      );
    }

    setFilteredItems(filtered);
  };

  // Handle more details click
  const handleMoreDetails = (id: string) => {
    setSelectedItemId(id);
    setCurrentPage('item');
  };

  // Handle post click
  const handlePostClick = (id: string) => {
    setSelectedPostId(id);
    setCurrentPage('post');
  };

  // Handle tag click - filter by selected tag
  const handleTagClick = (tag: string) => {
    const newFilters = {
      title: '',
      yearFrom: null,
      yearTo: null,
      tags: [tag],
      category: '',
    };
    handleSearch(newFilters);
    setCurrentFilters(newFilters);
  };

  // Handle category click - filter by selected category
  const handleCategoryClick = (category: string) => {
    const newFilters = {
      title: '',
      yearFrom: null,
      yearTo: null,
      tags: [],
      category: category,
    };
    handleSearch(newFilters);
    setCurrentFilters(newFilters);
    setCurrentPage('collection');
  };

  // Handle navigation
  const handleBackToCollection = () => {
    setCurrentPage('collection');
    setSelectedItemId(null);
  };

  const handleBackToBlog = () => {
    setCurrentPage('blog');
    setSelectedPostId(null);
  };

  const handleClearFilters = () => {
    const newFilters = {
      title: '',
      yearFrom: null,
      yearTo: null,
      tags: [],
      category: '',
    };
    setCurrentFilters(newFilters);
    setFilteredItems(items);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center py-12">
            <h1>Персональная коллекция</h1>
            <p className="text-muted-foreground mt-2">Загружаем удивительные предметы...</p>
          </div>
        </div>
      </div>
    );
  }

  // Get selected item
  const selectedItem = selectedItemId ? items.find(item => item.id === selectedItemId) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h2 className="text-xl font-semibold">Моя коллекция</h2>
              <div className="flex items-center gap-1">
                <Button
                  variant={currentPage === 'collection' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentPage('collection')}
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  Коллекция
                </Button>
                <Button
                  variant={currentPage === 'blog' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentPage('blog')}
                  className="gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Блог
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto max-w-7xl p-4">
        {/* Collection Page */}
        {currentPage === 'collection' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1>Добро пожаловать в мою коллекцию</h1>
              <p className="text-muted-foreground">
                Исследуйте уникальные винтажные предметы, собранные с любовью за годы коллекционирования
              </p>
            </div>

            {/* Search and Filters */}
            <SearchFilters
              onSearch={handleSearch}
              availableTags={getAllTags()}
              initialFilters={currentFilters}
            />

            {/* Results count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-muted-foreground">
                  Показано {filteredItems.length} из {items.length} предметов
                </p>
                {currentFilters.category && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Категория:</span>
                    <Badge variant="secondary" className="gap-1">
                      {currentFilters.category}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-destructive" 
                        onClick={() => {
                          const newFilters = { ...currentFilters, category: '' };
                          handleSearch(newFilters);
                        }}
                      />
                    </Badge>
                  </div>
                )}
                {(currentFilters.title || currentFilters.yearFrom || currentFilters.yearTo || currentFilters.tags.length > 0 || currentFilters.category) && (
                  <Button variant="outline" size="sm" onClick={handleClearFilters} className="gap-2">
                    <X className="w-4 h-4" />
                    Очистить фильтры
                  </Button>
                )}
              </div>
            </div>

            {/* Items Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Нет предметов, соответствующих вашим фильтрам.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Попробуйте изменить критерии поиска или очистить фильтры.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    {...item}
                    onMoreDetails={handleMoreDetails}
                    onTagClick={handleTagClick}
                    onCategoryClick={handleCategoryClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Blog Page */}
        {currentPage === 'blog' && (
          <BlogPage items={items} onItemClick={handleMoreDetails} onPostClick={handlePostClick} />
        )}

        {/* Post View Page */}
        {currentPage === 'post' && selectedPostId && (
          <PostView 
            postId={selectedPostId}
            items={items}
            onBack={handleBackToBlog}
            onItemClick={handleMoreDetails}
            onPostClick={handlePostClick}
          />
        )}

        {/* Item View Page */}
        {currentPage === 'item' && selectedItem && (
          <ItemView 
            item={selectedItem} 
            onBack={handleBackToCollection}
            onTagClick={handleTagClick}
            onCategoryClick={handleCategoryClick}
            allItems={items}
            onItemClick={handleMoreDetails}
          />
        )}
      </div>
    </div>
  );
}