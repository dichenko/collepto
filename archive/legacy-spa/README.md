# Collepto - Self-hosted Collector's Website

Collepto - это self-hosted веб-сайт для коллекционеров, развертываемый на Cloudflare Workers одной командой. Сайт публичный, управление (админка) доступно только владельцу через Basic-Auth.

## Особенности

- 🚀 **Быстрое развертывание** на Cloudflare Workers
- 🔐 **Basic Auth** для администратора
- 📊 **База данных D1** для хранения предметов и постов блога
- 🖼️ **Cloudflare Assets** для хранения изображений
- 📝 **Markdown блог** с привязкой к предметам коллекции
- 🔍 **Поиск и фильтрация** по различным параметрам
- 📤 **Экспорт коллекции** в CSV + архив фотографий
- 📱 **Адаптивный дизайн** с shadcn/ui компонентами

## Структура проекта

```
Collepto/
├── frontend/              # React фронтенд (готов)
│   ├── components/        # UI компоненты
│   ├── styles/           # CSS стили
│   └── utils/            # Утилиты
├── src/                  # Backend (Cloudflare Workers)
│   ├── api/              # API endpoints
│   ├── lib/              # Библиотеки и утилиты
│   ├── db/               # Работа с базой данных
│   ├── middleware/       # Middleware (авторизация)
│   └── types.ts          # TypeScript типы
├── schema.sql            # Схема базы данных
├── seed.sql              # Тестовые данные
├── wrangler.toml         # Конфигурация Cloudflare
└── package.json          # Зависимости и скрипты
```

## Быстрый старт

### 1. Установка зависимостей

```bash
# Backend зависимости
npm install

# Frontend зависимости
cd frontend
npm install
cd ..
```

### 2. Настройка Cloudflare

1. Авторизуйтесь в Cloudflare:
```bash
wrangler login
```

2. Создайте D1 базу данных:
```bash
wrangler d1 create collepto-db
```

3. Создайте KV namespace для сессий:
```bash
wrangler kv:namespace create "SESSIONS"
```

4. Обновите `wrangler.toml` с полученными ID и вашими учетными данными:
```toml
[vars]
ADMIN_USERNAME = "admin"                    # Ваш логин
ADMIN_PASSWORD = "your_secure_password"     # Ваш пароль  
JWT_SECRET = "your_jwt_secret_key_12345"    # Секретный ключ

[[d1_databases]]
binding = "DB"
database_name = "collepto-db"
database_id = "your_database_id_here"      # ID из шага 2

[[kv_namespaces]]
binding = "SESSIONS"
id = "your_kv_namespace_id_here"           # ID из шага 3
```

### 3. Инициализация продакшн базы данных

```bash
# Создание таблиц в продакшне
wrangler d1 execute collepto-db --remote --file=./schema.sql

# Заполнение тестовыми данными (опционально)
wrangler d1 execute collepto-db --remote --file=./seed.sql
```

### 4. Развертывание backend

```bash
# Развертывание Worker в продакшн
wrangler deploy
```

### 5. Сборка и интеграция фронтенда

```bash
# Соберите React приложение
cd frontend
npm run build

# Скопируйте собранные файлы в assets (для будущей интеграции)
# TODO: Автоматизировать этот процесс
```

### 6. Проверка работы

Ваш сайт доступен по адресу: `https://collepto.your-subdomain.workers.dev`

- **Публичные страницы**: главная, коллекция, блог
- **API**: `/api/items`, `/api/blog`, `/api/auth/login` 
- **Админка**: войдите через кнопку "Админка" в навигации

## Использование

### Публичная часть

- **Коллекция** - просмотр всех предметов с поиском и фильтрами
- **Блог** - посты коллекционера с привязкой к предметам
- **Детальные страницы** - подробная информация о предметах и постах

### Администрирование

1. **Вход в админку:**
   - Нажмите кнопку "Админка" в навигации
   - Введите логин/пароль из `wrangler.toml`

2. **Функции администратора:**
   - ✅ **Просмотр статистики** - количество предметов, постов, категорий
   - ✅ **Управление предметами** - просмотр всех предметов коллекции
   - ✅ **Управление блогом** - просмотр всех постов
   - ✅ **Экспорт данных** - скачивание полной коллекции
   - 🔄 **CRUD операции** - создание, редактирование, удаление (в разработке)
   - 🔄 **Загрузка фото** - управление изображениями (в разработке)

## API Endpoints

### Публичные API

- `GET /api/items` - Список всех предметов
- `GET /api/items/:id` - Детали предмета
- `GET /api/blog` - Опубликованные посты блога
- `GET /api/blog/:id` - Детали поста

### Администраторские API (требуют авторизации)

- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/logout` - Выход из системы
- `GET /api/admin/items` - Управление предметами
- `GET /api/admin/blog` - Управление блогом
- `GET /api/admin/photos` - Управление фотографиями
- `GET /api/admin/export` - Экспорт коллекции

## Структура данных

### Item (Предмет коллекции)

```typescript
interface CollectorItem {
  id: string;
  title: string;                 // Название
  description: string;           // Краткое описание
  fullDescription?: string;      // Подробное описание
  year: number;                  // Год выпуска
  yearFrom?: number;             // Начало диапазона лет
  yearTo?: number;               // Конец диапазона лет
  country?: string;              // Страна производства
  organization?: string;         // Организация/издатель
  size?: string;                 // Размер
  edition?: string;              // Тираж
  series?: string;               // Серия
  tags: string[];                // Теги
  category: string;              // Категория
  condition?: string;            // Состояние
  acquisition?: string;          // Как приобретен
  value?: string;                // Стоимость
  photos: string[];              // Пути к фотографиям
  createdAt: string;
  updatedAt: string;
}
```

### BlogPost (Пост блога)

```typescript
interface BlogPost {
  id: string;
  title: string;                 // Заголовок
  excerpt: string;               // Краткое описание
  content: string;               // Содержание (Markdown)
  publishDate: string;           // Дата публикации
  readTime: number;              // Время чтения (минуты)
  relatedItems: string[];        // ID связанных предметов
  category: string;              // Категория
  published: boolean;            // Опубликован ли
  createdAt: string;
  updatedAt: string;
}
```

## Ограничения

- **Фотографии**: до 10 фото на предмет, до 25 МБ каждая
- **Пользователи**: только один администратор
- **Хранилище**: ограничено лимитами Cloudflare Assets
- **Интерфейс**: только русский язык

## Безопасность

- Basic Auth для администратора
- Защита от брутфорса (после 3 неудачных попыток - блокировка на 5 минут)
- Сессии с истечением срока действия (30 дней)
- Валидация загружаемых файлов

## Технологии

- **Backend**: Cloudflare Workers, Hono, TypeScript
- **Frontend**: React, shadcn/ui, Tailwind CSS
- **База данных**: Cloudflare D1 (SQLite)
- **Хранилище**: Cloudflare Assets/R2
- **Авторизация**: Basic Auth + JWT сессии
- **Обработка изображений**: Sharp (планируется)

## Разработка и обновление

### Локальная разработка

```bash
# Backend разработка
npm run dev

# Frontend разработка (в отдельном терминале)
cd frontend
npm run dev
```

### Обновление проекта

1. Получите последние изменения из репозитория
2. Обновите зависимости:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```
3. Пересоберите фронтенд: `cd frontend && npm run build && cd ..`
4. Разверните: `wrangler deploy`

### Текущий статус интеграции

✅ **Готово:**
- Backend API с полным функционалом
- React фронтенд с адаптацией под реальное API  
- Авторизация и админка с полным CRUD
- База данных в продакшне
- Система загрузки изображений (KV storage)
- Формы создания/редактирования предметов
- Drag&drop загрузка фотографий

🔄 **В разработке:**
- Полная интеграция статических файлов React
- Расширенная система поиска и фильтров
- Улучшение сжатия изображений (WASM)

💡 **Следующие шаги:**
1. Развернуть последние изменения: `wrangler deploy`
2. Завершить интеграцию статических файлов React в Workers  
3. Улучшить систему поиска и фильтров
4. Добавить кастомный домен

## Поддержка

Этот проект создан как self-hosted решение. Для настройки и развертывания следуйте инструкциям выше. При возникновении проблем проверьте:

1. Конфигурацию `wrangler.toml`
2. Настройки Cloudflare (D1, KV, Assets)
3. Логи развертывания в Cloudflare Dashboard

## Лицензия

MIT License - используйте свободно для личных и коммерческих целей.