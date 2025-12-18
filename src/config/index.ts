import "dotenv/config";

// Проверяем наличие обязательных переменных окружения
if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN не указан в .env файле!");
}

export const config = {
  // Telegram
  botToken: process.env.BOT_TOKEN,

  // Лимиты
  freeCalculationsLimit: 5,

  // Подписка
  subscriptionPrice: 149, // рублей в месяц
  subscriptionDays: 30,

  // База данных
  dbPath: process.env.DB_PATH || "./data/bot.db",

  // Окружение
  isDev: process.env.NODE_ENV === "development",
} as const;

