import { Keyboard } from "grammy";

/**
 * Постоянная клавиатура с основными командами
 * Отображается всегда внизу экрана для быстрого доступа
 */
export function getMainKeyboard(miniAppUrl?: string) {
  const keyboard = new Keyboard()
    .text("📈 Мой статус")
    .row()
    .text("💎 Подписка")
    .text("❓ Помощь")
    .row()
    .text("🔄 Перезапустить")
    .resized()
    .persistent();
  
  return keyboard;
}

/**
 * Компактная клавиатура (только основные функции)
 */
export function getCompactKeyboard() {
  return new Keyboard()
    .text("📊 Рассчитать")
    .text("📈 Статус")
    .row()
    .text("🔄 Перезапустить")
    .resized()
    .persistent();
}

/**
 * Клавиатура только с кнопкой перезапуска (для критических ситуаций)
 */
export function getRestartKeyboard() {
  return new Keyboard()
    .text("🔄 Перезапустить бота")
    .resized()
    .persistent();
}

