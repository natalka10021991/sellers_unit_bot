import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "../Input";
import { STORAGE_COST, STORAGE_COST_PER_DAY, STORAGE_DAYS } from "../../constants/calculations";

interface Step3Props {
  commissionPercent: string;
  logisticsCost: string;
  storageCost: string;
  returnPercent: string;
  returnCostPerUnit: string;
  onLogisticsCostChange: (value: string) => void;
  onReturnPercentChange: (value: string) => void;
  onReturnCostPerUnitChange: (value: string) => void;
  errors?: {
    commission?: string;
    logisticsCost?: string;
    storageCost?: string;
    returnPercent?: string;
    returnCostPerUnit?: string;
  };
}

export function Step3({
  commissionPercent,
  logisticsCost,
  storageCost,
  returnPercent,
  returnCostPerUnit,
  onReturnPercentChange,
  onReturnCostPerUnitChange,
  errors,
}: Step3Props) {
  const [showLogisticsPopup, setShowLogisticsPopup] = useState(false);
  const [showReturnPercentPopup, setShowReturnPercentPopup] = useState(false);

  // Функция для определения темы и получения правильных цветов для инпутов/дропдаунов
  // Согласно требованиям: светлая тема = темный фон + светлый текст, темная тема = светлый фон + темный текст
  const getInputColors = () => {
    const tg = window.Telegram?.WebApp;
    
    // Определяем тему: сначала из Telegram, потом из системных настроек браузера
    let isDark: boolean;
    if (tg) {
      isDark = tg.colorScheme === 'dark';
    } else {
      // Fallback: используем системную тему браузера
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (isDark) {
      // Темная тема Telegram: светлый фон инпута + темный текст
      return {
        bg: '#ffffff',
        text: '#000000',
        border: '#e9e9e9',
      };
    } else {
      // Светлая тема Telegram: темный фон инпута + светлый текст
      return {
        bg: 'rgb(243 243 243)',
        text: '#000000',
        border: '#e9e9e9',
      };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-accent-purple/10 to-accent-pink/10 border border-accent-purple/20"
      >
        <p className="text-sm text-tg-hint">
          💡 Комиссия рассчитывается автоматически по категории. Укажите логистику и хранение
        </p>
      </motion.div>

      {/* Комиссия */}
      <div>
        <Input
          label="Комиссия"
          icon="📊"
          placeholder={commissionPercent ? `${commissionPercent}%` : "0%"}
          suffix="%"
          value={commissionPercent || ""}
          onChange={() => {}} // Read-only
          error={errors?.commission}
          type="text"
          inputMode="decimal"
          readOnly
        />
        <p className="text-xs text-tg-hint mt-1 ml-2">
          Рассчитано по категории товара. Комиссия в рублях будет рассчитана при вводе цены продажи на шаге 4.
        </p>
      </div>

      {/* Стоимость логистики */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-tg-hint">
            <span className="mr-2">🚚</span>
            Стоимость логистики
          </label>
          <button
            type="button"
            onClick={() => setShowLogisticsPopup(!showLogisticsPopup)}
            className="w-5 h-5 rounded-full bg-tg-hint/20 flex items-center justify-center text-xs text-tg-hint hover:bg-tg-hint/30 transition-colors"
            title="Информация о расчете логистики"
          >
            ?
          </button>
        </div>
        
        {/* Попап с информацией о расчете логистики */}
        <AnimatePresence>
          {showLogisticsPopup && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3 p-4 bg-accent-purple/10 rounded-xl border border-accent-purple/20"
            >
              <p className="text-xs text-tg-hint space-y-1">
                <div>70 ₽ - средняя цена за первый литр товара</div>
                <div>21 ₽ - средняя цена за дополнительный литр</div>
                <div>1,5 - среднее значение коэффициента склада (152%)</div>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          <input
            type="text"
            placeholder="Рассчитывается автоматически"
            value={logisticsCost ? `${logisticsCost} ₽` : ""}
            readOnly
            className="w-full px-4 py-3.5 backdrop-blur-sm border-2 rounded-2xl text-lg font-medium placeholder:text-tg-hint/50 transition-all duration-200"
            style={{
              backgroundColor: getInputColors().bg,
              color: getInputColors().text,
              borderColor: getInputColors().border,
            }}
          />
        </div>
        {logisticsCost && (
          <p className="text-xs text-tg-hint mt-1 ml-2">
            Рассчитано с учетом габаритов товара
          </p>
        )}
      </div>

      {/* % возврата */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-tg-hint">
            <span className="mr-2">↩️</span>
            % возврата
          </label>
          <button
            type="button"
            onClick={() => setShowReturnPercentPopup(!showReturnPercentPopup)}
            className="w-5 h-5 rounded-full bg-tg-hint/20 flex items-center justify-center text-xs text-tg-hint hover:bg-tg-hint/30 transition-colors"
            title="Информация о проценте возврата"
          >
            ?
          </button>
        </div>
        
        {/* Попап с информацией о проценте возврата */}
        <AnimatePresence>
          {showReturnPercentPopup && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3 p-4 bg-accent-purple/10 rounded-xl border border-accent-purple/20"
            >
              <p className="text-xs text-tg-hint space-y-1">
                <div>На категорию одежды возврат 50-80%</div>
                <div>На товарную категорию 20-50%</div>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <Input
          placeholder="Введите %"
          suffix="%"
          value={returnPercent}
          onChange={(e) => onReturnPercentChange(e.target.value)}
          error={errors?.returnPercent}
          type="text"
          inputMode="decimal"
        />
        <p className="text-xs text-tg-hint mt-1 ml-2">
          Рассчитано на основе средних показателей для выбранной категории
        </p>
        
        {/* Стоимость возврата 1 единицы товара */}
        <div className="mt-3">
          <Input
            label="Стоимость возврата 1 единицы товара"
            icon="💰"
            placeholder="50"
            suffix="₽"
            value={returnCostPerUnit}
            onChange={(e) => onReturnCostPerUnitChange(e.target.value)}
            error={errors?.returnCostPerUnit}
            type="text"
            inputMode="decimal"
          />
          <p className="text-xs text-tg-hint mt-1 ml-2">
            Расходы на возврат рассчитываются как: (процент возврата / 100) × стоимость возврата 1 единицы
          </p>
        </div>
      </div>

      {/* Стоимость хранения */}
      <div>
        <Input
          label="Стоимость хранения"
          icon="📦"
          placeholder="0.00"
          suffix="₽"
          value={storageCost || STORAGE_COST}
          onChange={() => {}} // Read-only, автоматически рассчитывается
          error={errors?.storageCost}
          type="text"
          inputMode="decimal"
          readOnly
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 px-4 py-2 bg-accent-purple/10 rounded-xl flex items-start gap-2"
        >
          <span className="text-tg-hint">ℹ️</span>
          <p className="text-xs text-tg-hint">
            Средняя стоимость хранения одной единицы товара за {STORAGE_DAYS} дней (рассчитано автоматически: {STORAGE_COST_PER_DAY} × {STORAGE_DAYS} = {STORAGE_COST} ₽).
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

