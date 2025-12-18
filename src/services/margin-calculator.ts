import type { MarginCalculation, MarginInputData } from '../types.js';

/**
 * Калькулятор маржи для товаров Wildberries
 */
export function calculateMargin(input: MarginInputData): MarginCalculation {
  const { costPrice, sellingPrice, wbCommission, logistics, storage } = input;
  
  // Выручка = цена продажи
  const revenue = sellingPrice;
  
  // Комиссия WB в рублях
  const commissionAmount = (sellingPrice * wbCommission) / 100;
  
  // Общие затраты
  const totalCosts = costPrice + commissionAmount + logistics + storage;
  
  // Чистая прибыль
  const profit = revenue - totalCosts;
  
  // Маржа (%) = (Прибыль / Выручка) × 100
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;
  
  // Наценка (%) = ((Цена - Себестоимость) / Себестоимость) × 100
  const markup = costPrice > 0 ? ((sellingPrice - costPrice) / costPrice) * 100 : 0;
  
  return {
    costPrice,
    sellingPrice,
    wbCommission,
    logistics,
    storage,
    revenue,
    commissionAmount,
    totalCosts,
    profit,
    marginPercent,
    markup,
  };
}

/**
 * Форматирует результат расчета для отправки пользователю
 */
export function formatMarginResult(calc: MarginCalculation): string {
  const profitEmoji = calc.profit >= 0 ? '✅' : '❌';
  const marginEmoji = calc.marginPercent >= 20 ? '🔥' : calc.marginPercent >= 10 ? '👍' : '⚠️';
  
  return `
📊 <b>Результат расчета маржи</b>

<b>Входные данные:</b>
├ Себестоимость: ${formatMoney(calc.costPrice)}
├ Цена продажи: ${formatMoney(calc.sellingPrice)}
├ Комиссия WB: ${calc.wbCommission}%
├ Логистика: ${formatMoney(calc.logistics)}
└ Хранение: ${formatMoney(calc.storage)}

<b>Расчет:</b>
├ Выручка: ${formatMoney(calc.revenue)}
├ Комиссия WB: -${formatMoney(calc.commissionAmount)}
├ Логистика: -${formatMoney(calc.logistics)}
├ Хранение: -${formatMoney(calc.storage)}
├ Себестоимость: -${formatMoney(calc.costPrice)}
└ <b>Итого затрат:</b> ${formatMoney(calc.totalCosts)}

<b>Результат:</b>
${profitEmoji} Чистая прибыль: <b>${formatMoney(calc.profit)}</b>
${marginEmoji} Маржа: <b>${calc.marginPercent.toFixed(1)}%</b>
📈 Наценка: <b>${calc.markup.toFixed(1)}%</b>

${getRecommendation(calc)}
`.trim();
}

/**
 * Форматирует число как денежную сумму
 */
function formatMoney(amount: number): string {
  return `${amount.toFixed(2)} ₽`;
}

/**
 * Дает рекомендацию на основе расчета
 */
function getRecommendation(calc: MarginCalculation): string {
  if (calc.profit < 0) {
    return '💡 <i>Товар убыточный! Рассмотрите снижение себестоимости или повышение цены.</i>';
  }
  if (calc.marginPercent < 10) {
    return '💡 <i>Низкая маржа. Рекомендуется маржа от 20% для устойчивого бизнеса.</i>';
  }
  if (calc.marginPercent < 20) {
    return '💡 <i>Приемлемая маржа, но есть куда расти!</i>';
  }
  if (calc.marginPercent >= 30) {
    return '💡 <i>Отличная маржа! Товар высокорентабельный. 🚀</i>';
  }
  return '💡 <i>Хорошая маржа для работы на WB!</i>';
}
