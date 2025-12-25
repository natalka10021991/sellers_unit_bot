import { motion } from "framer-motion";
import { Input } from "../Input";
import { STORAGE_COST, STORAGE_COST_PER_DAY, STORAGE_DAYS } from "../../constants/calculations";

interface Step3Props {
  commissionPercent: string;
  logisticsCost: string;
  storageCost: string;
  returnPercent: string;
  onLogisticsCostChange: (value: string) => void;
  onReturnPercentChange: (value: string) => void;
  errors?: {
    commission?: string;
    logisticsCost?: string;
    storageCost?: string;
    returnPercent?: string;
  };
}

export function Step3({
  commissionPercent,
  logisticsCost,
  storageCost,
  returnPercent,
  onReturnPercentChange,
  errors,
}: Step3Props) {
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
        <label className="block text-sm font-medium text-tg-hint mb-2">
          <span className="mr-2">🚚</span>
          Стоимость логистики
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Выбрать склад"
            value={logisticsCost ? `${logisticsCost} руб` : ""}
            readOnly
            className="w-full px-4 py-3.5 bg-tg-secondary-bg/80 backdrop-blur-sm border-2 border-transparent rounded-2xl text-tg-text text-lg font-medium placeholder:text-tg-hint/50 focus:border-accent-purple/50 focus:bg-tg-secondary-bg transition-all duration-200"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tg-hint">▼</span>
        </div>
        {logisticsCost && (
          <p className="text-xs text-tg-hint mt-1 ml-2">
            рассчитано с учетом габаритов товара
          </p>
        )}
        <p className="text-xs text-tg-hint mt-2 ml-2">
          ⚠️ Выбор склада и расчет логистики будут доступны позже
        </p>
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
            className="w-5 h-5 rounded-full bg-tg-hint/20 flex items-center justify-center text-xs text-tg-hint hover:bg-tg-hint/30 transition-colors"
            title="Рассчитано на основе средних показателей для выбранной категории. Вы можете указать свой процент, если знаете фактический выкуп."
          >
            ?
          </button>
        </div>
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

