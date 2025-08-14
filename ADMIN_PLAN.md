## План реализации админки (/admin)

Цель: быстрый рабочий личный кабинет без внешних ссылок, доступный по `/admin`, с двумя разделами:
- `/admin/collection` — управление коллекцией (поиск/фильтры, создание, редактирование)
- `/admin/blog` — управление блогом (поиск/фильтры, создание, редактирование)

### Архитектура
- Реализовать страницы админки на стороне воркера (SSR-лайт HTML), чтобы сразу работало на `workers.dev`.
- Аутентификация: проверка cookie `sessionId` через D1 (`getSession`). Если сессии нет — показывать `/admin/login`.
- Действия CRUD использовать существующие API:
  - Items: `/api/admin/items` (GET/POST/PUT/DELETE), `/api/admin/items/search`
  - Blog: `/api/admin/blog` (GET/POST/PUT/DELETE), `/api/admin/blog/search`
- Формы отправлять через `fetch` (JSON) с редиректами по результату.

### Объём первой итерации
1) Роуты навигации:
   - GET `/admin` — приветствие и ссылки на разделы
   - GET `/admin/login` — форма логина (username/password)
   - POST логина через JS → `/api/auth/login` (Set-Cookie) → редирект на `/admin`
   - GET `/admin/logout` — вызов `/api/auth/logout` и редирект на `/admin/login`
2) Коллекция:
   - GET `/admin/collection` — таблица элементов + поиск (q, category, yearFrom, yearTo)
   - GET `/admin/collection/new` — форма создания
   - GET `/admin/collection/:id` — форма редактирования
3) Блог:
   - GET `/admin/blog` — список постов + поиск (q, category, published)
   - GET `/admin/blog/new` — форма создания
   - GET `/admin/blog/:id` — форма редактирования

### Улучшения следующих итераций
- Валидация на форме, удобные виджеты тегов, предпросмотр Markdown для контента блога
- Массовые операции, пагинация, загрузка фото
- Роли/права (если потребуется)


