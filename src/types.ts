// Типы для расчета маржи
export interface MarginCalculation {
  // Входные данные
  costPrice: number;        // Себестоимость товара
  sellingPrice: number;     // Цена продажи на WB
  wbCommission: number;     // Комиссия WB (в процентах)
  logistics: number;        // Стоимость логистики
  storage: number;          // Стоимость хранения
  
  // Результаты
  revenue: number;          // Выручка
  commissionAmount: number; // Сумма комиссии WB
  totalCosts: number;       // Общие затраты
  profit: number;           // Чистая прибыль
  marginPercent: number;    // Маржа в процентах
  markup: number;           // Наценка в процентах
}

// Данные пользователя
export interface User {
  id: number;                    // Telegram user ID
  username?: string;             // @username
  firstName: string;             // Имя
  calculationsCount: number;     // Количество использованных расчетов
  subscriptionUntil?: Date;      // Дата окончания подписки
  createdAt: Date;               // Дата регистрации
}

// Состояния диалога для расчета маржи
export interface CalculationSession {
  step: CalculationStep;
  data: Partial<MarginInputData>;
}

export interface MarginInputData {
  costPrice: number;
  sellingPrice: number;
  wbCommission: number;
  logistics: number;
  storage: number;
}

export type CalculationStep = 
  | 'cost_price'      // Ввод себестоимости
  | 'selling_price'   // Ввод цены продажи
  | 'wb_commission'   // Ввод комиссии WB
  | 'logistics'       // Ввод логистики
  | 'storage'         // Ввод хранения
  | 'complete';       // Расчет завершен


