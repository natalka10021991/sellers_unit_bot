import { motion } from "framer-motion";

interface MarginResult {
  costPrice: number;
  sellingPrice: number;
  wbCommission: number;
  logistics: number;
  storage: number;
  revenue: number;
  commissionAmount: number;
  totalCosts: number;
  profit: number;
  marginPercent: number;
  markup: number;
}

interface ResultCardProps {
  result: MarginResult;
  onNewCalculation: () => void;
}

export function ResultCard({ result, onNewCalculation }: ResultCardProps) {
  const isProfitable = result.profit >= 0;
  const marginLevel =
    result.marginPercent >= 30
      ? "excellent"
      : result.marginPercent >= 20
      ? "good"
      : result.marginPercent >= 10
      ? "medium"
      : "low";

  const marginColors = {
    excellent: "from-emerald-500 to-teal-500",
    good: "from-accent-cyan to-emerald-500",
    medium: "from-amber-500 to-orange-500",
    low: "from-red-500 to-rose-500",
  };

  const formatMoney = (value: number) =>
    value.toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      {/* Main Result Card */}
      <div
        className={`
          relative overflow-hidden rounded-3xl p-6
          bg-gradient-to-br ${marginColors[marginLevel]}
        `}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="text-white/80 text-sm font-medium mb-1">
            Чистая прибыль
          </div>
          <div className="text-4xl font-bold text-white mb-4">
            {isProfitable ? "+" : ""}
            {formatMoney(result.profit)} ₽
          </div>

          <div className="flex items-center gap-6">
            <div>
              <div className="text-white/70 text-xs">Маржа</div>
              <div className="text-2xl font-bold text-white">
                {result.marginPercent.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-white/70 text-xs">Наценка</div>
              <div className="text-2xl font-bold text-white">
                {result.markup.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-tg-secondary-bg/60 backdrop-blur-sm rounded-2xl p-5"
      >
        <h3 className="text-sm font-semibold text-tg-hint mb-4">
          Детали расчета
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-tg-hint">Выручка</span>
            <span className="text-tg-text font-medium">
              {formatMoney(result.revenue)} ₽
            </span>
          </div>

          <div className="h-px bg-white/5" />

          <div className="flex justify-between items-center">
            <span className="text-tg-hint">Себестоимость</span>
            <span className="text-red-400">-{formatMoney(result.costPrice)} ₽</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-tg-hint">
              Комиссия WB ({result.wbCommission}%)
            </span>
            <span className="text-red-400">
              -{formatMoney(result.commissionAmount)} ₽
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-tg-hint">Логистика</span>
            <span className="text-red-400">-{formatMoney(result.logistics)} ₽</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-tg-hint">Хранение</span>
            <span className="text-red-400">-{formatMoney(result.storage)} ₽</span>
          </div>

          <div className="h-px bg-white/10" />

          <div className="flex justify-between items-center">
            <span className="text-tg-text font-semibold">Итого затрат</span>
            <span className="text-tg-text font-semibold">
              {formatMoney(result.totalCosts)} ₽
            </span>
          </div>
        </div>
      </motion.div>

      {/* Recommendation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`
          rounded-2xl p-4 
          ${isProfitable ? "bg-emerald-500/10" : "bg-red-500/10"}
        `}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{isProfitable ? "💡" : "⚠️"}</span>
          <p className={`text-sm ${isProfitable ? "text-emerald-300" : "text-red-300"}`}>
            {!isProfitable
              ? "Товар убыточный! Рассмотрите снижение себестоимости или повышение цены."
              : result.marginPercent < 10
              ? "Низкая маржа. Рекомендуется от 20% для устойчивого бизнеса."
              : result.marginPercent < 20
              ? "Приемлемая маржа, но есть куда расти!"
              : result.marginPercent >= 30
              ? "Отличная маржа! Товар высокорентабельный. 🚀"
              : "Хорошая маржа для работы на WB!"}
          </p>
        </div>
      </motion.div>

      {/* New Calculation Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={onNewCalculation}
        className="
          w-full py-4 rounded-2xl
          bg-tg-secondary-bg/60 border border-white/10
          text-tg-text font-medium
          hover:bg-tg-secondary-bg transition-colors
          flex items-center justify-center gap-2
        "
      >
        <span>🔄</span>
        Новый расчет
      </motion.button>
    </motion.div>
  );
}


