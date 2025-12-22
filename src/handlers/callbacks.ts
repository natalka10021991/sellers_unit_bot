import type { BotContext } from "../types/index.js";
import { startCalculation, handleStats } from "./commands.js";
import { mainMenuKeyboard, subscriptionKeyboard } from "../keyboards/index.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

/**
 * Обработчик инлайн-кнопок
 */
export async function handleCallbackQuery(ctx: BotContext): Promise<void> {
  const callbackData = ctx.callbackQuery?.data;

  if (!callbackData) return;

  // Отвечаем на callback чтобы убрать "часики"
  await ctx.answerCallbackQuery();

  switch (callbackData) {
    case "new_calculation":
      await startCalculation(ctx);
      break;

    case "show_stats":
      await handleStats(ctx);
      break;

    case "subscribe":
      await showSubscriptionInfo(ctx);
      break;

    case "back_to_menu":
      await ctx.reply("🏠 Главное меню", {
        reply_markup: mainMenuKeyboard,
      });
      break;

    case "cancel_payment":
      await ctx.reply("❌ Оплата отменена", {
        reply_markup: mainMenuKeyboard,
      });
      break;

    default:
      logger.warn("Unknown callback", { callbackData });
  }
}

/**
 * Информация о подписке
 */
async function showSubscriptionInfo(ctx: BotContext): Promise<void> {
  await ctx.reply(
    `
💎 <b>Подписка WB Margin Pro</b>

<b>Стоимость:</b> ${config.subscriptionPrice} ₽/месяц

<b>Что входит:</b>
✅ Безлимитные расчеты маржи
✅ Приоритетная поддержка
✅ Доступ к новым функциям

<b>Как оплатить:</b>
Для подключения платежей необходимо интегрировать ЮKassa.
Напишите администратору для оформления подписки.

📧 Контакт: @your_admin_username
    `.trim(),
    {
      parse_mode: "HTML",
      reply_markup: subscriptionKeyboard,
    }
  );
}

