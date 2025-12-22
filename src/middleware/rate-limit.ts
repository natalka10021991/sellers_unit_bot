import { Context, NextFunction } from "grammy";
import { logger } from "../utils/logger.js";

/**
 * Простой rate limiter для защиты от спама
 */
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const store: RateLimitStore = {};

// Очистка старых записей каждые 5 минут
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetAt < now) {
      delete store[key];
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware
 * @param maxRequests - максимальное количество запросов
 * @param windowMs - окно времени в миллисекундах
 */
export function rateLimit(maxRequests: number = 10, windowMs: number = 60000) {
  return async (ctx: Context, next: NextFunction) => {
    const userId = ctx.from?.id;
    if (!userId) {
      return next();
    }

    const key = `user:${userId}`;
    const now = Date.now();

    // Получаем или создаем запись
    let record = store[key];
    if (!record || record.resetAt < now) {
      record = { count: 0, resetAt: now + windowMs };
      store[key] = record;
    }

    // Увеличиваем счетчик
    record.count++;

    // Проверяем лимит
    if (record.count > maxRequests) {
      logger.warn("Rate limit exceeded", { userId, count: record.count });
      await ctx.reply(
        "⚠️ <b>Слишком много запросов</b>\n\n" +
          "Пожалуйста, подождите немного перед следующим запросом.",
        { parse_mode: "HTML" }
      );
      return;
    }

    return next();
  };
}


