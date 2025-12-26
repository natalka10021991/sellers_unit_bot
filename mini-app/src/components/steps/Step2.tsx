import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "../Input";
import { Button } from "../Button";

interface Step2Props {
  purchasePrice: string;
  deliveryPricePerKg: string;
  weightGrams: string;
  deliveryToYou: string;
  packagingCost: string;
  otherExpenses: string;
  onPurchasePriceChange: (value: string) => void;
  onDeliveryPricePerKgChange: (value: string) => void;
  onWeightGramsChange: (value: string) => void;
  onDeliveryToYouChange?: (value: string) => void;
  onPackagingCostChange: (value: string) => void;
  onOtherExpensesChange: (value: string) => void;
  errors?: {
    purchasePrice?: string;
    deliveryPricePerKg?: string;
    weightGrams?: string;
    packagingCost?: string;
    otherExpenses?: string;
  };
}

export function Step2({
  purchasePrice,
  deliveryPricePerKg,
  weightGrams,
  deliveryToYou,
  packagingCost,
  otherExpenses,
  onPurchasePriceChange,
  onDeliveryPricePerKgChange,
  onWeightGramsChange,
  onDeliveryToYouChange,
  onPackagingCostChange,
  onOtherExpensesChange,
  errors,
}: Step2Props) {
  const [isDeliverySaved, setIsDeliverySaved] = useState(false);

  // Рассчитываем стоимость доставки
  const calculateDelivery = () => {
    if (deliveryPricePerKg && weightGrams) {
      const price = parseFloat(deliveryPricePerKg) || 0;
      const weight = parseFloat(weightGrams) || 0;
      const result = (price * weight) / 1000;
      return result.toFixed(2);
    }
    return "";
  };

  const handleSaveDelivery = () => {
    if (deliveryPricePerKg && weightGrams) {
      const result = calculateDelivery();
      if (result && onDeliveryToYouChange) {
        onDeliveryToYouChange(result);
      }
      setIsDeliverySaved(true);
    }
  };

  // Сбрасываем состояние сохранения при изменении полей
  const handleDeliveryPriceChange = (value: string) => {
    setIsDeliverySaved(false);
    onDeliveryPricePerKgChange(value);
  };

  const handleWeightChange = (value: string) => {
    setIsDeliverySaved(false);
    onWeightGramsChange(value);
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
          💡 Укажите все затраты на закупку и доставку товара
        </p>
      </motion.div>

      {/* Закупка */}
      <div>
        <Input
          label="Закупка 1 ед., руб"
          icon="💰"
          placeholder="Стоимость на сайте поставщика"
          suffix="₽"
          value={purchasePrice}
          onChange={(e) => onPurchasePriceChange(e.target.value)}
          error={errors?.purchasePrice}
          type="text"
          inputMode="decimal"
        />

      </div>

      {/* Стоимость доставки до вас */}
      <div>
        <p className="text-sm text-tg-hint mb-3">
          Стоимость доставки из Китая, Киргизии, стран СНГ и т.д.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <Input
              label="Цена за 1 кг в руб."
              placeholder="0"
              suffix="₽"
              value={deliveryPricePerKg}
              onChange={(e) => handleDeliveryPriceChange(e.target.value)}
              error={errors?.deliveryPricePerKg}
              type="text"
              inputMode="decimal"
            />
          </div>
          <div>
            <Input
              label="Вес 1 ед., г"
              placeholder="0"
              suffix="г"
              value={weightGrams}
              onChange={(e) => handleWeightChange(e.target.value)}
              error={errors?.weightGrams}
              type="text"
              inputMode="decimal"
            />
          </div>
        </div>

        <div className="flex items-center justify-end mb-4">
          <Button
            size="sm"
            onClick={handleSaveDelivery}
            disabled={!deliveryPricePerKg || !weightGrams}
          >
            Сохранить
          </Button>
        </div>

        {/* Стоимость доставки до вас - показывается после сохранения */}
        <AnimatePresence>
          {(isDeliverySaved || deliveryToYou) && (deliveryToYou || calculateDelivery()) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4"
            >
              <div className="p-3 rounded-xl bg-tg-secondary-bg/80">
                <p className="text-lg text-tg-hint">
                  Стоимость доставки до вас - <span className="text-lg font-bold text-tg-text">
                    {deliveryToYou || calculateDelivery()} ₽
                  </span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Расходы на упаковку и доставку до склада WB */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-tg-hint">
            <span className="mr-2">📦</span>
            Расходы на упаковку и доставку до склада WB
          </label>
          <button
            type="button"
            className="w-5 h-5 rounded-full bg-tg-hint/20 flex items-center justify-center text-xs text-tg-hint hover:bg-tg-hint/30 transition-colors"
            title="Необходимо учесть расходы на этикетки, короба для поставок. Возможно вам потребуется дополнительно упаковать/переупаковать товар, воспользоваться услугами логистических компаний для доставки грузов на склады ВБ"
          >
            ?
          </button>
        </div>
        <Input
          placeholder="Введите расходы, руб"
          suffix="₽"
          value={packagingCost}
          onChange={(e) => onPackagingCostChange(e.target.value)}
          error={errors?.packagingCost}
          type="text"
          inputMode="decimal"
        />
      </div>

      {/* Прочие расходы */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-tg-hint">
            <span className="mr-2">📋</span>
            Прочие расходы
          </label>
          <button
            type="button"
            className="w-5 h-5 rounded-full bg-tg-hint/20 flex items-center justify-center text-xs text-tg-hint hover:bg-tg-hint/30 transition-colors"
            title="Необходимо учесть индивидуальные расходы на товар: маркировка, брендирование, фулфилмент"
          >
            ?
          </button>
        </div>
        <Input
          placeholder="Введите расходы, руб"
          suffix="₽"
          value={otherExpenses}
          onChange={(e) => onOtherExpensesChange(e.target.value)}
          error={errors?.otherExpenses}
          type="text"
          inputMode="decimal"
        />
      </div>
    </motion.div>
  );
}

