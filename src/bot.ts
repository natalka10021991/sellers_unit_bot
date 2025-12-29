import { Bot, Context, session, SessionFlavor, InlineKeyboard } from "grammy";
import { config } from "./config/index.js";
import { CalculationSession, CalculationStep, MarginInputData } from "./types.js";
import { calculateMargin, formatMarginResult } from "./services/margin-calculator.js";
import {
  getOrCreateUser,
  incrementCalculations,
  hasAccessToCalculate,
  getRemainingCalculations,
  saveCalculation,
} from "./database/db.js";
import { getMainKeyboard, getRestartKeyboard } from "./keyboards/main-keyboard.js";
import { logger } from "./utils/logger.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { setupGracefulShutdown } from "./utils/graceful-shutdown.js";

// Тип контекста с сессией
type MyContext = Context & SessionFlavor<CalculationSession | undefined>;

// Создаем бота
const bot = new Bot<MyContext>(config.botToken);

// Настраиваем сессии для хранения состояния диалога
bot.use(
  session({
    initial: (): CalculationSession | undefined => undefined,
  })
);

// Middleware для логирования запросов
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const command = ctx.message?.text || ctx.callbackQuery?.data || "unknown";

  logger.debug("Incoming request", { userId, username, command });

  const startTime = Date.now();
  await next();
  const duration = Date.now() - startTime;

  logger.debug("Request processed", { userId, command, duration: `${duration}ms` });
});

// Rate limiting middleware
bot.use(rateLimit(config.rateLimitMaxRequests, config.rateLimitWindowMs));

// Middleware для обработки ошибок
bot.use(async (ctx, next) => {
  try {
    await next();
  } catch (err: any) {
    logger.error("Ошибка в обработчике", err, {
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
    });

    const errorMessage = `
⚠️ <b>Произошла ошибка</b>

${err.message || "Неизвестная ошибка"}

Попробуйте:
• Нажать /restart для перезапуска бота
• Или /help для справки

Если проблема повторяется, обратитесь в поддержку.
    `.trim();

    try {
      await ctx.reply(errorMessage, {
        parse_mode: "HTML",
        reply_markup: getRestartKeyboard(),
      });
    } catch (replyErr) {
      logger.error("Не удалось отправить сообщение об ошибке", replyErr);
    }
  }
});

// Тексты для каждого шага
const stepTexts: Record<CalculationStep, string> = {
  cost_price: "💰 Введите <b>себестоимость</b> товара (в рублях):\n\n<i>Например: 500</i>",
  selling_price:
    "🏷️ Введите <b>цену продажи</b> на Wildberries (в рублях):\n\n<i>Например: 1500</i>",
  wb_commission:
    "📊 Введите <b>комиссию WB</b> для вашей категории (в %):\n\n<i>Обычно 15-25%. Например: 15</i>",
  logistics:
    "🚚 Введите стоимость <b>логистики</b> (в рублях):\n\n<i>Доставка до покупателя. Например: 50</i>",
  storage:
    "📦 Введите стоимость <b>хранения</b> (в рублях):\n\n<i>За период продажи. Например: 30</i>",
  complete: "",
};

// Порядок шагов
const stepsOrder: CalculationStep[] = [
  "cost_price",
  "selling_price",
  "wb_commission",
  "logistics",
  "storage",
  "complete",
];

// ============ КОМАНДЫ ============

// URL Mini App из конфига
const MINI_APP_URL = config.miniAppUrl;

// Команда /start - сразу открываем Mini App
bot.command("start", async (ctx) => {
  const user = ctx.from!;
  getOrCreateUser(user.id, user.first_name, user.username);

  // Очищаем сессию при старте
  ctx.session = undefined;

  // Сразу открываем Mini App через кнопку
  const inlineKeyboard = new InlineKeyboard().webApp("Начать расчет", MINI_APP_URL);

  // Добавляем постоянную клавиатуру с Mini App кнопкой
  const mainKeyboard = getMainKeyboard(MINI_APP_URL);

  await ctx.reply(
    `👋 <b>Привет!</b>\n\n` +
      `Я помогу посчитать <b>маржинальность товара на WB</b> и Ozon\n\n` +
      `📊 <b>Что я умею:</b>\n` +
      `• считаю чистую прибыль\n` +
      `• учитываю комиссии, логистику и возвраты\n` +
      `• показываю, выгоден ли товар\n\n` +
      `🎁 У тебя есть <b>${config.freeCalculationsLimit} бесплатных расчетов</b>!\n\n` +
      `Нажми кнопку ниже или используй меню для быстрого доступа.`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: inlineKeyboard.inline_keyboard },
    }
  );

  // Отправляем отдельное сообщение с постоянной клавиатурой
  await ctx.reply("💡 <b>Быстрый доступ:</b>\nИспользуй кнопки ниже для основных действий.", {
    parse_mode: "HTML",
    reply_markup: mainKeyboard,
  });
});

// Команда /restart - перезапуск бота (сброс состояния)
bot.command("restart", async (ctx) => {
  const user = ctx.from!;

  // Очищаем сессию
  ctx.session = undefined;

  // Обновляем пользователя
  getOrCreateUser(user.id, user.first_name, user.username);

  const keyboard = getMainKeyboard(MINI_APP_URL);
  const inlineKeyboard = new InlineKeyboard().webApp("Начать расчет", MINI_APP_URL);

  await ctx.reply(
    `👋 <b>Привет!</b>\n\n` +
      `Я помогу посчитать <b>маржинальность товара на WB</b> и Ozon\n\n` +
      `📊 <b>Что я умею:</b>\n` +
      `• считаю чистую прибыль\n` +
      `• учитываю комиссии, логистику и возвраты\n` +
      `• показываю, выгоден ли товар\n\n` +
      `🎁 У тебя есть <b>${config.freeCalculationsLimit} бесплатных расчетов</b>!\n\n` +
      `Нажми кнопку ниже или используй меню для быстрого доступа.`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: inlineKeyboard.inline_keyboard },
    }
  );

  // Отправляем отдельное сообщение с постоянной клавиатурой
  await ctx.reply("💡 <b>Быстрый доступ:</b>\nИспользуй кнопки ниже для основных действий.", {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
});

// Callback для расчета в чате
bot.callbackQuery("start_chat_calculation", async (ctx) => {
  await ctx.answerCallbackQuery();

  const user = ctx.from!;
  const dbUser = getOrCreateUser(user.id, user.first_name, user.username);

  if (!hasAccessToCalculate(dbUser, config.freeCalculationsLimit)) {
    const keyboard = new InlineKeyboard().text("💳 Оформить подписку", "subscribe_monthly");
    await ctx.reply(
      `😔 Ваш лимит бесплатных расчетов исчерпан.\n\n` +
        `Оформите подписку за <b>149 ₽/месяц</b> для безлимитного доступа!`,
      { parse_mode: "HTML", reply_markup: keyboard }
    );
    return;
  }

  ctx.session = {
    step: "cost_price",
    data: {},
  };

  const remaining = getRemainingCalculations(dbUser, config.freeCalculationsLimit);
  const limitText =
    remaining === Infinity ? "♾️ У вас безлимитный доступ" : `🎁 Осталось расчетов: ${remaining}`;

  await ctx.reply(
    `🧮 <b>Расчет маржи товара WB</b>\n\n` + `${limitText}\n\n` + stepTexts.cost_price,
    { parse_mode: "HTML" }
  );
});

// Команда /help
bot.command("help", async (ctx) => {
  const keyboard = getMainKeyboard(MINI_APP_URL);

  await ctx.reply(
    `📚 <b>Справка по боту</b>\n\n` +
      `<b>Доступные команды:</b>\n` +
      `/start - Перезапустить бота\n` +
      `/calculate - Начать расчет маржи\n` +
      `/status - Проверить статус подписки\n` +
      `/subscribe - Оформить подписку\n` +
      `/cancel - Отменить текущий расчет\n` +
      `/restart - Сбросить состояние бота\n` +
      `/help - Показать эту справку\n\n` +
      `<b>Как рассчитывается маржа:</b>\n` +
      `Маржа = (Прибыль / Выручка) × 100%\n\n` +
      `<b>Прибыль</b> = Цена продажи - Себестоимость - Комиссия WB - Логистика - Хранение\n\n` +
      `💡 Рекомендуемая маржа для WB: от 20%\n\n` +
      `💬 <b>Совет:</b> Используй кнопки меню для быстрого доступа!`,
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  );
});

// Команда /status - проверка статуса
bot.command("status", async (ctx) => {
  const user = ctx.from!;
  const dbUser = getOrCreateUser(user.id, user.first_name, user.username);
  const remaining = getRemainingCalculations(dbUser, config.freeCalculationsLimit);

  let statusText = `📊 <b>Ваш статус</b>\n\n`;
  statusText += `👤 ${user.first_name}\n`;
  statusText += `📈 Выполнено расчетов: ${dbUser.calculations_count}\n\n`;

  if (dbUser.subscription_until) {
    const subDate = new Date(dbUser.subscription_until);
    if (subDate > new Date()) {
      statusText += `✅ <b>Подписка активна</b>\n`;
      statusText += `📅 До: ${subDate.toLocaleDateString("ru-RU")}\n`;
      statusText += `♾️ Безлимитные расчеты`;
    } else {
      statusText += `❌ Подписка истекла\n`;
      statusText += `🎁 Осталось бесплатных: ${remaining}`;
    }
  } else {
    statusText += `🎁 Осталось бесплатных расчетов: <b>${remaining}</b>`;
    if (remaining === 0) {
      statusText += `\n\n💳 Оформите подписку: /subscribe`;
    }
  }

  await ctx.reply(statusText, {
    parse_mode: "HTML",
    reply_markup: getMainKeyboard(),
  });
});

// Команда /subscribe - оформление подписки
bot.command("subscribe", async (ctx) => {
  const keyboard = new InlineKeyboard().text(
    "💳 Оформить подписку - 149₽/мес",
    "subscribe_monthly"
  );

  await ctx.reply(
    `💎 <b>Премиум подписка</b>\n\n` +
      `Получите безлимитный доступ к расчетам маржи!\n\n` +
      `✅ Безлимитные расчеты\n` +
      `✅ Приоритетная поддержка\n` +
      `✅ История всех расчетов\n\n` +
      `💰 Стоимость: <b>149 ₽/месяц</b>`,
    { parse_mode: "HTML", reply_markup: keyboard }
  );
});

// Команда /cancel - отмена расчета
bot.command("cancel", async (ctx) => {
  if (ctx.session) {
    ctx.session = undefined;
    const keyboard = getMainKeyboard(MINI_APP_URL);
    await ctx.reply(
      "❌ <b>Расчет отменен</b>\n\n" +
        "Все введенные данные удалены.\n\n" +
        "Используй кнопки меню или /calculate чтобы начать новый расчет.",
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
      }
    );
  } else {
    const keyboard = getMainKeyboard(MINI_APP_URL);
    await ctx.reply(
      "ℹ️ Нечего отменять.\n\n" +
        "Вы не находитесь в процессе расчета.\n\n" +
        "Используй кнопки меню или /calculate чтобы начать расчет.",
      { reply_markup: keyboard }
    );
  }
});

// Команда /calculate - начать расчет
bot.command("calculate", async (ctx) => {
  const user = ctx.from!;
  const dbUser = getOrCreateUser(user.id, user.first_name, user.username);

  // Проверяем доступ
  if (!hasAccessToCalculate(dbUser, config.freeCalculationsLimit)) {
    const keyboard = new InlineKeyboard().text("💳 Оформить подписку", "subscribe_monthly");

    await ctx.reply(
      `😔 Ваш лимит бесплатных расчетов исчерпан.\n\n` +
        `Оформите подписку за <b>149 ₽/месяц</b> для безлимитного доступа!`,
      { parse_mode: "HTML", reply_markup: keyboard }
    );
    return;
  }

  // Начинаем сессию расчета
  ctx.session = {
    step: "cost_price",
    data: {},
  };

  const remaining = getRemainingCalculations(dbUser, config.freeCalculationsLimit);
  const limitText =
    remaining === Infinity ? "♾️ У вас безлимитный доступ" : `🎁 Осталось расчетов: ${remaining}`;

  await ctx.reply(
    `🧮 <b>Расчет маржи товара WB</b>\n\n` + `${limitText}\n\n` + stepTexts.cost_price,
    { parse_mode: "HTML" }
  );
});

// ============ ОБРАБОТКА CALLBACK КНОПОК ============

bot.callbackQuery("subscribe_monthly", async (ctx) => {
  await ctx.answerCallbackQuery();

  // Здесь будет интеграция с платежами
  // Пока показываем заглушку
  await ctx.reply(
    `💳 <b>Оплата подписки</b>\n\n` +
      `Функция оплаты будет доступна после настройки платежного провайдера.\n\n` +
      `Для настройки платежей:\n` +
      `1. Откройте @BotFather\n` +
      `2. Выберите вашего бота\n` +
      `3. Нажмите "Payments"\n` +
      `4. Подключите ЮKassa или другого провайдера`,
    { parse_mode: "HTML" }
  );
});

// ============ ОБРАБОТКА ТЕКСТОВЫХ КНОПОК ============

bot.hears("📈 Мой статус", async (ctx) => {
  // Симулируем команду /status
  const user = ctx.from!;
  const dbUser = getOrCreateUser(user.id, user.first_name, user.username);
  const remaining = getRemainingCalculations(dbUser, config.freeCalculationsLimit);

  let statusText = `📊 <b>Ваш статус</b>\n\n`;
  statusText += `👤 ${user.first_name}\n`;
  statusText += `📈 Выполнено расчетов: ${dbUser.calculations_count}\n\n`;

  if (dbUser.subscription_until) {
    const subDate = new Date(dbUser.subscription_until);
    if (subDate > new Date()) {
      statusText += `✅ <b>Подписка активна</b>\n`;
      statusText += `📅 До: ${subDate.toLocaleDateString("ru-RU")}\n`;
      statusText += `♾️ Безлимитные расчеты`;
    } else {
      statusText += `❌ Подписка истекла\n`;
      statusText += `🎁 Осталось бесплатных: ${remaining}`;
    }
  } else {
    statusText += `🎁 Осталось бесплатных расчетов: <b>${remaining}</b>`;
    if (remaining === 0) {
      statusText += `\n\n💳 Оформите подписку: /subscribe`;
    }
  }

  await ctx.reply(statusText, {
    parse_mode: "HTML",
    reply_markup: getMainKeyboard(),
  });
});

bot.hears("💎 Подписка", async (ctx) => {
  // Симулируем команду /subscribe
  const keyboard = new InlineKeyboard().text(
    "💳 Оформить подписку - 149₽/мес",
    "subscribe_monthly"
  );

  await ctx.reply(
    `💎 <b>Премиум подписка</b>\n\n` +
      `Получите безлимитный доступ к расчетам маржи!\n\n` +
      `✅ Безлимитные расчеты\n` +
      `✅ Приоритетная поддержка\n` +
      `✅ История всех расчетов\n\n` +
      `💰 Стоимость: <b>149 ₽/месяц</b>`,
    { parse_mode: "HTML", reply_markup: keyboard }
  );
});

bot.hears("❓ Помощь", async (ctx) => {
  // Симулируем команду /help
  const keyboard = getMainKeyboard(MINI_APP_URL);

  await ctx.reply(
    `📚 <b>Справка по боту</b>\n\n` +
      `<b>Доступные команды:</b>\n` +
      `/start - Перезапустить бота\n` +
      `/calculate - Начать расчет маржи\n` +
      `/status - Проверить статус подписки\n` +
      `/subscribe - Оформить подписку\n` +
      `/cancel - Отменить текущий расчет\n` +
      `/restart - Сбросить состояние бота\n` +
      `/help - Показать эту справку\n\n` +
      `<b>Как рассчитывается маржа:</b>\n` +
      `Маржа = (Прибыль / Выручка) × 100%\n\n` +
      `<b>Прибыль</b> = Цена продажи - Себестоимость - Комиссия WB - Логистика - Хранение\n\n` +
      `💡 Рекомендуемая маржа для WB: от 20%`,
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  );
});

bot.hears(["🔄 Перезапустить", "🔄 Перезапустить бота"], async (ctx) => {
  // Симулируем команду /restart
  const user = ctx.from!;
  ctx.session = undefined;
  getOrCreateUser(user.id, user.first_name, user.username);

  const keyboard = getMainKeyboard(MINI_APP_URL);
  const inlineKeyboard = new InlineKeyboard().webApp("Начать расчет", MINI_APP_URL);

  await ctx.reply(
    `🔄 <b>Бот перезапущен!</b>\n\n` +
      `Все данные сброшены. Готов к работе!\n\n` +
      `Нажми кнопку ниже, чтобы открыть калькулятор.`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: inlineKeyboard.inline_keyboard },
    }
  );

  await ctx.reply("Используй кнопки меню для быстрого доступа:", { reply_markup: keyboard });
});

// ============ ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ ============

bot.on("message:text", async (ctx) => {
  // Если нет активной сессии расчета - показываем подсказку
  if (!ctx.session) {
    const keyboard = getMainKeyboard(MINI_APP_URL);
    await ctx.reply(
      "💡 <b>Подсказка</b>\n\n" +
        "Используй кнопки меню ниже или команды:\n" +
        "• /calculate - начать расчет\n" +
        "• /help - справка\n" +
        "• /restart - перезапустить бота",
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
      }
    );
    return;
  }

  const text = ctx.message.text.trim();

  // Проверка на команды во время расчета
  if (text.startsWith("/")) {
    await ctx.reply(
      "⚠️ Вы находитесь в процессе расчета.\n\n" +
        "Используйте /cancel чтобы отменить текущий расчет.",
      { reply_markup: getMainKeyboard() }
    );
    return;
  }

  const number = parseFloat(text.replace(",", "."));

  // Улучшенная валидация
  if (isNaN(number)) {
    await ctx.reply(
      "❌ <b>Ошибка ввода</b>\n\n" +
        "Пожалуйста, введите <b>число</b>.\n\n" +
        "Примеры:\n" +
        "• 500\n" +
        "• 1500.50\n" +
        "• 25.5\n\n" +
        "Или используйте /cancel чтобы отменить расчет.",
      { parse_mode: "HTML" }
    );
    return;
  }

  if (number < 0) {
    await ctx.reply(
      "❌ <b>Ошибка ввода</b>\n\n" +
        "Значение не может быть отрицательным.\n\n" +
        "Пожалуйста, введите положительное число.\n\n" +
        "Или используйте /cancel чтобы отменить расчет.",
      { parse_mode: "HTML" }
    );
    return;
  }

  // Сохраняем значение в зависимости от текущего шага
  const { step, data } = ctx.session;

  switch (step) {
    case "cost_price":
      data.costPrice = number;
      break;
    case "selling_price":
      data.sellingPrice = number;
      break;
    case "wb_commission":
      if (number > 100) {
        await ctx.reply(
          "❌ <b>Ошибка ввода</b>\n\n" +
            "Комиссия не может быть больше 100%.\n\n" +
            "Обычно комиссия WB составляет 15-25%.\n\n" +
            "Попробуйте еще раз или используйте /cancel.",
          { parse_mode: "HTML" }
        );
        return;
      }
      if (number < 0) {
        await ctx.reply(
          "❌ <b>Ошибка ввода</b>\n\n" +
            "Комиссия не может быть отрицательной.\n\n" +
            "Попробуйте еще раз или используйте /cancel.",
          { parse_mode: "HTML" }
        );
        return;
      }
      data.wbCommission = number;
      break;
    case "logistics":
      data.logistics = number;
      break;
    case "storage":
      data.storage = number;
      break;
  }

  // Переходим к следующему шагу
  const currentIndex = stepsOrder.indexOf(step);
  const nextStep = stepsOrder[currentIndex + 1];

  if (nextStep === "complete") {
    // Все данные собраны - делаем расчет
    const user = ctx.from!;
    const dbUser = getOrCreateUser(user.id, user.first_name, user.username);

    const result = calculateMargin(data as MarginInputData);

    // Сохраняем расчет и увеличиваем счетчик
    saveCalculation(user.id, {
      costPrice: result.costPrice,
      sellingPrice: result.sellingPrice,
      wbCommission: result.wbCommission,
      logistics: result.logistics,
      storage: result.storage,
      profit: result.profit,
      marginPercent: result.marginPercent,
    });
    incrementCalculations(user.id);

    // Отправляем результат
    await ctx.reply(formatMarginResult(result), { parse_mode: "HTML" });

    // Показываем оставшиеся расчеты
    const remaining = getRemainingCalculations(
      getOrCreateUser(user.id, user.first_name, user.username),
      config.freeCalculationsLimit
    );

    if (remaining !== Infinity && remaining <= 2 && remaining > 0) {
      await ctx.reply(
        `⚠️ Осталось бесплатных расчетов: ${remaining}\n\n` +
          `💳 Оформите подписку /subscribe для безлимитного доступа!`
      );
    }

    // Очищаем сессию
    ctx.session = undefined;

    // Предлагаем новый расчет
    const keyboard = new InlineKeyboard().text("🔄 Новый расчет", "new_calculation");

    await ctx.reply("Хотите сделать еще один расчет?", { reply_markup: keyboard });
  } else {
    // Переходим к следующему шагу
    ctx.session.step = nextStep;
    await ctx.reply(stepTexts[nextStep], { parse_mode: "HTML" });
  }
});

// Кнопка нового расчета
bot.callbackQuery("new_calculation", async (ctx) => {
  await ctx.answerCallbackQuery();

  // Симулируем команду /calculate
  const user = ctx.from!;
  const dbUser = getOrCreateUser(user.id, user.first_name, user.username);

  if (!hasAccessToCalculate(dbUser, config.freeCalculationsLimit)) {
    const keyboard = new InlineKeyboard().text("💳 Оформить подписку", "subscribe_monthly");

    await ctx.reply(
      `😔 Ваш лимит бесплатных расчетов исчерпан.\n\n` + `Оформите подписку за <b>149 ₽/месяц</b>!`,
      { parse_mode: "HTML", reply_markup: keyboard }
    );
    return;
  }

  ctx.session = {
    step: "cost_price",
    data: {},
  };

  await ctx.reply(stepTexts.cost_price, { parse_mode: "HTML" });
});

// ============ ЗАПУСК БОТА ============

// Обработка ошибок на уровне бота
bot.catch((err) => {
  logger.error("Критическая ошибка бота", err);
});

// Команда для установки Menu Button (на случай если автоматическая установка не сработала)
bot.command("setmenubutton", async (ctx) => {
  try {
    await bot.api.setChatMenuButton({
      menu_button: {
        type: "web_app",
        text: "📱 Калькулятор",
        web_app: { url: MINI_APP_URL },
      },
    });
    await ctx.reply(
      "✅ Menu Button установлен! Теперь Mini App будет открываться при нажатии на бота."
    );
  } catch (err: any) {
    await ctx.reply(
      `❌ Ошибка: ${err.message}\n\nПопробуй установить вручную через @BotFather:\n/setmenubutton`
    );
  }
});

// Запуск
logger.info("🤖 Бот запускается...");

// Настраиваем graceful shutdown
setupGracefulShutdown(bot);

bot.start({
  onStart: async (botInfo) => {
    logger.info(`✅ Бот @${botInfo.username} успешно запущен!`, {
      botId: botInfo.id,
      username: botInfo.username,
    });

    // Устанавливаем Menu Button при запуске
    try {
      await bot.api.setChatMenuButton({
        menu_button: {
          type: "web_app",
          text: "📱 Калькулятор",
          web_app: { url: MINI_APP_URL },
        },
      });
      logger.info("✅ Menu Button установлен автоматически");
    } catch (err: any) {
      logger.warn("⚠️ Не удалось установить Menu Button автоматически", err as Error);
      logger.info("💡 Используй команду /setmenubutton или установи через @BotFather");
    }
  },
});
