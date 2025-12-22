// Entry point - загружаем dotenv синхронно до всех импортов
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Синхронно загружаем dotenv через require (до ESM импортов)
// В продакшене (Railway) переменные окружения уже доступны через process.env
// .env файл нужен только для локальной разработки
const dotenv = require("dotenv");
const result = dotenv.config();

// Импортируем logger до использования
import { logger } from "./utils/logger.js";

// Если .env файл не найден - это нормально для продакшена
// Проверяем только наличие обязательных переменных
if (result.error && result.error.code !== "ENOENT") {
  logger.error("Ошибка загрузки .env", { error: result.error.message });
  // Не выходим, возможно переменные заданы через окружение
}

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
