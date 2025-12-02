# Автобусна CRM

Повноцінна CRM для автобусних перевезень з backend на Express + SQLite, Telegram-ботами на кожного користувача та Bootstrap-адмінкою.

## Швидкий старт
1. Встановіть залежності: `npm install`
2. Запустіть сервер: `npm start` (PORT=3000 за замовчуванням)
3. Адмінка: `http://localhost:3000/admin/login.html`
4. Дефолтні акаунти для входу (email + пароль):
   - arsenskripka89@gmail.com / Arsen2024!
   - admin@example.com / admin123

### FastAPI інструменти зіставлення
1. Створіть віртуальне оточення Python (опційно): `python3 -m venv .venv && source .venv/bin/activate`
2. Встановіть залежності FastAPI: `pip install -r requirements.txt`
3. Запустіть сервер: `uvicorn main:app --reload` (PORT=8000 за замовчуванням)
4. Веб-інтерфейс доступний на `http://localhost:8000`

## Стек
- Node.js, Express, sqlite3
- Telegraf (Telegram)
- Bootstrap 5 для адмінки

## Структура
- `backend/` – API, middleware, сервіси, боти
- `frontend/admin` – HTML/CSS/JS адмінки
- `frontend/public` – статичні файли (логотип)

## Функціонал
- JWT-аутентифікація по email та ролі (admin, manager, driver)
- CRUD для користувачів, маршрутів, автобусів, рейсів
- Генерація рейсів на кілька днів наперед
- Бронювання з перевіркою вільних місць, скасуванням та списками пасажирів
- Розсилки через Telegram
- Персональні Telegram-боти з меню бронювання та перегляду рейсів

## Налаштування ботів
1. Створіть свого Telegram-бота в BotFather та скопіюйте токен.
2. Увійдіть в адмінку під своїм акаунтом, відкрийте розділ «Налаштування Telegram-бота».
3. Введіть токен і збережіть — система автоматично поставить webhook виду `https://<SERVER>/webhook/<userId>`.
4. Для кожного користувача можна задати окремий токен (multi-tenant).

## Ролі доступу
- **admin** – повний доступ
- **manager** – управління даними без редагування ролей
- **driver** – перегляд списку пасажирів

## Запуск на Replit
- Стартова команда: `npm start`
- Вкажіть `PORT` у налаштуваннях, Replit пробросить публічний URL для WEBHOOK_URL.

## Логи та помилки
- Використовується `morgan` для логування HTTP
- Єдине middleware повертає помилки у форматі `{ message }`
