import { motion } from "framer-motion";
import { Input } from "../Input";

interface Step2Props {
  purchasePrice: string;
  deliveryPricePerKg: string;
  weightGrams: string;
  packagingCost: string;
  otherExpenses: string;
  onPurchasePriceChange: (value: string) => void;
  onDeliveryPricePerKgChange: (value: string) => void;
  onWeightGramsChange: (value: string) => void;
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
  packagingCost,
  otherExpenses,
  onPurchasePriceChange,
  onDeliveryPricePerKgChange,
  onWeightGramsChange,
  onPackagingCostChange,
  onOtherExpensesChange,
  errors,
}: Step2Props) {
  // Рассчитываем стоимость доставки
  const calculatedDelivery = 
    deliveryPricePerKg && weightGrams
      ? ((parseFloat(deliveryPricePerKg) || 0) * (parseFloat(weightGrams) || 0)) / 1000
      : 0;

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
        <p className="text-xs text-tg-hint mt-1 ml-2">
          Стоимость на сайте поставщика
        </p>
      </div>

      {/* Стоимость доставки до вас */}
      <div>
        <p className="text-xs text-tg-hint mb-3">
          Стоимость доставки из Китая, Киргизии, стран СНГ и т.д.
        </p>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <Input
              label="Цена за 1 кг в руб."
              placeholder="0"
              suffix="₽"
              value={deliveryPricePerKg}
              onChange={(e) => onDeliveryPricePerKgChange(e.target.value)}
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
              onChange={(e) => onWeightGramsChange(e.target.value)}
              error={errors?.weightGrams}
              type="text"
              inputMode="decimal"
            />
          </div>
        </div>

        {/* Поле с результатом расчета */}
        <Input
          label="Стоимость доставки до вас"
          icon="🚚"
          placeholder="0"
          suffix="₽"
          value={calculatedDelivery > 0 ? calculatedDelivery.toFixed(2) : ""}
          onChange={() => {}} // Read-only
          type="text"
          inputMode="decimal"
          readOnly
        />
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

