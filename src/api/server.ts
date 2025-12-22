import express, { Express, Request, Response } from "express";
import cors from "cors";
import { config } from "../config/index.js";
import { wbApiService } from "../services/wb-api.js";

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
        .filter((cat) => cat.isVisible) // Только видимые категории
        .map((cat) => ({
          id: cat.objectID,
          name: cat.objectName || cat.name,
          parent: cat.parent,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)); // Сортируем по алфавиту

      res.json({
        success: true,
        data: formatted,
        count: formatted.length,
      });
    } catch (error: any) {
      console.error("Ошибка в /api/categories:", error);
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
        .filter((subj) => subj.isVisible)
        .map((subj) => ({
          id: subj.objectID,
          name: subj.objectName || subj.name,
          parent: subj.parent,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({
        success: true,
        data: formatted,
        count: formatted.length,
      });
    } catch (error: any) {
      console.error("Ошибка в /api/categories/:id/subjects:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Не удалось получить предметы",
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
      console.error("Ошибка в /api/commission/:categoryId:", error);
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
    console.error("API Error:", err);
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
    console.log(`🌐 API сервер запущен на http://localhost:${port}`);
    console.log(`   Endpoints:`);
    console.log(`   - GET /health`);
    console.log(`   - GET /api/categories`);
    console.log(`   - GET /api/categories/:id/subjects`);
    console.log(`   - GET /api/commission/:categoryId`);
  });
}

