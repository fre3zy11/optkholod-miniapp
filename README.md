# ОптХолод Mini App

Telegram-магазин замороженных продуктов: светлая ледяная витрина, Telegram-бот,
заказы, импорт XLS и административная панель.

## Рекомендуемый запуск

Надёжнее всего размещать Python backend и собранную Mini App на одном HTTPS-домене.
Тогда каталог, изображения, админка и `/order` используют один источник данных.

1. Скопируйте `.env.example` в `.env` и заполните значения.
2. Используйте новый токен BotFather и пароль администратора длиной от 16 символов.
3. Установите зависимости: `npm ci` и `pip install -r requirements.txt`.
4. Соберите витрину: `npm run build`.
5. Запустите: `python run.py`.

Для контейнера доступен `Dockerfile`. Каталог, заказы, подписчики и загруженные
картинки следует хранить в постоянном томе `/app/data`.

## GitHub Pages или Netlify

Статический frontend сам не принимает заказы и не сохраняет изменения админки.
Если витрина остаётся на Pages/Netlify, отдельно разверните backend и задайте:

- build variable `VITE_API_BASE_URL=https://api.example.com`;
- backend variable `ALLOWED_ORIGINS=https://your-pages-domain.example`;
- `WEBAPP_URL` — полный HTTPS-адрес опубликованной Mini App.

Не оставляйте `VITE_API_BASE_URL` пустым при раздельном размещении: приложение
намеренно показывает ошибку, пока backend не подтвердит сохранение заказа.

## Проверки

```text
npm run typecheck
npm run build
python -m unittest discover -s tests -v
python -m py_compile run.py
node --check admin/admin.js
```

Файлы `.env`, `data/`, исходный XLS и данные подписчиков исключены из Git.
