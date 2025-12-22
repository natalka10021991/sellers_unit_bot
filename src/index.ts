// Entry point - загружаем dotenv синхронно до всех импортов
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Синхронно загружаем dotenv через require (до ESM импортов)
// Приоритет загрузки:
// 1. .env.local (локальная разработка, не коммитится)
// 2. .env (общие настройки)
// 3. process.env (переменные окружения из системы/Railway)
const dotenv = require("dotenv");
const isProduction = process.env.NODE_ENV === "production";

// В продакшене переменные окружения уже доступны через process.env
// В разработке загружаем из файлов
if (!isProduction) {
  // Сначала загружаем .env.local (если есть)
  dotenv.config({ path: ".env.local" });
  // Затем .env (перезапишет значения из .env.local если нужно)
  dotenv.config();
}

// Импортируем logger до использования
import { logger } from "./utils/logger.js";

// Логируем окружение
logger.info("Окружение", { 
  env: process.env.NODE_ENV || "development",
  isProduction 
});

if (!process.env.BOT_TOKEN) {
  logger.error("BOT_TOKEN не найден! Проверь переменные окружения.");
  process.exit(1);
}

logger.info("✅ .env загружен");
logger.info("   BOT_TOKEN:", { found: !!process.env.BOT_TOKEN });

// Теперь импортируем бота и API сервер
Promise.all([
  import("./bot.js"),
  import("./api/server.js").then((module) => {
    module.startAPIServer();
  }),
]).catch((err) => {
  logger.error("Ошибка запуска", { error: err });
  process.exit(1);
});
