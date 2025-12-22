import { config } from "../config/index.js";

/**
 * Интерфейсы для WB API
 */
export interface WBParentCategory {
  name: string;
  parent: string;
  isVisible: boolean;
  objectID: number;
  objectName: string;
}

export interface WBSubject {
  name: string;
  parent: number;
  isVisible: boolean;
  objectID: number;
  objectName: string;
}

/**
 * Сервис для работы с Wildberries API
 */
export class WBAPIService {
  private baseUrl: string;
  private token: string | undefined;
  private cache: {
    categories?: WBParentCategory[];
    categoriesExpiry?: number;
  } = {};

  constructor() {
    this.baseUrl = config.wbApiBaseUrl;
    this.token = config.wbApiToken;

    if (!this.token) {
      console.warn("⚠️ WB_API_TOKEN не установлен. API запросы не будут работать.");
    }
  }

  /**
   * Получить родительские категории товаров
   * GET /content/v2/object/parent/all
   */
  async getParentCategories(): Promise<WBParentCategory[]> {
    // Проверяем кэш (кэш на 1 час, категории редко меняются)
    if (
      this.cache.categories &&
      this.cache.categoriesExpiry &&
      Date.now() < this.cache.categoriesExpiry
    ) {
      return this.cache.categories;
    }

    if (!this.token) {
      throw new Error("WB API токен не установлен");
    }

    try {
      // WB API использует просто токен без Bearer префикса
      const response = await fetch(`${this.baseUrl}/content/v2/object/parent/all`, {
        method: "GET",
        headers: {
          Authorization: this.token,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `WB API Error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const categories: WBParentCategory[] = await response.json();

      // Сохраняем в кэш на 1 час
      this.cache.categories = categories;
      this.cache.categoriesExpiry = Date.now() + 60 * 60 * 1000;

      return categories;
    } catch (error: any) {
      console.error("Ошибка при получении категорий WB:", error);
      throw new Error(`Не удалось получить категории: ${error.message}`);
    }
  }

  /**
   * Получить предметы (подкатегории) для родительской категории
   * GET /content/v2/object/all?parent={parentId}
   */
  async getSubjects(parentId: number): Promise<WBSubject[]> {
    if (!this.token) {
      throw new Error("WB API токен не установлен");
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/content/v2/object/all?parent=${parentId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `WB API Error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const subjects: WBSubject[] = await response.json();
      return subjects;
    } catch (error: any) {
      console.error("Ошибка при получении предметов WB:", error);
      throw new Error(`Не удалось получить предметы: ${error.message}`);
    }
  }

  /**
   * Получить комиссию для категории
   * Это примерная логика - точный endpoint нужно уточнить в документации WB
   */
  async getCommissionForCategory(categoryId: number): Promise<number> {
    // TODO: Найти точный endpoint для комиссий в документации WB
    // Пока возвращаем стандартные значения по категориям
    
    // Примерные комиссии по категориям (нужно уточнить из API)
    const defaultCommissions: Record<number, number> = {
      // Электроника - обычно 15%
      // Одежда - обычно 18-20%
      // Бытовая техника - обычно 15-17%
      // Красота - обычно 20-25%
    };

    return defaultCommissions[categoryId] || 18; // По умолчанию 18%
  }

  /**
   * Очистить кэш
   */
  clearCache(): void {
    this.cache = {};
  }
}

// Singleton instance
export const wbApiService = new WBAPIService();

