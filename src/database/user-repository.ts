import Database from "better-sqlite3";
import path from "path";

// Путь к файлу базы данных
const DB_PATH = path.join(process.cwd(), "data", "bot.db");

/**
 * Данные пользователя
 */
export interface User {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string;
  calculationsCount: number;
  subscriptionUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Репозиторий для работы с пользователями
 */
class UserRepository {
  private db: Database.Database;

  constructor() {
    // Создаем директорию для БД если её нет
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.init();
  }

  /**
   * Инициализация таблиц
   */
  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE NOT NULL,
        username TEXT,
        first_name TEXT NOT NULL,
        calculations_count INTEGER DEFAULT 0,
        subscription_until DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
    `);
  }

  /**
   * Находит или создает пользователя
   */
  findOrCreate(telegramId: number, username: string | null, firstName: string): User {
    const existing = this.db
      .prepare("SELECT * FROM users WHERE telegram_id = ?")
      .get(telegramId) as any;

    if (existing) {
      // Обновляем данные пользователя
      this.db
        .prepare(
          "UPDATE users SET username = ?, first_name = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?"
        )
        .run(username, firstName, telegramId);

      return this.mapToUser(existing);
    }

    // Создаем нового пользователя
    const result = this.db
      .prepare(
        "INSERT INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)"
      )
      .run(telegramId, username, firstName);

    return {
      id: result.lastInsertRowid as number,
      telegramId,
      username,
      firstName,
      calculationsCount: 0,
      subscriptionUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Увеличивает счетчик расчетов
   */
  incrementCalculations(telegramId: number): void {
    this.db
      .prepare(
        "UPDATE users SET calculations_count = calculations_count + 1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?"
      )
      .run(telegramId);
  }

  /**
   * Получает количество расчетов пользователя
   */
  getCalculationsCount(telegramId: number): number {
    const result = this.db
      .prepare("SELECT calculations_count FROM users WHERE telegram_id = ?")
      .get(telegramId) as any;

    return result?.calculations_count || 0;
  }

  /**
   * Проверяет, активна ли подписка
   */
  hasActiveSubscription(telegramId: number): boolean {
    const result = this.db
      .prepare("SELECT subscription_until FROM users WHERE telegram_id = ?")
      .get(telegramId) as any;

    if (!result?.subscription_until) return false;

    return new Date(result.subscription_until) > new Date();
  }

  /**
   * Активирует подписку
   */
  activateSubscription(telegramId: number, days: number): void {
    const until = new Date();
    until.setDate(until.getDate() + days);

    this.db
      .prepare(
        "UPDATE users SET subscription_until = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?"
      )
      .run(until.toISOString(), telegramId);
  }

  /**
   * Получает дату окончания подписки
   */
  getSubscriptionEnd(telegramId: number): Date | null {
    const result = this.db
      .prepare("SELECT subscription_until FROM users WHERE telegram_id = ?")
      .get(telegramId) as any;

    return result?.subscription_until ? new Date(result.subscription_until) : null;
  }

  /**
   * Преобразует строку БД в объект User
   */
  private mapToUser(row: any): User {
    return {
      id: row.id,
      telegramId: row.telegram_id,
      username: row.username,
      firstName: row.first_name,
      calculationsCount: row.calculations_count,
      subscriptionUntil: row.subscription_until ? new Date(row.subscription_until) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Экспортируем синглтон
export const userRepository = new UserRepository();

