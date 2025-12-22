// Entry point - загружаем dotenv синхронно до всех импортов
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Синхронно загружаем dotenv через require (до ESM импортов)
// В продакшене (Railway) переменные окружения уже доступны через process.env
// .env файл нужен только для локальной разработки
const dotenv = require("dotenv");
const result = dotenv.config();

// Если .env файл не найден - это нормально для продакшена
// Проверяем только наличие обязательных переменных
if (result.error && result.error.code !== "ENOENT") {
  console.error("❌ Ошибка загрузки .env:", result.error.message);
  // Не выходим, возможно переменные заданы через окружение
}

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN не найден! Проверь переменные окружения.");
  process.exit(1);
}

// Импортируем logger после загрузки .env
import { logger } from "./utils/logger.js";

logger.info("✅ .env загружен");
logger.info("   BOT_TOKEN:", { found: !!process.env.BOT_TOKEN });

// Теперь импортируем бота и API сервер
Promise.all([
  import("./bot.js"),
  import("./api/server.js").then((module) => {
    module.startAPIServer();
  }),
]).catch((err) => {
  console.error("❌ Ошибка запуска:", err);
  process.exit(1);
});
