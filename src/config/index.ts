import "dotenv/config";

// Проверяем наличие обязательных переменных окружения
if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN не указан в .env файле!");
}

export const config = {
  // Telegram
  botToken: process.env.BOT_TOKEN,

  // Wildberries API
  wbApiToken: process.env.WB_API_TOKEN,
  wbApiBaseUrl: "https://content-api.wildberries.ru",

  // Лимиты
  freeCalculationsLimit: 5,

  // Подписка
  subscriptionPrice: 149, // рублей в месяц
  subscriptionDays: 30,

  // База данных
  dbPath: process.env.DB_PATH || "./data/bot.db",

  // HTTP Server для API прокси
  apiPort: Number(process.env.API_PORT) || 3000,

  // Окружение
  isDev: process.env.NODE_ENV === "development",
} as const;

