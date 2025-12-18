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

// URL Mini App (замени на свой после деплоя)
const MINI_APP_URL = process.env.MINI_APP_URL || "https://your-app.vercel.app";

// Команда /start - сразу открываем Mini App
bot.command("start", async (ctx) => {
  const user = ctx.from!;
  getOrCreateUser(user.id, user.first_name, user.username);

  // Сразу открываем Mini App через кнопку
  const keyboard = new InlineKeyboard()
    .webApp("📱 Открыть калькулятор", MINI_APP_URL);

  await ctx.reply(
    `👋 Привет, <b>${user.first_name}</b>!\n\n` +
      `Нажми кнопку ниже, чтобы открыть калькулятор маржи!`,
    { parse_mode: "HTML", reply_markup: keyboard }
  );
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
  await ctx.reply(
    `📚 <b>Справка по боту</b>\n\n` +
      `<b>Доступные команды:</b>\n` +
      `/calculate - Начать расчет маржи\n` +
      `/status - Проверить статус подписки\n` +
      `/subscribe - Оформить подписку\n` +
      `/cancel - Отменить текущий расчет\n` +
      `/help - Показать эту справку\n\n` +
      `<b>Как рассчитывается маржа:</b>\n` +
      `Маржа = (Прибыль / Выручка) × 100%\n\n` +
      `<b>Прибыль</b> = Цена продажи - Себестоимость - Комиссия WB - Логистика - Хранение\n\n` +
      `💡 Рекомендуемая маржа для WB: от 20%`,
    { parse_mode: "HTML" }
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

  await ctx.reply(statusText, { parse_mode: "HTML" });
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
    await ctx.reply("❌ Расчет отменен. Нажмите /calculate чтобы начать заново.");
  } else {
    await ctx.reply("Нечего отменять. Нажмите /calculate чтобы начать расчет.");
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

// ============ ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ ============

bot.on("message:text", async (ctx) => {
  // Если нет активной сессии расчета - игнорируем
  if (!ctx.session) {
    await ctx.reply("Нажмите /calculate чтобы начать расчет маржи.\n" + "Или /help для справки.");
    return;
  }

  const text = ctx.message.text.trim();
  const number = parseFloat(text.replace(",", "."));

  // Проверяем что введено число
  if (isNaN(number) || number < 0) {
    await ctx.reply("❌ Пожалуйста, введите корректное положительное число.");
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
        await ctx.reply("❌ Комиссия не может быть больше 100%");
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

// Обработка ошибок
bot.catch((err) => {
  console.error("Ошибка бота:", err);
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
    await ctx.reply("✅ Menu Button установлен! Теперь Mini App будет открываться при нажатии на бота.");
  } catch (err: any) {
    await ctx.reply(`❌ Ошибка: ${err.message}\n\nПопробуй установить вручную через @BotFather:\n/setmenubutton`);
  }
});

// Запуск
console.log("🤖 Бот запускается...");
bot.start({
  onStart: async (botInfo) => {
    console.log(`✅ Бот @${botInfo.username} успешно запущен!`);
    
    // Устанавливаем Menu Button при запуске
    try {
      await bot.api.setChatMenuButton({
        menu_button: {
          type: "web_app",
          text: "📱 Калькулятор",
          web_app: { url: MINI_APP_URL },
        },
      });
      console.log("✅ Menu Button установлен автоматически");
    } catch (err: any) {
      console.warn("⚠️ Не удалось установить Menu Button автоматически:", err.message);
      console.log("💡 Используй команду /setmenubutton или установи через @BotFather");
    }
  },
});
