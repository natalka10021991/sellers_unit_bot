import type { BotContext, ConversationState } from "../types/index.js";
import {
  calculateMargin,
  formatMarginResult,
} from "../services/marginCalculator.js";
import { incrementCalculations } from "../database/index.js";
import {
  mainMenuKeyboard,
  cancelKeyboard,
  afterCalculationKeyboard,
} from "../keyboards/index.js";
import type { MarginInput } from "../types/index.js";

/**
 * Парсинг числа из текста
 */
function parseNumber(text: string): number | null {
  // Убираем пробелы, заменяем запятую на точку
  const cleaned = text.replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) || num < 0 ? null : num;
}

/**
 * Конфигурация шагов расчета
 */
const calculationSteps: {
  state: ConversationState;
  field: keyof MarginInput;
  nextState: ConversationState;
  prompt: string;
  example: string;
}[] = [
  {
    state: "awaiting_cost_price",
    field: "costPrice",
    nextState: "awaiting_selling_price",
    prompt: "Введите <b>цену продажи</b> на Wildberries:",
    example: "например: 1500",
  },
  {
    state: "awaiting_selling_price",
    field: "sellingPrice",
    nextState: "awaiting_wb_commission",
    prompt:
      "Введите <b>комиссию Wildberries</b> в процентах:\n\n<i>Подсказка: обычно 10-25% в зависимости от категории</i>",
    example: "например: 15",
  },
  {
    state: "awaiting_wb_commission",
    field: "wbCommission",
    nextState: "awaiting_logistics",
    prompt: "Введите стоимость <b>логистики</b> (доставка до покупателя):",
    example: "например: 100",
  },
  {
    state: "awaiting_logistics",
    field: "logistics",
    nextState: "awaiting_storage",
    prompt:
      "Введите стоимость <b>хранения</b> на складе WB:\n\n<i>Если не знаете точно, укажите примерно или 0</i>",
    example: "например: 30",
  },
];

/**
 * Обработка ввода данных для расчета
 */
export async function handleCalculationInput(
  ctx: BotContext
): Promise<boolean> {
  const text = ctx.message?.text;
  if (!text) return false;

  const { state } = ctx.session;

  // Проверяем, находимся ли мы в процессе расчета
  if (state === "idle") return false;

  // Обработка отмены
  if (text === "❌ Отмена") {
    ctx.session.state = "idle";
    ctx.session.marginInput = {};
    await ctx.reply("❌ Расчет отменен", {
      reply_markup: mainMenuKeyboard,
    });
    return true;
  }

  // Парсим число
  const value = parseNumber(text);
  if (value === null) {
    await ctx.reply(
      "⚠️ Пожалуйста, введите корректное число.\n\nНапример: <code>500</code> или <code>1500.50</code>",
      { parse_mode: "HTML" }
    );
    return true;
  }

  // Обработка последнего шага (хранение)
  if (state === "awaiting_storage") {
    ctx.session.marginInput.storage = value;
    await completeCalculation(ctx);
    return true;
  }

  // Находим текущий шаг
  const currentStep = calculationSteps.find((s) => s.state === state);
  if (!currentStep) return false;

  // Сохраняем значение и переходим к следующему шагу
  ctx.session.marginInput[currentStep.field] = value;
  ctx.session.state = currentStep.nextState;

  await ctx.reply(`✅ Принято!\n\n${currentStep.prompt}\n(${currentStep.example})`, {
    parse_mode: "HTML",
    reply_markup: cancelKeyboard,
  });

  return true;
}

/**
 * Завершение расчета и вывод результата
 */
async function completeCalculation(ctx: BotContext): Promise<void> {
  const input = ctx.session.marginInput as MarginInput;
  const userId = ctx.from!.id;

  // Валидация всех полей
  if (
    input.costPrice === undefined ||
    input.sellingPrice === undefined ||
    input.wbCommission === undefined ||
    input.logistics === undefined ||
    input.storage === undefined
  ) {
    await ctx.reply("❌ Произошла ошибка. Попробуйте начать расчет заново.", {
      reply_markup: mainMenuKeyboard,
    });
    ctx.session.state = "idle";
    ctx.session.marginInput = {};
    return;
  }

  // Рассчитываем маржу
  const result = calculateMargin(input);

  // Увеличиваем счетчик расчетов
  incrementCalculations(userId);

  // Форматируем и отправляем результат
  const message = formatMarginResult(input, result);

  await ctx.reply(message, {
    parse_mode: "HTML",
    reply_markup: afterCalculationKeyboard,
  });

  // Сбрасываем состояние
  ctx.session.state = "idle";
  ctx.session.marginInput = {};
}

