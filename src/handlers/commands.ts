import { Context } from "grammy";
import { config } from "../config.js";
import {
  getOrCreateUser,
  getRemainingFreeCalculations,
  hasActiveSubscription,
} from "../database/db.js";

/**
 * Обработчик команды /start
 */
export async function handleStart(ctx: Context): Promise<void> {
  const user = ctx.from!;
  const dbUser = getOrCreateUser(user.id, user.username, user.first_name);
  const remaining = getRemainingFreeCalculations(dbUser, config.freeCalculationsLimit);
  const hasSubscription = hasActiveSubscription(dbUser);

  const welcomeMessage = `
👋 Привет, *${user.first_name || "друг"}*!

Я помогу тебе рассчитать маржу товара на *Wildberries*.

📊 *Что я умею:*
• Рассчитывать чистую прибыль с единицы товара
• Учитывать комиссию WB, логистику и хранение
• Показывать маржу и ROI в процентах
• Давать рекомендации по рентабельности

${
  hasSubscription
    ? "✨ У тебя активная подписка — расчеты безлимитны!"
    : `🎁 У тебя *${remaining} бесплатных расчетов*`
}

Нажми /calculate чтобы начать расчет!
`.trim();

  await ctx.reply(welcomeMessage, { parse_mode: "Markdown" });
}

/**
 * Обработчик команды /help
 */
export async function handleHelp(ctx: Context): Promise<void> {
  const helpMessage = `
📚 *Справка по боту*

*Команды:*
/start — Начать работу с ботом
/calculate — Рассчитать маржу товара
/status — Проверить статус подписки
/subscribe — Оформить подписку
/help — Показать эту справку

*Как рассчитывается маржа:*

\`Прибыль = Цена − Себестоимость − Комиссия WB − Логистика − Хранение\`

\`Маржа (%) = (Прибыль / Цена) × 100\`

*Рекомендуемая маржа:*
🔥 Более 30% — отличная
👍 15-30% — нормальная  
⚠️ Менее 15% — рискованная

*Комиссия WB по категориям:*
• Одежда, обувь: 15%
• Электроника: 15%
• Продукты: 12-15%
• Товары для дома: 15%
• Косметика: 15-18%
• Детские товары: 15%

_Точную комиссию смотрите в личном кабинете WB_
`.trim();

  await ctx.reply(helpMessage, { parse_mode: "Markdown" });
}

/**
 * Обработчик команды /status
 */
export async function handleStatus(ctx: Context): Promise<void> {
  const user = ctx.from!;
  const dbUser = getOrCreateUser(user.id, user.username, user.first_name);
  const remaining = getRemainingFreeCalculations(dbUser, config.freeCalculationsLimit);
  const hasSubscription = hasActiveSubscription(dbUser);

  let statusMessage: string;

  if (hasSubscription) {
    const until = new Date(dbUser.subscription_until!);
    statusMessage = `
✨ *Статус: Премиум*

📅 Подписка активна до: *${until.toLocaleDateString("ru-RU")}*
📊 Всего расчетов: *${dbUser.calculations_count}*
♾️ Лимит: *безлимитный*
`.trim();
  } else {
    statusMessage = `
📊 *Ваш статус*

🎁 Осталось бесплатных расчетов: *${remaining} из ${config.freeCalculationsLimit}*
📊 Всего расчетов: *${dbUser.calculations_count}*

${
  remaining === 0
    ? "⚠️ Бесплатные расчеты закончились!\nНажмите /subscribe для оформления подписки."
    : ""
}
`.trim();
  }

  await ctx.reply(statusMessage, { parse_mode: "Markdown" });
}

/**
 * Обработчик команды /subscribe
 */
export async function handleSubscribe(ctx: Context): Promise<void> {
  const priceRub = config.subscriptionPrice / 100;

  const subscribeMessage = `
💎 *Премиум подписка*

*Что входит:*
✅ Безлимитные расчеты маржи
✅ Приоритетная поддержка
✅ Ранний доступ к новым функциям

*Стоимость:* ${priceRub} ₽/месяц

🔜 _Оплата будет доступна в ближайшее время_

Для подключения платежей напишите разработчику.
`.trim();

  await ctx.reply(subscribeMessage, { parse_mode: "Markdown" });
}
