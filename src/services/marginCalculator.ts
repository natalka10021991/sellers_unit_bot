import type { MarginInput, MarginResult } from "../types/index.js";

/**
 * Калькулятор маржи для товаров Wildberries
 */
export function calculateMargin(input: MarginInput): MarginResult {
  const {
    costPrice,
    sellingPrice,
    wbCommission,
    logistics,
    storage,
    additionalCosts = 0,
  } = input;

  // Выручка = цена продажи
  const revenue = sellingPrice;

  // Комиссия WB в рублях
  const wbCommissionAmount = (sellingPrice * wbCommission) / 100;

  // Общие затраты
  const totalCosts =
    costPrice + wbCommissionAmount + logistics + storage + additionalCosts;

  // Чистая прибыль
  const profit = revenue - totalCosts;

  // Маржа в процентах (от выручки)
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

  // ROI (возврат инвестиций) - отношение прибыли к затратам
  const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;

  return {
    revenue,
    wbCommissionAmount,
    totalCosts,
    profit,
    marginPercent: Math.round(marginPercent * 100) / 100,
    marginPerUnit: Math.round(profit * 100) / 100,
    roi: Math.round(roi * 100) / 100,
  };
}

/**
 * Форматирование результата для отправки в Telegram
 */
export function formatMarginResult(
  input: MarginInput,
  result: MarginResult
): string {
  const profitEmoji = result.profit > 0 ? "✅" : "❌";
  const marginEmoji =
    result.marginPercent >= 30
      ? "🔥"
      : result.marginPercent >= 15
        ? "👍"
        : "⚠️";

  return `
📊 <b>Результат расчета маржи</b>

<b>Входные данные:</b>
├ Себестоимость: <code>${input.costPrice.toLocaleString("ru-RU")} ₽</code>
├ Цена продажи: <code>${input.sellingPrice.toLocaleString("ru-RU")} ₽</code>
├ Комиссия WB: <code>${input.wbCommission}%</code>
├ Логистика: <code>${input.logistics.toLocaleString("ru-RU")} ₽</code>
└ Хранение: <code>${input.storage.toLocaleString("ru-RU")} ₽</code>

<b>Расчет:</b>
├ Выручка: <code>${result.revenue.toLocaleString("ru-RU")} ₽</code>
├ Комиссия WB: <code>-${result.wbCommissionAmount.toLocaleString("ru-RU")} ₽</code>
└ Всего затрат: <code>${result.totalCosts.toLocaleString("ru-RU")} ₽</code>

<b>Результат:</b> ${profitEmoji}
├ Прибыль: <code>${result.profit.toLocaleString("ru-RU")} ₽</code>
├ Маржа: <code>${result.marginPercent}%</code> ${marginEmoji}
└ ROI: <code>${result.roi}%</code>

${
  result.marginPercent >= 30
    ? "🎯 Отличная маржинальность!"
    : result.marginPercent >= 15
      ? "👌 Хорошая маржинальность"
      : result.marginPercent > 0
        ? "⚠️ Низкая маржинальность, стоит пересмотреть условия"
        : "🚫 Убыточная позиция!"
}
`.trim();
}

