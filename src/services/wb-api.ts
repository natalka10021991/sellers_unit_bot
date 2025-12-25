import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

/**
 * Интерфейсы для WB API
 */
export interface WBParentCategory {
  id: number;
  name: string;
  isVisible?: boolean;
  // Старые поля для обратной совместимости
  objectID?: number;
  objectName?: string;
  parent?: number | string;
}

export interface WBSubject {
  id: number;
  name: string;
  parent: number;
  isVisible?: boolean;
  // Старые поля для обратной совместимости
  objectID?: number;
  objectName?: string;
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
      logger.warn("⚠️ WB_API_TOKEN не установлен. API запросы не будут работать.");
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

      const responseData = (await response.json()) as {
        data?: WBParentCategory[];
        error?: boolean;
        errorText?: string;
      };

      // Проверяем наличие ошибок в ответе
      if (responseData.error || !responseData.data) {
        throw new Error(
          responseData.errorText || "Не удалось получить категории"
        );
      }

      const categories = responseData.data;

      // Сохраняем в кэш на 1 час
      this.cache.categories = categories;
      this.cache.categoriesExpiry = Date.now() + 60 * 60 * 1000;

      logger.debug("Категории WB загружены", { count: categories.length });
      return categories;
    } catch (error: any) {
      logger.error("Ошибка при получении категорий WB", error);
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

      const responseData = (await response.json()) as {
        data?: WBSubject[];
        error?: boolean;
        errorText?: string;
      };

      // Проверяем наличие ошибок в ответе
      if (responseData.error || !responseData.data) {
        throw new Error(
          responseData.errorText || "Не удалось получить предметы"
        );
      }

      const subjects = responseData.data;
      logger.debug("Предметы WB загружены", { parentId, count: subjects.length });
      return subjects;
    } catch (error: any) {
      logger.error("Ошибка при получении предметов WB", error, { parentId });
      throw new Error(`Не удалось получить предметы: ${error.message}`);
    }
  }

  /**
   * Поиск категорий по названию товара
   * GET /content/v2/object/all?name={productName}
   * Возвращает уникальные родительские категории для найденных предметов
   */
  async searchCategoriesByProductName(productName: string): Promise<WBParentCategory[]> {
    if (!this.token) {
      throw new Error("WB API токен не установлен");
    }

    if (!productName || productName.trim().length < 2) {
      return []; // Минимум 2 символа для поиска
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/content/v2/object/all?name=${encodeURIComponent(productName.trim())}&limit=100`,
        {
          method: "GET",
          headers: {
            Authorization: this.token,
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

      const responseData = (await response.json()) as {
        data?: Array<{
          subjectID: number;
          parentID: number;
          subjectName: string;
          parentName: string;
        }>;
        error?: boolean;
        errorText?: string;
      };

      if (responseData.error || !responseData.data) {
        throw new Error(
          responseData.errorText || "Не удалось найти категории"
        );
      }

      // Извлекаем уникальные родительские категории
      const uniqueCategories = new Map<number, WBParentCategory>();
      
      for (const item of responseData.data) {
        if (!uniqueCategories.has(item.parentID)) {
          uniqueCategories.set(item.parentID, {
            id: item.parentID,
            name: item.parentName,
          });
        }
      }

      const categories = Array.from(uniqueCategories.values());
      logger.debug("Категории найдены по названию товара", { 
        productName, 
        count: categories.length 
      });
      
      return categories;
    } catch (error: any) {
      logger.error("Ошибка при поиске категорий по названию товара", error, { productName });
      throw new Error(`Не удалось найти категории: ${error.message}`);
    }
  }

  /**
   * Получить комиссию для категории
   * GET /api/v1/tariffs/commission
   * Возвращает комиссию маркетплейса (kgvpMarketplace) для указанной категории
   */
  async getCommissionForCategory(categoryId: number): Promise<number> {
    if (!this.token) {
      throw new Error("WB API токен не установлен");
    }

    try {
      // Используем common-api.wildberries.ru для тарифов
      const response = await fetch(
        `https://common-api.wildberries.ru/api/v1/tariffs/commission?locale=ru`,
        {
          method: "GET",
          headers: {
            Authorization: this.token,
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

      const responseData = (await response.json()) as {
        report?: Array<{
          parentID: number;
          parentName: string;
          subjectID?: number;
          subjectName?: string;
          kgvpMarketplace: number;
          kgvpBooking?: number;
          kgvpPickup?: number;
          kgvpSupplier?: number;
        }>;
      };

      if (!responseData.report || responseData.report.length === 0) {
        throw new Error("Не удалось получить данные о комиссиях");
      }

      // Ищем комиссию для указанной категории (parentID)
      const categoryCommission = responseData.report.find(
        (item) => item.parentID === categoryId
      );

      if (!categoryCommission) {
        logger.warn("Комиссия для категории не найдена", { categoryId });
        // Возвращаем среднюю комиссию маркетплейса или значение по умолчанию
        const avgCommission = responseData.report.reduce(
          (sum, item) => sum + item.kgvpMarketplace,
          0
        ) / responseData.report.length;
        return avgCommission || 18;
      }

      // Возвращаем комиссию маркетплейса (kgvpMarketplace)
      const commission = categoryCommission.kgvpMarketplace;
      logger.debug("Комиссия для категории получена", { 
        categoryId, 
        commission,
        categoryName: categoryCommission.parentName 
      });
      
      return commission;
    } catch (error: any) {
      logger.error("Ошибка при получении комиссии для категории", error, { categoryId });
      throw new Error(`Не удалось получить комиссию: ${error.message}`);
    }
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

