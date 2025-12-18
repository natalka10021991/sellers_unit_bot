import type { Context } from "grammy";

// Данные пользователя в базе
export interface User {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string;
  calculations_count: number;
  subscription_until: string | null; // ISO date string
  created_at: string;
  updated_at: string;
}

// Входные данные для расчета маржи
export interface MarginInput {
  costPrice: number; // Себестоимость товара
  sellingPrice: number; // Цена продажи на WB
  wbCommission: number; // Комиссия WB (%)
  logistics: number; // Логистика (руб)
  storage: number; // Хранение (руб)
  additionalCosts?: number; // Дополнительные расходы (руб)
}

// Результат расчета маржи
export interface MarginResult {
  revenue: number; // Выручка
  wbCommissionAmount: number; // Сумма комиссии WB
  totalCosts: number; // Общие затраты
  profit: number; // Чистая прибыль
  marginPercent: number; // Маржа в %
  marginPerUnit: number; // Маржа на единицу товара (руб)
  roi: number; // ROI (возврат инвестиций) в %
}

// Состояния диалога с пользователем
export type ConversationState =
  | "idle"
  | "awaiting_cost_price"
  | "awaiting_selling_price"
  | "awaiting_wb_commission"
  | "awaiting_logistics"
  | "awaiting_storage";

// Сессия пользователя
export interface SessionData {
  state: ConversationState;
  marginInput: Partial<MarginInput>;
}

// Расширенный контекст с сессией
export interface BotContext extends Context {
  session: SessionData;
}

