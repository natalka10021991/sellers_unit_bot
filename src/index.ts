// Entry point - загружаем dotenv синхронно до всех импортов
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Синхронно загружаем dotenv через require (до ESM импортов)
const dotenv = require("dotenv");
const result = dotenv.config();

if (result.error) {
  console.error("❌ Ошибка загрузки .env:", result.error.message);
  process.exit(1);
}

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN не найден в .env файле!");
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
