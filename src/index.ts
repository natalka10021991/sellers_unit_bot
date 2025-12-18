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

console.log("✅ .env загружен");
console.log("   BOT_TOKEN:", process.env.BOT_TOKEN ? "✓ найден" : "✗ НЕ НАЙДЕН");

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN не найден в .env файле!");
  process.exit(1);
}

// Теперь импортируем бота
import("./bot.js").catch((err) => {
  console.error("❌ Ошибка запуска бота:", err);
  process.exit(1);
});
