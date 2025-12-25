import express, { Express, Request, Response } from "express";
import cors from "cors";
import { config } from "../config/index.js";
import { wbApiService } from "../services/wb-api.js";
import { logger } from "../utils/logger.js";

/**
 * HTTP сервер для API прокси
 * Предоставляет endpoints для Mini App
 */
export function createAPIServer(): Express {
  const app = express();

  // Middleware
  // CORS настройки для работы с Telegram Mini App
  app.use(
    cors({
      origin: [
        "http://localhost:5173", // Dev Mini App
        "https://mini-app-red-seven.vercel.app", // Production Mini App
        /^https:\/\/.*\.vercel\.app$/, // Любой Vercel домен
        /^https:\/\/.*\.telegram\.org$/, // Telegram домены
      ],
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.use(express.json());

  // Health check
  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  /**
   * GET /api/categories
   * Получить список родительских категорий WB
   */
  app.get("/api/categories", async (req: Request, res: Response) => {
    try {
      const categories = await wbApiService.getParentCategories();
      
      // Форматируем для удобства использования в Mini App
      const formatted = categories
        .filter((cat) => cat.isVisible !== false) // Только видимые категории
        .map((cat) => ({
          id: cat.id || cat.objectID || 0,
          name: cat.name || cat.objectName || "",
          parent: cat.parent,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)); // Сортируем по алфавиту

      res.json({
        success: true,
        data: formatted,
        count: formatted.length,
      });
    } catch (error: any) {
      logger.error("Ошибка в /api/categories", error);
      res.status(500).json({
        success: false,
        error: error.message || "Не удалось получить категории",
      });
    }
  });

  /**
   * GET /api/categories/:id/subjects
   * Получить предметы (подкатегории) для категории
   */
  app.get("/api/categories/:id/subjects", async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({
          success: false,
          error: "Неверный ID категории",
        });
      }

      const subjects = await wbApiService.getSubjects(categoryId);
      
      const formatted = subjects
        .filter((subj) => subj.isVisible !== false)
        .map((subj) => ({
          id: subj.id || subj.objectID || 0,
          name: subj.name || subj.objectName || "",
          parent: subj.parent,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({
        success: true,
        data: formatted,
        count: formatted.length,
      });
    } catch (error: any) {
      logger.error("Ошибка в /api/categories/:id/subjects", error, { categoryId: req.params.id });
      res.status(500).json({
        success: false,
        error: error.message || "Не удалось получить предметы",
      });
    }
  });

  /**
   * GET /api/categories/search?name={productName}
   * Поиск категорий по названию товара
   */
  app.get("/api/categories/search", async (req: Request, res: Response) => {
    try {
      const productName = req.query.name as string;
      
      if (!productName || productName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Название товара должно содержать минимум 2 символа",
        });
      }

      const categories = await wbApiService.searchCategoriesByProductName(productName.trim());
      
      const formatted = categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
      }));

      res.json({
        success: true,
        data: formatted,
        count: formatted.length,
      });
    } catch (error: any) {
      logger.error("Ошибка в /api/categories/search", error, { productName: req.query.name });
      res.status(500).json({
        success: false,
        error: error.message || "Не удалось найти категории",
      });
    }
  });

  /**
   * GET /api/commission/:categoryId
   * Получить комиссию для категории
   */
  app.get("/api/commission/:categoryId", async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({
          success: false,
          error: "Неверный ID категории",
        });
      }

      const commission = await wbApiService.getCommissionForCategory(categoryId);

      res.json({
        success: true,
        data: {
          categoryId,
          commission,
        },
      });
    } catch (error: any) {
      logger.error("Ошибка в /api/commission/:categoryId", error, { categoryId: req.params.categoryId });
      res.status(500).json({
        success: false,
        error: error.message || "Не удалось получить комиссию",
      });
    }
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: "Endpoint не найден",
    });
  });

  // Error handler
  app.use((err: any, req: Request, res: Response, next: any) => {
    logger.error("API Error", err, { path: req.path, method: req.method });
    res.status(500).json({
      success: false,
      error: "Внутренняя ошибка сервера",
    });
  });

  return app;
}

/**
 * Запустить API сервер
 */
export function startAPIServer(): void {
  const app = createAPIServer();
  const port = config.apiPort;

  app.listen(port, () => {
    logger.info(`🌐 API сервер запущен на http://localhost:${port}`, {
      port,
      endpoints: [
        "GET /health",
        "GET /api/categories",
        "GET /api/categories/search?name={productName}",
        "GET /api/categories/:id/subjects",
        "GET /api/commission/:categoryId",
      ],
    });
  });
}

