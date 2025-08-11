## План миграции на Astro (Collepto)

Последнее обновление: {auto}

### 1. Данные и API
- [x] Добавить общие типы `CollectorItem`/`BlogPost` в `collepto-astro/src/types.ts`
- [x] Добавить helper для API (`collepto-astro/src/utils/api.ts`) с поддержкой `PUBLIC_API_BASE`
- [x] Подключить список Items/Blog к API (серверная загрузка в `.astro`)
- [x] Реализовать страницы деталей:
  - [x] `collepto-astro/src/pages/items/[slug].astro` (GET `/api/items/slug/:slug`)
  - [x] `collepto-astro/src/pages/blog/[slug].astro` (GET `/api/blog/slug/:slug`)

### 2. UI и компоненты
- [x] Базовые карточки:
  - [x] `ItemCard.astro`
  - [x] `BlogPostCard.astro`
- [x] Главная страница со сводкой (последние Items/Posts и ссылки)
- [ ] Перенос ключевых компонентов из `archive/legacy-spa/frontend` и `style_example` по приоритету

### 3. Интеграции и окружение
- [x] Использовать переменную окружения `PUBLIC_API_BASE` при сборке Astro
- [x] Стабилизировать сборку при недоступности API (try/catch на страницах списков)
- [x] Добавить SEO-мета (title/description/og), sitemap и robots

### 4. Бэкенд (Cloudflare Worker, D1, KV, R2)
- [x] Использовать существующий воркер `collepto` из `archive/legacy-spa`
- [x] Сбросить и проинициализировать D1 (reset → schema → seed)
- [ ] Проверить/доработать CORS/кэширование под Astro
- [ ] Подготовить админ-маршруты и фронт-страницу логина (позже)

### 5. Деплой и домен
- [ ] Настроить автоматическую сборку и деплой Astro (Pages/CI)


### 6. Улучшения
- [ ] Поиск/фильтры на стороне сервера
- [ ] Оптимизация изображений на фронте (ленивая загрузка, размеры)

### История выполненного
- 2025-…: Инициализация Astro-проекта, Tailwind
- 2025-…: Перенос типов, API helper, страницы списков Items/Blog
- 2025-…: Карточки элементов/постов, фиксация сборки при ошибках API
- 2025-…: Использование существующего воркера, D1 reset/schema/seed


