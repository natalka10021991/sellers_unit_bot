import Database, { type Database as DatabaseType } from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../data.db");

// Создаем подключение к базе данных
const db: DatabaseType = new Database(DB_PATH);

// Включаем WAL режим для лучшей производительности
db.pragma("journal_mode = WAL");

// Создаем таблицу пользователей
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT NOT NULL,
    calculations_count INTEGER DEFAULT 0,
    subscription_until TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Создаем таблицу истории расчетов
db.exec(`
  CREATE TABLE IF NOT EXISTS calculations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    cost_price REAL NOT NULL,
    selling_price REAL NOT NULL,
    wb_commission REAL NOT NULL,
    logistics REAL NOT NULL,
    storage REAL NOT NULL,
    profit REAL NOT NULL,
    margin_percent REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

export interface DbUser {
  id: number;
  username: string | null;
  first_name: string;
  calculations_count: number;
  subscription_until: string | null;
  created_at: string;
}

/**
 * Получает или создает пользователя
 */
export function getOrCreateUser(id: number, firstName: string, username?: string): DbUser {
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser | undefined;

  if (existing) {
    // Обновляем данные пользователя
    db.prepare(
      `
      UPDATE users SET username = ?, first_name = ? WHERE id = ?
    `
    ).run(username ?? null, firstName, id);

    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser;
  }

  // Создаем нового пользователя
  db.prepare(
    `
    INSERT INTO users (id, username, first_name) VALUES (?, ?, ?)
  `
  ).run(id, username ?? null, firstName);

  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser;
}

/**
 * Увеличивает счетчик расчетов пользователя
 */
export function incrementCalculations(userId: number): void {
  db.prepare(
    `
    UPDATE users SET calculations_count = calculations_count + 1 WHERE id = ?
  `
  ).run(userId);
}

/**
 * Проверяет, есть ли у пользователя доступ к расчетам
 */
export function hasAccessToCalculate(user: DbUser, freeLimit: number): boolean {
  // Проверяем активную подписку
  if (user.subscription_until) {
    const subscriptionDate = new Date(user.subscription_until);
    if (subscriptionDate > new Date()) {
      return true;
    }
  }

  // Проверяем лимит бесплатных расчетов
  return user.calculations_count < freeLimit;
}

/**
 * Получает оставшееся количество бесплатных расчетов
 */
export function getRemainingCalculations(user: DbUser, freeLimit: number): number {
  // Если есть подписка - неограничено
  if (user.subscription_until) {
    const subscriptionDate = new Date(user.subscription_until);
    if (subscriptionDate > new Date()) {
      return Infinity;
    }
  }

  return Math.max(0, freeLimit - user.calculations_count);
}

/**
 * Активирует подписку пользователю
 */
export function activateSubscription(userId: number, days: number = 30): void {
  const until = new Date();
  until.setDate(until.getDate() + days);

  db.prepare(
    `
    UPDATE users SET subscription_until = ? WHERE id = ?
  `
  ).run(until.toISOString(), userId);
}

/**
 * Сохраняет расчет в историю
 */
export function saveCalculation(
  userId: number,
  data: {
    costPrice: number;
    sellingPrice: number;
    wbCommission: number;
    logistics: number;
    storage: number;
    profit: number;
    marginPercent: number;
  }
): void {
  db.prepare(
    `
    INSERT INTO calculations 
    (user_id, cost_price, selling_price, wb_commission, logistics, storage, profit, margin_percent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    userId,
    data.costPrice,
    data.sellingPrice,
    data.wbCommission,
    data.logistics,
    data.storage,
    data.profit,
    data.marginPercent
  );
}

export { db };

/**
 * Закрыть соединение с базой данных
 */
export function closeDatabase(): void {
  try {
    db.close();
  } catch (error) {
    // Ошибка при закрытии БД - игнорируем
  }
}
