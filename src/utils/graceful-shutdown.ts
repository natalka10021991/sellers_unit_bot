import type { Bot } from "grammy";
import { logger } from "./logger.js";
import { closeDatabase } from "../database/db.js";

/**
 * Graceful shutdown для корректного завершения работы бота
 */
export function setupGracefulShutdown(bot: Bot<any>): void {
  const shutdown = async (signal: string) => {
    logger.info(`Получен сигнал ${signal}, начинаем graceful shutdown...`);

    try {
      // Останавливаем прием новых обновлений
      await bot.stop();
      logger.info("Бот остановлен");

      // Закрываем соединение с БД
      closeDatabase();
      logger.info("Соединение с БД закрыто");

      logger.info("Graceful shutdown завершен");
      process.exit(0);
    } catch (error) {
      logger.error("Ошибка при graceful shutdown", error);
      process.exit(1);
    }
  };

  // Обработка сигналов
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Обработка необработанных ошибок
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception", error);
    shutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection", reason as Error, { promise });
    shutdown("unhandledRejection");
  });
}

