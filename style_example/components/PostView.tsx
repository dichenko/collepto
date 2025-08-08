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
  onBack: () => void;
  onItemClick: (id: string) => void;
  onPostClick: (id: string) => void;
}

// Mock blog posts (same as in BlogPage)
const mockBlogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'История моей Leica IIIf: От находки до реставрации',
    excerpt: 'Рассказываю о том, как я нашёл эту удивительную камеру на блошином рынке в Гамбурге и что потребовалось для её полного восстановления.',
    content: `В 2018 году я отправился в путешествие по Германии, исследуя блошиные рынки в поисках интересных находок для своей коллекции. Именно в Гамбурге, на знаменитом блошином рынке Flohschanze, моё внимание привлекла небольшая коробка с фототехникой на одном из прилавков.

Среди старых объективов и аксессуаров лежала потускневшая камера в кожаном чехле. Даже под слоем пыли и времени я узнал характерные черты легендарной Leica. Продавец, пожилой немец, рассказал мне, что камера принадлежала его отцу, который был фотографом в послевоенные годы.

После долгих переговоров мы договорились о цене, и я стал счастливым обладателем Leica IIIf 1952 года выпуска. Однако работы предстояло ещё много - камера нуждалась в серьёзной реставрации.

**Процесс реставрации**

Первым делом я отнёс камеру к мастеру по ремонту винтажной фототехники. Диагностика показала, что механизм работает, но нуждается в полной чистке и смазке. Кожаная обивка требовала деликатной обработки специальными составами для восстановления эластичности.

Особого внимания требовал объектив Elmar 50mm f/3.5. Внутри были видны следы грибка, которые могли серьёзно повлиять на качество изображения. Мастер бережно разобрал объектив, очистил все линзы и восстановил антибликовое покрытие.

**Результат**

После трёх месяцев кропотливой работы камера обрела новую жизнь. Все механические функции работают идеально, дальномерная система точно сфокусирована, а затвор отрабатывает все выдержки от 1/1000 до B.

Сегодня эта Leica занимает почётное место �� моей коллекции и продолжает радовать меня своим безупречным функционированием. История её спасения от забвения напоминает мне о том, как важно сохранять наследие прошлого для будущих поколений.`,
    publishDate: '2024-01-15',
    readTime: 8,
    relatedItems: ['1'],
    category: 'Винтажные камеры'
  },
  {
    id: '2',
    title: 'Abbey Road: Почему этот винил особенный',
    excerpt: 'Разбираю детали первого издания Abbey Road и объясняю, что делает эту пластинку такой ценной для коллекционеров.',
    content: `Abbey Road - не просто последний альбом The Beatles, записанный всей группой. Это культурный феномен, изменивший музыкальную индустрию навсегда. Но что делает первое издание 1969 года таким особенным для коллекционеров?

**Техническое совершенство**

Альбом был записан на новейшем 8-дорожечном оборудовани�� в студии Abbey Road, что позволило достичь невиданного ранее качества звука. Именно поэтому первые прессовки, сделанные с оригинальных мастер-лент, звучат совершенно особенно.

Мой экземпляр был спрессован на заводе EMI Hayes в августе 1969 года. Об этом свидетельствует матричный номер "SO-385", выгравированный в зоне выката. Этот номер - ключ к определению подлинности первого издания.

**Редкая ошибка**

Особую ценность моему экземпляру придаёт редкая типографская ошибка. На обратной стороне обложки в списке композиций указана песня "Her Majesty", хотя в окончательной версии альбома она была перенесена в самый конец после долгой паузы. Эта ошибка была быстро исправлена, что делает такие экземпляры крайне редкими.

**Состояние и звучание**

За 55 лет пластинка сохранила удивительное состояние. Минимальные поверхностные царапины не влияют на воспроизведение, а оригинальная обложка практически не имеет следов износа. При прослушивании на качественной аппаратуре можно услышать все нюансы легендарного звучания - от басовых партий Пола МакКартни до гитарных соло Джорджа Харрисона.

**Инвестиционная ценность**

За последние годы стоимость первых изданий Abbey Road выросла в несколько раз. Это связано не только с культурным значением альбома, но и с ограниченным количеством качественно сохранившихся экземпляров.`,
    publishDate: '2024-01-10',
    readTime: 6,
    relatedItems: ['2'],
    category: 'Виниловые пластинки'
  },
  {
    id: '3',
    title: 'Rolex Submariner: Легенда дайвинга',
    excerpt: 'Погружаюсь в историю моего Submariner 5513 и рассказываю, почему эта модель стала иконой часового мира.',
    content: `Rolex Submariner 5513 - это не просто часы. Это символ эпохи, когда дайвинг только начинал своё развитие как спорт, а подводные исследования открывали новые горизонты человечеству.

**История создания**

Модель 5513 была представлена в 1962 году и производилась до 1989 года, что делает её одной из самых долгоживущих моделей в истории Rolex. Мои часы датируются 1974 годом - золотой серединой производства, когда компания уже отработала все детали конструкции.

**Особенности конструкции**

В отличие от современных версий, ref. 5513 не имеет даты, что придаёт циферблату идеальную симметрию. Матовый чёрный циферблат с люминофорными метками и стрелками, покрытыми тритием, создаёт неповторимую винтажную атмосферу.

Унидирекциональный вращающийся безель с 60-минутной шкалой позволял дайверам точно контролировать время погружения. Механизм калибра 1520, основанный на проверенном временем движении, обеспечивал надёжность в самых экстремальных условиях.

**Патина времени**

За почти 50 лет эксплуатации часы приобрели благородную патину. Люминофор на стрелках и метках потемнел до тёплого кремового оттенка, а корпус покрылся лёгкими царапинами, рассказывающими историю своего владельца.

**Современная реставрация**

В 2022 году я отдал часы на сервис к сертифицированному мастеру Rolex. Механизм был полностью разобран, очищен и отрегулирован. Сейчас часы ходят с точностью ±2 секунды в сутки, что соответствует стандартам COSC.

**Место в коллекции**

Это�� Submariner занимает особое место в моей коллекции как образец часового искусства эпохи, когда функциональность была важнее маркетинга. Каждый раз, надевая эти часы, я чувствую связь с золотым веком дайвинга и исследований океана.`,
    publishDate: '2024-01-05',
    readTime: 10,
    relatedItems: ['4'],
    category: 'Винтажные часы'
  },
  {
    id: '4',
    title: 'Комиксы как инвестиция: Amazing Spider-Man #1',
    excerpt: 'Анализирую рынок коллекционных комиксов на примере моего экземпляра первого выпуска Amazing Spider-Man.',
    content: `В мире коллекционирования комиксы долгое время считались детским увлечением. Однако за последние десятилетия ситуация кардинально изменилась, и сегодня редкие выпуски торгуются на аукционах за миллионы долларов.

**Amazing Spider-Man #1: начало легенды**

Март 1963 года. Stan Lee и Steve Ditko представили миру первый сольный выпуск о Человеке-пауке. После успешного дебюта в Amazing Fantasy #15, Спайдер-мен получил собственную серию, которая продолжается по сей день.

Мой экземпляр оценён CGC на 8.0 VF (Very Fine), что считается отличным состоянием для комикса 60-летней давности. Это означает, что комикс имеет незначительные дефекты, но общее состояние превосходное.

**Рынок коллекционных комиксов**

За последние 20 лет стоимость ключевых выпусков Golden и Silver Age выросла экспоненциально. Amazing Spider-Man #1 в состоянии 8.0 стоил около $3,000 в 2010 году. Сегодня такой экземпляр оценивается в $8,500-$12,000.

**Факторы роста стоимости:**
- Популярность персонажа в кино и медиа
- Ограниченное количество экземпляров в хорошем состоянии
- Рост интереса к комиксам как инвестици��нному активу
- Появление профессиональных грейдинговых компаний

**Инвестиционная привлекательность**

Комиксы показывают стабильный рост стоимости, часто превосходящий традиционные инвестиции. Однако важно понимать риски: рынок может быть волатильным, а ликвидность ниже, чем у акций или облигаций.

**Перспективы на будущее**

С развитием цифровых технологий интерес к физическим комиксам только растёт. Молодое поколение, выросшее на фильмах Marvel, начинает собирать оригинальные выпуски, что поддерживает спрос на рынке.

Мой Amazing Spider-Man #1 - не просто инвестиция, но и возможность прикоснуться к истории поп-культуры, держа в руках первоисточник одного из самых популярных супергероев всех времён.`,
    publishDate: '2023-12-28',
    readTime: 7,
    relatedItems: ['3'],
    category: 'Комиксы'
  },
  {
    id: '5',
    title: 'Искусство Энди Уорхола в моей коллекции',
    excerpt: 'Рассказ о приобретении работы Уорхола из серии Campbell\'s Soup и её значении в контексте поп-арта.',
    content: `Энди Уорхол навсегда изменил представление о том, что можно считать искусством. Его работы из серии Campbell's Soup стали иконами поп-арта и одними из самых узнаваемых произведений XX века.

**История серии Campbell's Soup**

В 1962 году Уорхол представил 32 картины с изображением банок супа Campbell's - по одной на каждый вкус, производившийся компанией на тот момент. Эти работы стали манифестом поп-арта, стирая границы между высоким искусством и массовой культурой.

Мой экземпляр относится к серии 1968 года - переосмыслению оригинальной идеи в технике шелкографии. Это работа номер 45 из ограниченного тиража в 250 экземпляров, что подтверждается сертификатом подлинности от Andy Warhol Authentication Board.

**Техника шелкографии**

Уорхол был мастером шелкографии, техники, которая позволяла тиражировать изображения с фотографической точностью. Каждый цвет наносился отдельно через специальные трафареты, что требовало идеальной регистрации - совмещения всех слоёв.

В моём принте можно оценить безупречное качество работы: острые края, насыщенные цвета и чёткая детализация этикетки. Красный и белый цвета сохранили первоначальную яркость благодаря использованию высококачественных красок.

**Философия поп-арта**

Уорхол говорил: "В будущем каждый будет знаменит 15 минут". Банки супа символизировали американский обра�� жизни, массовое потребление и стандартизацию. Художник превратил повседневный объект в произведение искусства, заставив зрителей пересмотреть свои представления о прекрасном.

**Рыночная стоимость**

За последние годы работы Уорхола показали впечатляющий рост стоимости. Принты из серии Campbell's Soup торгуются на международных аукционах за суммы от $50,000 до нескольких миллионов долларов, в зависимости от года создания, тиража и состояния.

**Место в современном искусстве**

Влияние Уорхола на современное искусство невозможно переоценить. Его идеи о тиражировании, известности и коммерциализации искусства предвосхитили эпоху социальных сетей и цифровой культуры.

Владея этой работой, я чувствую себя хранителем важного культурного артефакта - свидетельства эпохи, когда искусство впервые по-настоящему заговорило на языке массовой культуры.`,
    publishDate: '2023-12-20',
    readTime: 12,
    relatedItems: ['6'],
    category: 'Арт-принты'
  }
];

export function PostView({ postId, items, onBack, onItemClick, onPostClick }: PostViewProps) {
  const post = mockBlogPosts.find(p => p.id === postId);
  
  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Пост не найден</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Вернуться к блогу
        </Button>
      </div>
    );
  }

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

  const relatedItems = getRelatedItems(post.relatedItems);

  // Get navigation posts (previous and next)
  const currentIndex = mockBlogPosts.findIndex(p => p.id === postId);
  const navigationPosts = mockBlogPosts.slice(Math.max(0, currentIndex - 2), currentIndex + 3).filter(p => p.id !== postId);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="outline" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Назад к блогу
      </Button>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Post Header */}
          <div className="space-y-4">
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
            <h1 className="text-4xl leading-tight">{post.title}</h1>
          </div>

          {/* Post Content */}
          <div className="prose prose-lg max-w-none">
            {post.content.split('\n\n').map((paragraph, index) => {
              if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                return (
                  <h3 key={index} className="text-xl font-medium mt-8 mb-4">
                    {paragraph.slice(2, -2)}
                  </h3>
                );
              }
              if (paragraph.startsWith('**') && !paragraph.endsWith('**')) {
                const parts = paragraph.split('**');
                return (
                  <div key={index} className="space-y-2">
                    <h4 className="font-medium">{parts[1]}</h4>
                    {parts[2] && <p className="text-muted-foreground leading-relaxed">{parts[2]}</p>}
                  </div>
                );
              }
              return (
                <p key={index} className="text-muted-foreground leading-relaxed mb-4">
                  {paragraph}
                </p>
              );
            })}
          </div>

          {/* Related Items */}
          {relatedItems.length > 0 && (
            <div className="space-y-4 border-t pt-8">
              <h3>Предметы из этой статьи</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {relatedItems.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
                    onClick={() => onItemClick(item.id)}
                  >
                    <CardHeader className="p-0">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
                        <ImageWithFallback
                          src={item.photos[0]}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="bg-white/90 text-primary">
                            {item.category}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="line-clamp-2 leading-tight">{item.title}</h4>
                        <span className="text-muted-foreground text-sm shrink-0">{item.year}</span>
                      </div>
                      <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <Card className="p-4">
              <h4 className="font-medium mb-4">Другие статьи</h4>
              <div className="space-y-3">
                {navigationPosts.map((navPost) => (
                  <div
                    key={navPost.id}
                    className="group cursor-pointer transition-all duration-200 hover:bg-secondary/50 rounded-lg p-3 -m-3"
                    onClick={() => onPostClick(navPost.id)}
                  >
                    <h5 className="text-sm line-clamp-2 group-hover:text-primary transition-colors mb-1">
                      {navPost.title}
                    </h5>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(navPost.publishDate)}</span>
                      <span>•</span>
                      <span>{navPost.readTime} мин</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Navigation */}
            <div className="flex gap-2">
              {currentIndex > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPostClick(mockBlogPosts[currentIndex - 1].id)}
                  className="flex-1 gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Пред.
                </Button>
              )}
              {currentIndex < mockBlogPosts.length - 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPostClick(mockBlogPosts[currentIndex + 1].id)}
                  className="flex-1 gap-1"
                >
                  След.
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}