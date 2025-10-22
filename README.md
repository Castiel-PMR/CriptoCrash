# 💥 CriptoCrash - Real-time Cryptocurrency Liquidations Dashboard

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

> Визуализация ликвидаций криптовалют в реальном времени с Binance Futures в виде интерактивной Canvas-анимации

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)

## 🎮 Демо

[🔗 Посмотреть демо](https://your-app.onrender.com)

## ✨ Особенности

- 🔴 **Real-time ликвидации** - прямое подключение к Binance WebSocket
- 🎨 **Интерактивная Canvas-анимация** - денежные мешки падают с неба
- 💥 **10 типов взрывов** - при клике на мешок (фейерверк, молнии, звезды и т.д.)
- 🎯 **Историческая пушка 17-18 века** - автоматически стреляет по мешкам
- 📊 **Bitcoin график на фоне** - реальные свечи с Binance API
- 🚀 **Оптимизировано под память** - расход памяти 200-400 MB (было 2+ GB)
- 🌐 **Мобильная версия** - полностью адаптивный дизайн
- 🔊 **Звуковые эффекты** - реалистичный звук пушки
- 📈 **Статистика 24ч** - лонги/шорты с процентами доминирования
- 🛡️ **Фильтрация** - блокировка невалидных символов (китайские иероглифы и т.д.)
- 🔥 **Liquidation Delta** - инновационная метрика силы ликвидаций на единицу движения цены

## 🚀 Быстрый старт

### Требования

- Node.js >= 18.0.0
- npm или yarn

### Локальная установка

```bash
# Клонировать репозиторий
git clone https://github.com/your-username/criptocrash.git
cd criptocrash

# Установить зависимости
npm install

# Запустить в режиме разработки
npm run dev

# Открыть http://localhost:5000
```

### Production сборка

```bash
# Собрать проект
npm run build

# Запустить production сервер
npm start
```

## 📦 Деплой на Render.com

### Автоматический деплой

1. **Fork** этот репозиторий
2. Зайдите на [Render.com](https://render.com)
3. Создайте новый **Web Service**
4. Подключите ваш GitHub репозиторий
5. Настройте параметры:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
6. Нажмите **Create Web Service**

### Environment Variables (опционально)

```env
NODE_ENV=production
PORT=5000
```

## 🏗️ Технологический стек

### Frontend
- ⚛️ **React 18** - UI библиотека
- 🎨 **Tailwind CSS** - стилизация
- 🖼️ **HTML5 Canvas** - анимация
- 📡 **WebSocket** - real-time соединение
- 🔄 **TanStack Query** - управление состоянием
- 🎭 **Framer Motion** - анимации UI
- 🎯 **Radix UI** - доступные компоненты

### Backend
- 🚀 **Node.js + Express** - сервер
- 🔌 **WebSocket (ws)** - real-time коммуникация
- 📊 **Binance API** - источник данных
- 💾 **Drizzle ORM** - работа с БД
- 🗄️ **PostgreSQL (Neon)** - база данных

### DevOps
- 📦 **Vite** - сборщик
- 🔧 **TypeScript** - типизация
- 🎭 **ESBuild** - быстрая сборка

## 📁 Структура проекта

```
.
├── client/                 # Frontend React приложение
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Страницы
│   │   └── types/         # TypeScript типы
│   └── index.html
├── server/                 # Backend Express сервер
│   ├── services/          # Бизнес-логика
│   ├── routes.ts          # API маршруты
│   └── index.ts           # Точка входа
├── shared/                 # Общий код (схемы)
└── public/                 # Статические файлы
```

## 🔧 Оптимизации

### Память
- ✅ Лимит частиц: 300 (вместо бесконечности)
- ✅ Лимит мешков: 20 (вместо 100)
- ✅ Периодическая очистка каждые 5 секунд
- ✅ Ускоренное исчезновение частиц (в 2-3 раза быстрее)
- ✅ Оптимизированные взрывы (20 частиц вместо 50)

### Производительность
- ✅ Bitcoin график обновляется каждые 10 сек (было 1 сек)
- ✅ Упрощенный рендеринг свечей при >100 элементах
- ✅ WebSocket: 30 ликвидаций (было 100)

**Результат:** Память уменьшена с 2+ GB до 200-400 MB (⬇️ -80-90%)

Подробнее: [MEMORY_OPTIMIZATIONS.md](MEMORY_OPTIMIZATIONS.md)

## 📚 Документация

- [IMPROVEMENTS.md](IMPROVEMENTS.md) - История улучшений
- [MEMORY_OPTIMIZATIONS.md](MEMORY_OPTIMIZATIONS.md) - Детали оптимизации памяти
- [OPTIMIZATION_CHECKLIST.md](OPTIMIZATION_CHECKLIST.md) - Чек-лист проверки
- [LIQUIDATION_DELTA_METRIC.md](LIQUIDATION_DELTA_METRIC.md) - Подробно о метрике Liquidation Delta

## 🎯 API Endpoints

### REST API

```
GET /api/health                  # Проверка работоспособности
GET /api/liquidations/recent     # Последние ликвидации
GET /api/market/stats            # Статистика рынка
```

### WebSocket

```
WS /ws                           # Real-time ликвидации

# События:
- liquidation       # Новая ликвидация
- marketStats       # Обновление статистики
- recentLiquidations # Исторические данные
```

## 🎮 Управление

- 🖱️ **Клик по мешку** - взрыв с рандомной анимацией
- 📱 **Тап на мобильном** - тоже самое
- 🔇 **Кнопка звука** - в правом нижнем углу canvas
- ⚙️ **Настройки** - кнопка в правом нижнем углу экрана
- 🕐 **Выбор таймфрейма** - переключатели 1m/5m/15m/30m/1h/4h/1d

## 🐛 Известные проблемы

- Windows: используйте `cross-env` для переменных окружения (уже настроено)
- Старые браузеры: требуется поддержка Canvas API и WebSocket

## 🤝 Вклад

Contributions приветствуются! Пожалуйста:

1. Fork проект
2. Создайте feature ветку (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📝 Лицензия

MIT License - смотрите [LICENSE](LICENSE) для деталей

## 👨‍💻 Автор

**CriptoCrash Team**

## 🙏 Благодарности

- [Binance API](https://binance-docs.github.io/apidocs/) - данные ликвидаций
- [shadcn/ui](https://ui.shadcn.com/) - UI компоненты
- [Render](https://render.com) - хостинг

## 📈 Статистика проекта

- ⚡ Производительность: 60 FPS
- 💾 Память: 200-400 MB
- 🌐 Поддержка браузеров: Chrome, Firefox, Safari, Edge
- 📱 Мобильная версия: iOS, Android

---

Made with ❤️ and lots of ☕
