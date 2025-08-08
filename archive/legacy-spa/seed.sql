-- Seed data for Collepto database
-- Insert sample items
INSERT INTO items (
    id, title, description, full_description, year, country, organization, 
    size, edition, series, tags, category, condition, acquisition, value, 
    created_at, updated_at
) VALUES 
(
    '1', 
    'Leica IIIf Rangefinder Camera',
    'A pristine 1952 Leica IIIf rangefinder camera in original leather case. This classic German-made camera represents the golden age of street photography.',
    'This exceptional Leica IIIf rangefinder camera from 1952 represents the pinnacle of mid-century German precision engineering. The camera features the iconic Elmar 50mm f/3.5 lens in collapsible mount, dual-stroke film advance, and the legendary Leica build quality that made these cameras the choice of professional photographers worldwide.',
    1952,
    'Germany',
    'Leica Camera AG',
    '135mm x 77mm x 32mm',
    'Standard',
    'IIIf Series',
    '["vintage", "german", "rangefinder", "leather case", "rare"]',
    'Vintage Cameras',
    'Excellent - fully functional with minor cosmetic wear',
    'Estate sale in Hamburg, Germany - 2018',
    '$2,800 - $3,200',
    datetime('now'),
    datetime('now')
),
(
    '2',
    'The Beatles - Abbey Road Original Press',
    'Original 1969 UK pressing of The Beatles Abbey Road album. Features the iconic crossing cover art and includes rare misprint on track listing.',
    'This is a genuine first pressing of The Beatles Abbey Road album from 1969, pressed at EMI Hayes in the UK. The record features the original Apple Records label with "Her Majesty" listed on the track listing - a rare misprint that was quickly corrected in later pressings.',
    1969,
    'UK',
    'Apple Records',
    '12" LP',
    'First Pressing',
    'Apple Records',
    '["beatles", "abbey road", "original press", "uk", "misprint"]',
    'Vinyl Records',
    'Near Mint - exceptional preservation',
    'Record shop in London - 2020',
    '$400 - $600',
    datetime('now'),
    datetime('now')
),
(
    '3',
    'Amazing Spider-Man #1',
    'First appearance of Spider-Man in his own comic series. CGC graded 8.0 VF condition. This iconic issue marks the beginning of one of Marvel most beloved characters.',
    'Amazing Spider-Man #1 from March 1963 represents a pivotal moment in comic book history - the first solo adventure of Spider-Man following his debut in Amazing Fantasy #15. This copy has been professionally graded by CGC at 8.0 Very Fine.',
    1963,
    'USA',
    'Marvel Comics',
    'Standard Comic',
    'First Print',
    'Amazing Spider-Man',
    '["spider-man", "marvel", "first appearance", "cgc", "superhero"]',
    'Comic Books',
    'CGC 8.0 VF - professionally graded',
    'Comic convention in San Diego - 2019',
    '$8,500 - $12,000',
    datetime('now'),
    datetime('now')
),
(
    '4',
    'Rolex Submariner 5513',
    'Classic 1970s Rolex Submariner ref. 5513 with no date. Features the iconic black dial and bezel combination. Recently serviced with original papers.',
    'This 1974 Rolex Submariner reference 5513 represents the golden era of the iconic dive watch. The "no date" configuration showcases the pure, symmetrical dial design that many collectors prefer.',
    1974,
    'Switzerland',
    'Rolex SA',
    '40mm case',
    'No Date',
    'Submariner',
    '["rolex", "submariner", "no date", "black dial", "papers"]',
    'Vintage Watches',
    'Very Good - serviced and running perfectly',
    'Watch dealer in Switzerland - 2017',
    '$9,000 - $11,000',
    datetime('now'),
    datetime('now')
);

-- Insert sample blog posts
INSERT INTO blog_posts (
    id, title, excerpt, content, publish_date, read_time, related_items, 
    category, published, created_at, updated_at
) VALUES 
(
    '1',
    'История моей Leica IIIf: От находки до реставрации',
    'Рассказываю о том, как я нашёл эту удивительную камеру на блошином рынке в Гамбурге и что потребовалось для её полного восстановления.',
    'В 2018 году я отправился в путешествие по Германии, исследуя блошиные рынки в поисках интересных находок для своей коллекции. Именно в Гамбурге, на знаменитом блошином рынке Flohschanze, моё внимание привлекла небольшая коробка с фототехникой на одном из прилавков...',
    '2024-01-15',
    8,
    '["1"]',
    'Винтажные камеры',
    1,
    datetime('now'),
    datetime('now')
),
(
    '2',
    'Abbey Road: Почему этот винил особенный',
    'Разбираю детали первого издания Abbey Road и объясняю, что делает эту пластинку такой ценной для коллекционеров.',
    'Abbey Road - не просто последний альбом The Beatles, записанный всей группой. Это культурный феномен, изменивший музыкальную индустрию навсегда...',
    '2024-01-10',
    6,
    '["2"]',
    'Виниловые пластинки',
    1,
    datetime('now'),
    datetime('now')
),
(
    '3',
    'Комиксы как инвестиция: Amazing Spider-Man #1',
    'Анализирую рынок коллекционных комиксов на примере моего экземпляра первого выпуска Amazing Spider-Man.',
    'В мире коллекционирования комиксы долгое время считались детским увлечением. Однако за последние десятилетия ситуация кардинально изменилась...',
    '2023-12-28',
    7,
    '["3"]',
    'Комиксы',
    1,
    datetime('now'),
    datetime('now')
);