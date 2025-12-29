import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Input } from "../Input";
import { Button } from "../Button";
import { ResultCard } from "../ResultCard";
import { exportToPDF } from "../../utils/pdfExport";

interface Step4Props {
  sellingPrice: string;
  commissionPercent: string;
  productName: string;
  category: string;
  onSellingPriceChange: (value: string) => void;
  costData: {
    purchasePrice: number;
    deliveryCost: number;
    packagingCost: number;
    otherExpenses: number;
    logisticsCost: number;
    returnPercent: number;
    returnCostPerUnit: number;
    storageCost: number;
  };
  onCalculate: () => void;
  result: {
    profit: number;
    salesProfitability: number;
    costProfitability: number;
    conversion: string;
    totalCosts: number;
    margin: number;
  } | null;
  onNewCalculation: () => void;
  errors?: {
    sellingPrice?: string;
  };
}

export function Step4({
  sellingPrice,
  commissionPercent,
  productName,
  category,
  onSellingPriceChange,
  costData,
  onCalculate,
  result,
  onNewCalculation,
  errors,
}: Step4Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Рассчитываем метрики
  const calculateMetrics = () => {
    if (!sellingPrice || parseFloat(sellingPrice) <= 0) return null;

    const price = parseFloat(sellingPrice);
    const commission = (price * (parseFloat(commissionPercent) || 0)) / 100;
    // Расходы на возврат на 1 проданный товар = (процент возврата / 100) × стоимость возврата 1 единицы
    const returnCost = (costData.returnPercent / 100) * costData.returnCostPerUnit;
    
    const totalCosts =
      costData.purchasePrice +
      costData.deliveryCost +
      costData.packagingCost +
      costData.otherExpenses +
      commission +
      costData.logisticsCost +
      returnCost +
      costData.storageCost;

    const profit = price - totalCosts;
    const salesProfitability = price > 0 ? (profit / price) * 100 : 0;
    const costProfitability =
      totalCosts > 0 ? (profit / (costData.purchasePrice + costData.deliveryCost + costData.packagingCost + costData.otherExpenses)) * 100 : 0;
    const conversion = `${totalCosts.toFixed(0)}₽ → ${price.toFixed(0)}₽`;

    return {
      profit,
      salesProfitability,
      costProfitability,
      conversion,
      totalCosts,
      margin: salesProfitability,
    };
  };

  const metrics = calculateMetrics();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      {/* Цена продажи */}
      <Input
        label="Цена продажи (1 ед)"
        icon="🏷️"
        placeholder="Введите стоимость, по которой планируете продавать товар"
        suffix="₽"
        value={sellingPrice}
        onChange={(e) => onSellingPriceChange(e.target.value)}
        error={errors?.sellingPrice}
        type="text"
        inputMode="decimal"
      />

      {metrics && (
        <>
          {/* Результаты расчета */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="p-4 rounded-2xl bg-gradient-to-r from-accent-purple/10 to-accent-pink/10 border border-accent-purple/20">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-tg-hint">Прибыль с 1 ед.</span>
                  <span className={`text-lg font-bold ${metrics.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {metrics.profit.toFixed(0)} ₽
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-tg-hint">Рентабельность продаж</span>
                  <span className="text-lg font-bold text-tg-text">
                    {metrics.salesProfitability.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-tg-hint">Рентабельность затрат</span>
                  <span className="text-lg font-bold text-tg-text">
                    {metrics.costProfitability.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-tg-hint">Конверсия вложено-получено</span>
                  <span className="text-lg font-bold text-tg-text">{metrics.conversion}</span>
                </div>
              </div>
            </div>

            {/* Себестоимость и затраты (раскрывающийся блок) */}
            <motion.div className="rounded-2xl bg-tg-secondary-bg/80 border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex justify-between items-center hover:bg-white/5 transition-colors"
              >
                <span className="text-sm font-medium text-tg-text">Себестоимость и затраты</span>
                <span className={`text-tg-hint transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                  ▼
                </span>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2 border-t border-white/10 pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-tg-hint">Себестоимость</span>
                        <span className="text-tg-text">{costData.purchasePrice.toFixed(0)} ₽</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-tg-hint">Закупка</span>
                        <span className="text-tg-text">{costData.purchasePrice.toFixed(0)} ₽</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-tg-hint">Доставка товара до вас</span>
                        <span className="text-tg-text">{costData.deliveryCost.toFixed(0)} ₽</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-tg-hint">Упаковка и доставка до складов ВБ</span>
                        <span className="text-tg-text">{costData.packagingCost.toFixed(0)} ₽</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-tg-hint">Комиссия</span>
                        <span className="text-tg-text">
                          {sellingPrice ? ((parseFloat(sellingPrice) * (parseFloat(commissionPercent) || 0)) / 100).toFixed(0) : "0"} ₽
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-tg-hint">Стоимость логистики</span>
                        <span className="text-tg-text">{costData.logisticsCost.toFixed(0)} ₽</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-tg-hint">Возвраты</span>
                        <span className="text-tg-text">
                          {((costData.returnPercent / 100) * costData.returnCostPerUnit).toFixed(0)} ₽
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-tg-hint">Хранение</span>
                        <span className="text-tg-text">{costData.storageCost.toFixed(0)} ₽</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-tg-hint">Прочие расходы</span>
                        <span className="text-tg-text">{costData.otherExpenses.toFixed(0)} ₽</span>
                      </div>
                      <div className="pt-2 border-t border-white/10 mt-2">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-tg-text">Итого затрат</span>
                          <span className="text-tg-text">{metrics.totalCosts.toFixed(0)} ₽</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Кнопки */}
          <div className="space-y-3">
            <Button size="lg" onClick={onCalculate}>
              Сохранить расчёт
            </Button>
            {metrics && (
              <Button
                size="lg"
                onClick={async () => {
                  setIsExporting(true);
                  try {
                    await exportToPDF({
                      productName,
                      category,
                      purchasePrice: costData.purchasePrice,
                      deliveryCost: costData.deliveryCost,
                      packagingCost: costData.packagingCost,
                      otherExpenses: costData.otherExpenses,
                      commission: (parseFloat(sellingPrice) * (parseFloat(commissionPercent) || 0)) / 100,
                      commissionPercent: parseFloat(commissionPercent) || 0,
                      logisticsCost: costData.logisticsCost,
                      returnPercent: costData.returnPercent,
                      returnCostPerUnit: costData.returnCostPerUnit,
                      storageCost: costData.storageCost,
                      sellingPrice: parseFloat(sellingPrice),
                      profit: metrics.profit,
                      salesProfitability: metrics.salesProfitability,
                      costProfitability: metrics.costProfitability,
                      totalCosts: metrics.totalCosts,
                      marginPercent: metrics.margin,
                    });
                  } catch (error) {
                    alert("Не удалось создать PDF. Попробуйте позже.");
                  } finally {
                    setIsExporting(false);
                  }
                }}
                disabled={isExporting}
                className="bg-tg-secondary-bg/60 border border-white/10 hover:bg-tg-secondary-bg"
              >
                {isExporting ? "Создание PDF..." : "📄 Скачать PDF"}
              </Button>
            )}
          </div>
        </>
      )}

      {/* Если результат уже рассчитан, показываем карточку результата */}
      {result && (
        <ResultCard
          result={{
            costPrice: costData.purchasePrice + costData.deliveryCost + costData.packagingCost + costData.otherExpenses,
            sellingPrice: parseFloat(sellingPrice),
            wbCommission: parseFloat(commissionPercent) || 0,
            logistics: costData.logisticsCost,
            storage: costData.storageCost,
            revenue: parseFloat(sellingPrice),
            commissionAmount: (parseFloat(sellingPrice) * (parseFloat(commissionPercent) || 0)) / 100,
            totalCosts: metrics?.totalCosts || 0,
            profit: metrics?.profit || 0,
            marginPercent: metrics?.margin || 0,
            markup: 0,
          }}
          onNewCalculation={onNewCalculation}
        />
      )}
    </motion.div>
  );
}

