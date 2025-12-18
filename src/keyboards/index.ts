import { InlineKeyboard, Keyboard } from "grammy";

/**
 * Главное меню (Reply Keyboard)
 */
export const mainMenuKeyboard = new Keyboard()
  .text("📊 Рассчитать маржу")
  .row()
  .text("📈 Моя статистика")
  .text("💎 Подписка")
  .row()
  .text("❓ Помощь")
  .resized();

/**
 * Кнопка отмены
 */
export const cancelKeyboard = new Keyboard()
  .text("❌ Отмена")
  .resized()
  .oneTime();

/**
 * Инлайн кнопки для подписки
 */
export const subscriptionKeyboard = new InlineKeyboard()
  .text("💳 Оформить подписку", "subscribe")
  .row()
  .text("🔙 Назад", "back_to_menu");

/**
 * Инлайн кнопки после успешного расчета
 */
export const afterCalculationKeyboard = new InlineKeyboard()
  .text("🔄 Новый расчет", "new_calculation")
  .row()
  .text("📊 Статистика", "show_stats");

/**
 * Подтверждение оплаты
 */
export const paymentKeyboard = new InlineKeyboard()
  .pay("💳 Оплатить 149 ₽")
  .row()
  .text("❌ Отмена", "cancel_payment");

