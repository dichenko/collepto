-- Новая идеальная схема для загрузки фотографий
-- Удаляем старые таблицы и создаем новые

DROP TABLE IF EXISTS photo_assets;

-- Основная таблица фотографий (простая и понятная)
CREATE TABLE photos (
    id TEXT PRIMARY KEY,
    item_id TEXT,  -- NULL разрешен для временных фотографий
    filename TEXT NOT NULL,
    original_path TEXT NOT NULL,
    compressed_path TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'processing')),
    upload_session TEXT,  -- Для группировки фотографий до создания предмета
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для производительности
CREATE INDEX idx_photos_item_id ON photos(item_id);
CREATE INDEX idx_photos_upload_session ON photos(upload_session);
CREATE INDEX idx_photos_status ON photos(status);
CREATE INDEX idx_photos_sort_order ON photos(item_id, sort_order);

-- Триггер для обновления updated_at
CREATE TRIGGER photos_updated_at AFTER UPDATE ON photos
BEGIN
    UPDATE photos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
