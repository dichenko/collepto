-- Blog posts seed data
INSERT INTO blog_posts (
    id, title, excerpt, content, publish_date, read_time, related_items, 
    category, published, created_at, updated_at
) VALUES 
(
    '1',
    'The Story of My Leica IIIf: From Find to Restoration',
    'How I discovered this amazing camera at a flea market in Hamburg and what it took to fully restore it.',
    'In 2018, I traveled through Germany exploring flea markets in search of interesting finds for my collection. At the famous Flohschanze flea market in Hamburg, a small box of photography equipment caught my attention...',
    '2024-01-15',
    8,
    '["1"]',
    'Vintage Cameras',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    '2',
    'Abbey Road: Why This Vinyl Is Special',
    'Breaking down the details of the first pressing of Abbey Road and explaining what makes this record so valuable to collectors.',
    'Abbey Road is not just the last album The Beatles recorded as a group. It is a cultural phenomenon that changed the music industry forever...',
    '2024-01-10',
    6,
    '["2"]',
    'Vinyl Records',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    '3',
    'Comics as Investment: Amazing Spider-Man #1',
    'Analyzing the collectible comics market using my copy of the first Amazing Spider-Man issue as an example.',
    'In the world of collecting, comics were long considered a childrens hobby. However, over the past decades, the situation has changed dramatically...',
    '2023-12-28',
    7,
    '["3"]',
    'Comics',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);