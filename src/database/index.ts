import Database, { type Database as DatabaseType } from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { config } from "../config/index.js";
import type { User } from "../types/index.js";

// Создаем директорию для БД если её нет
const dbDir = dirname(config.dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Инициализация базы данных
const db: DatabaseType = new Database(config.dbPath);

// Включаем WAL режим для лучшей производительности
db.pragma("journal_mode = WAL");

// Создание таблиц
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT NOT NULL,
    calculations_count INTEGER DEFAULT 0,
    subscription_until TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
`);

/**
 * Получить или создать пользователя
 */
export function getOrCreateUser(
  telegramId: number,
  username: string | null,
  firstName: string
): User {
  const existing = db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .get(telegramId) as User | undefined;

  if (existing) {
    // Обновляем информацию о пользователе
    db.prepare(
      `
      UPDATE users 
      SET username = ?, first_name = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE telegram_id = ?
    `
    ).run(username, firstName, telegramId);

    return { ...existing, username, first_name: firstName };
  }

  // Создаем нового пользователя
  const result = db
    .prepare(
      `
    INSERT INTO users (telegram_id, username, first_name) 
    VALUES (?, ?, ?)
    RETURNING *
  `
    )
    .get(telegramId, username, firstName) as User;

  return result;
}

/**
 * Увеличить счетчик расчетов
 */
export function incrementCalculations(telegramId: number): void {
  db.prepare(
    `
    UPDATE users 
    SET calculations_count = calculations_count + 1, updated_at = CURRENT_TIMESTAMP 
    WHERE telegram_id = ?
  `
  ).run(telegramId);
}

/**
 * Проверить, может ли пользователь делать расчеты
 */
export function canCalculate(telegramId: number): {
  allowed: boolean;
  remaining: number;
  hasSubscription: boolean;
} {
  const user = db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .get(telegramId) as User | undefined;

  if (!user) {
    return {
      allowed: true,
      remaining: config.freeCalculationsLimit,
      hasSubscription: false,
    };
  }

  // Проверяем подписку
  if (user.subscription_until) {
    const subscriptionEnd = new Date(user.subscription_until);
    if (subscriptionEnd > new Date()) {
      return { allowed: true, remaining: Infinity, hasSubscription: true };
    }
  }

  // Проверяем бесплатные расчеты
  const remaining = config.freeCalculationsLimit - user.calculations_count;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    hasSubscription: false,
  };
}

/**
 * Активировать подписку
 */
export function activateSubscription(telegramId: number): void {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + config.subscriptionDays);

  db.prepare(
    `
    UPDATE users 
    SET subscription_until = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE telegram_id = ?
  `
  ).run(endDate.toISOString(), telegramId);
}

/**
 * Получить статистику пользователя
 */
export function getUserStats(telegramId: number): {
  totalCalculations: number;
  hasSubscription: boolean;
  subscriptionEnds: string | null;
} | null {
  const user = db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .get(telegramId) as User | undefined;

  if (!user) return null;

  const hasSubscription =
    user.subscription_until !== null &&
    new Date(user.subscription_until) > new Date();

  return {
    totalCalculations: user.calculations_count,
    hasSubscription,
    subscriptionEnds: hasSubscription ? user.subscription_until : null,
  };
}

export { db };

