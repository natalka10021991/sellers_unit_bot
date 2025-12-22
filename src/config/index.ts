import "dotenv/config";

// Проверяем наличие обязательных переменных окружения
if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN не указан в .env файле!");
}

export const config = {
  // Telegram
  botToken: process.env.BOT_TOKEN,

  // Mini App URL
  miniAppUrl: process.env.MINI_APP_URL || "https://mini-app-red-seven.vercel.app",

  // Wildberries API
  wbApiToken: process.env.WB_API_TOKEN,
  wbApiBaseUrl: "https://content-api.wildberries.ru",

  // Лимиты
  freeCalculationsLimit: Number(process.env.FREE_CALCULATIONS_LIMIT) || 5,

  // Подписка
  subscriptionPrice: Number(process.env.SUBSCRIPTION_PRICE) || 149, // рублей в месяц
  subscriptionDays: Number(process.env.SUBSCRIPTION_DAYS) || 30,

  // База данных
  dbPath: process.env.DB_PATH || "./data/bot.db",

  // HTTP Server для API прокси
  apiPort: Number(process.env.API_PORT) || 3000,

  // Rate limiting
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 минута

  // Окружение
  isDev: process.env.NODE_ENV === "development",
  nodeEnv: process.env.NODE_ENV || "development",
} as const;

