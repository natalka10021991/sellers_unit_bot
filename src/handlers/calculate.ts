import { Context } from "grammy";
import { config } from "../config.js";
import { userRepository } from "../database/user-repository.js";
import {
  calculateMargin,
  formatMarginResult,
  MarginInput,
} from "../services/margin-calculator.js";

/**
 * Состояние сессии пользователя для пошагового ввода
 */
interface CalculationSession {
  step: "cost_price" | "selling_price" | "commission" | "logistics" | "storage" | "confirm";
  data: Partial<MarginInput>;
}

// Храним сессии в памяти (для production лучше использовать Redis)
const sessions = new Map<number, CalculationSession>();

/**
 * Проверяет лимит расчетов
 */
function checkLimit(telegramId: number): { allowed: boolean; remaining: number } {
  const hasSubscription = userRepository.hasActiveSubscription(telegramId);
  if (hasSubscription) {
    return { allowed: true, remaining: Infinity };
  }

  const count = userRepository.getCalculationsCount(telegramId);
  const remaining = config.freeCalculationsLimit - count;

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
  };
}

/**
 * Начинает процесс расчета
 */
export async function startCalculation(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Проверяем лимит
  const { allowed, remaining } = checkLimit(userId);

  if (!allowed) {
    await showSubscriptionOffer(ctx);
    return;
  }

  // Создаем новую сессию
  sessions.set(userId, {
    step: "cost_price",
    data: {},
  });

  const remainingText =
    remaining === Infinity
      ? "♾ Безлимит (подписка активна)"
      : `🎁 Осталось бесплатных расчетов: ${remaining}`;

  await ctx.reply(
    `
📊 <b>Новый расчет маржи</b>

${remainingText}

━━━━━━━━━━━━━━━━━━━━

<b>Шаг 1 из 5</b>

💰 Введи <b>себестоимость</b> товара (в рублях):

<i>Это сумма, которую ты платишь за товар + доставка до склада WB</i>
`.trim(),
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Отменить", callback_data: "cancel_calculation" }]],
      },
    }
  );
}

/**
 * Обрабатывает ввод данных пользователем
 */
export async function handleInput(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const text = ctx.message?.text;

  if (!userId || !text) return;

  const session = sessions.get(userId);
  if (!session) return; // Нет активной сессии

  // Парсим число
  const value = parseFloat(text.replace(",", ".").replace(/\s/g, ""));

  if (isNaN(value) || value < 0) {
    await ctx.reply("❌ Пожалуйста, введи корректное число (например: 1500 или 1500.50)");
    return;
  }

  // Сохраняем значение и переходим к следующему шагу
  switch (session.step) {
    case "cost_price":
      session.data.costPrice = value;
      session.step = "selling_price";
      await ctx.reply(
        `
✅ Себестоимость: <b>${value.toLocaleString("ru-RU")} ₽</b>

<b>Шаг 2 из 5</b>

🏷 Введи <b>цену продажи</b> на Wildberries (в рублях):
`.trim(),
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Отменить", callback_data: "cancel_calculation" }]],
          },
        }
      );
      break;

    case "selling_price":
      session.data.sellingPrice = value;
      session.step = "commission";
      await ctx.reply(
        `
✅ Цена продажи: <b>${value.toLocaleString("ru-RU")} ₽</b>

<b>Шаг 3 из 5</b>

📊 Введи <b>комиссию WB</b> (в процентах):

<i>Обычно 15-25% в зависимости от категории товара</i>
`.trim(),
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "15%", callback_data: "commission_15" },
                { text: "19%", callback_data: "commission_19" },
                { text: "22%", callback_data: "commission_22" },
              ],
              [{ text: "❌ Отменить", callback_data: "cancel_calculation" }],
            ],
          },
        }
      );
      break;

    case "commission":
      if (value > 100) {
        await ctx.reply("❌ Комиссия не может быть больше 100%");
        return;
      }
      session.data.wbCommissionPercent = value;
      session.step = "logistics";
      await ctx.reply(
        `
✅ Комиссия WB: <b>${value}%</b>

<b>Шаг 4 из 5</b>

🚚 Введи стоимость <b>логистики WB</b> (в рублях):

<i>Стоимость доставки до покупателя</i>
`.trim(),
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Отменить", callback_data: "cancel_calculation" }]],
          },
        }
      );
      break;

    case "logistics":
      session.data.logisticsCost = value;
      session.step = "storage";
      await ctx.reply(
        `
✅ Логистика: <b>${value.toLocaleString("ru-RU")} ₽</b>

<b>Шаг 5 из 5</b>

📦 Введи стоимость <b>хранения</b> (в рублях):

<i>Общая стоимость хранения на складе WB</i>
`.trim(),
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "0 ₽ (пропустить)", callback_data: "storage_0" }],
              [{ text: "❌ Отменить", callback_data: "cancel_calculation" }],
            ],
          },
        }
      );
      break;

    case "storage":
      session.data.storageCost = value;
      await finishCalculation(ctx, userId);
      break;
  }

  sessions.set(userId, session);
}

/**
 * Обрабатывает нажатия на inline-кнопки
 */
export async function handleCallback(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const data = ctx.callbackQuery?.data;

  if (!userId || !data) return;

  // Отвечаем на callback чтобы убрать "часики"
  await ctx.answerCallbackQuery();

  if (data === "start_calculation") {
    await startCalculation(ctx);
    return;
  }

  if (data === "cancel_calculation") {
    sessions.delete(userId);
    await ctx.reply("❌ Расчет отменен. Нажми /calculate чтобы начать заново.");
    return;
  }

  const session = sessions.get(userId);
  if (!session) return;

  // Обработка быстрых кнопок для комиссии
  if (data.startsWith("commission_")) {
    const commission = parseInt(data.replace("commission_", ""), 10);
    session.data.wbCommissionPercent = commission;
    session.step = "logistics";
    sessions.set(userId, session);

    await ctx.reply(
      `
✅ Комиссия WB: <b>${commission}%</b>

<b>Шаг 4 из 5</b>

🚚 Введи стоимость <b>логистики WB</b> (в рублях):
`.trim(),
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Отменить", callback_data: "cancel_calculation" }]],
        },
      }
    );
    return;
  }

  // Обработка кнопки "пропустить хранение"
  if (data === "storage_0") {
    session.data.storageCost = 0;
    sessions.set(userId, session);
    await finishCalculation(ctx, userId);
    return;
  }
}

/**
 * Завершает расчет и выводит результат
 */
async function finishCalculation(ctx: Context, userId: number): Promise<void> {
  const session = sessions.get(userId);
  if (!session) return;

  const input = session.data as MarginInput;

  // Рассчитываем маржу
  const result = calculateMargin(input);

  // Увеличиваем счетчик расчетов
  userRepository.incrementCalculations(userId);

  // Удаляем сессию
  sessions.delete(userId);

  // Проверяем оставшиеся расчеты
  const { remaining } = checkLimit(userId);
  const remainingText =
    remaining === Infinity
      ? ""
      : remaining > 0
        ? `\n\n🎁 Осталось бесплатных расчетов: ${remaining}`
        : "\n\n⚠️ Это был последний бесплатный расчет!";

  await ctx.reply(formatMarginResult(result) + remainingText, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔄 Новый расчет", callback_data: "start_calculation" }],
        ...(remaining === 0 ? [[{ text: "⭐ Получить безлимит", callback_data: "subscribe" }]] : []),
      ],
    },
  });
}

/**
 * Показывает предложение подписки
 */
async function showSubscriptionOffer(ctx: Context): Promise<void> {
  const price = config.subscriptionPrice / 100;

  await ctx.reply(
    `
⚠️ <b>Лимит бесплатных расчетов исчерпан!</b>

Ты использовал все ${config.freeCalculationsLimit} бесплатных расчетов.

━━━━━━━━━━━━━━━━━━━━

⭐ <b>Подписка "Безлимит"</b>

✅ Неограниченное количество расчетов
✅ Приоритетная поддержка
✅ Новые функции первым

💰 <b>Всего ${price} ₽/месяц</b>

Нажми кнопку ниже для оформления:
`.trim(),
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: `⭐ Подписаться за ${price} ₽/мес`, callback_data: "subscribe" }],
        ],
      },
    }
  );
}

/**
 * Показывает статус подписки
 */
export async function handleStatus(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const hasSubscription = userRepository.hasActiveSubscription(userId);
  const subscriptionEnd = userRepository.getSubscriptionEnd(userId);
  const calculationsCount = userRepository.getCalculationsCount(userId);

  if (hasSubscription && subscriptionEnd) {
    const endDate = subscriptionEnd.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    await ctx.reply(
      `
⭐ <b>Подписка активна</b>

📅 Действует до: <b>${endDate}</b>
📊 Всего расчетов: <b>${calculationsCount}</b>

Пользуйся без ограничений! 🎉
`.trim(),
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📊 Рассчитать маржу", callback_data: "start_calculation" }],
          ],
        },
      }
    );
  } else {
    const remaining = Math.max(0, config.freeCalculationsLimit - calculationsCount);

    await ctx.reply(
      `
📊 <b>Твой статус</b>

🎁 Бесплатных расчетов: <b>${remaining} из ${config.freeCalculationsLimit}</b>
📊 Всего расчетов: <b>${calculationsCount}</b>
⭐ Подписка: <b>не активна</b>

${remaining === 0 ? "Оформи подписку для безлимитных расчетов!" : ""}
`.trim(),
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📊 Рассчитать маржу", callback_data: "start_calculation" }],
            ...(remaining === 0 ? [[{ text: "⭐ Получить безлимит", callback_data: "subscribe" }]] : []),
          ],
        },
      }
    );
  }
}

