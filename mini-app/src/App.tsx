import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTelegram } from "./hooks/useTelegram";
import { Input } from "./components/Input";
import { Button } from "./components/Button";
import { ResultCard } from "./components/ResultCard";
import { CategoryAutocomplete } from "./components/CategoryAutocomplete";

interface FormData {
  category: string;
  costPrice: string;
  sellingPrice: string;
  wbCommission: string;
  logistics: string;
  storage: string;
}

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

const initialFormData: FormData = {
  category: "",
  costPrice: "",
  sellingPrice: "",
  wbCommission: "15",
  logistics: "",
  storage: "",
};

// URL API бота
// В Telegram Mini App нельзя использовать localhost
const getApiUrl = () => {
  // Если задан через переменную окружения - используем его
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Если открыто в браузере (localhost) - используем localhost
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:3000";
  }
  
  // В Telegram Mini App (продакшен) - нужно указать URL бота
  // Пока используем тот же домен, что и Mini App (если бот задеплоен там же)
  // Или можно получить из Telegram WebApp initData
  const tg = window.Telegram?.WebApp;
  if (tg?.initDataUnsafe?.start_param) {
    // Можно передать URL бота через start_param
    const startParam = tg.initDataUnsafe.start_param;
    if (startParam.startsWith("http")) {
      return startParam;
    }
  }
  
  // По умолчанию - тот же домен (для случая, когда бот и Mini App на одном домене)
  // TODO: После деплоя бота указать его URL здесь или через переменную окружения
  return window.location.origin.replace(/mini-app.*$/, "").replace(/\/$/, "") || "";
};

const API_URL = getApiUrl();

export default function App() {
  const { user, isReady, hapticFeedback } = useTelegram();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [result, setResult] = useState<MarginResult | null>(null);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isCalculating, setIsCalculating] = useState(false);

  // Валидация формы
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.costPrice || parseFloat(formData.costPrice) <= 0) {
      newErrors.costPrice = "Введите себестоимость";
    }
    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
      newErrors.sellingPrice = "Введите цену продажи";
    }
    if (
      !formData.wbCommission ||
      parseFloat(formData.wbCommission) < 0 ||
      parseFloat(formData.wbCommission) > 100
    ) {
      newErrors.wbCommission = "Комиссия от 0 до 100%";
    }
    if (!formData.logistics || parseFloat(formData.logistics) < 0) {
      newErrors.logistics = "Введите стоимость логистики";
    }
    if (!formData.storage || parseFloat(formData.storage) < 0) {
      newErrors.storage = "Введите стоимость хранения";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Расчет маржи
  const calculateMargin = useCallback(() => {
    if (!validateForm()) {
      hapticFeedback("error");
      return;
    }

    setIsCalculating(true);
    hapticFeedback("medium");

    // Имитируем небольшую задержку для анимации
    setTimeout(() => {
      const costPrice = parseFloat(formData.costPrice);
      const sellingPrice = parseFloat(formData.sellingPrice);
      const wbCommission = parseFloat(formData.wbCommission);
      const logistics = parseFloat(formData.logistics);
      const storage = parseFloat(formData.storage);

      const revenue = sellingPrice;
      const commissionAmount = (sellingPrice * wbCommission) / 100;
      const totalCosts = costPrice + commissionAmount + logistics + storage;
      const profit = revenue - totalCosts;
      const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;
      const markup =
        costPrice > 0 ? ((sellingPrice - costPrice) / costPrice) * 100 : 0;

      setResult({
        costPrice,
        sellingPrice,
        wbCommission,
        logistics,
        storage,
        revenue,
        commissionAmount,
        totalCosts,
        profit,
        marginPercent,
        markup,
      });

      setIsCalculating(false);
      hapticFeedback("success");
    }, 300);
  }, [formData, validateForm, hapticFeedback]);

  // Сброс формы
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setResult(null);
    setErrors({});
    hapticFeedback("light");
  }, [hapticFeedback]);

  // Обновление поля формы
  const handleInputChange = (field: keyof FormData, value: string) => {
    // Разрешаем только числа и точку
    const sanitized = value.replace(/[^0-9.,]/g, "").replace(",", ".");
    setFormData((prev) => ({ ...prev, [field]: sanitized }));
    // Убираем ошибку при изменении
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !result) {
        calculateMargin();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [calculateMargin, result]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 px-4 py-4 backdrop-blur-xl bg-tg-bg/80"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
            <span className="text-xl">📊</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-tg-text">WB Маржа</h1>
            <p className="text-xs text-tg-hint">
              {user ? `Привет, ${user.first_name}!` : "Калькулятор маржи"}
            </p>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <main className="px-4 pt-2">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ResultCard result={result} onNewCalculation={resetForm} />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-2"
            >
              {/* Info Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-accent-purple/10 to-accent-pink/10 border border-accent-purple/20"
              >
                <p className="text-sm text-tg-hint">
                  💡 Введите данные о товаре для расчета маржи и рентабельности
                  продаж на Wildberries
                </p>
              </motion.div>

              {/* Form */}
              {/* Категория товара с autocomplete */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CategoryAutocomplete
                  value={formData.category}
                  onChange={(category) => {
                    setFormData((prev) => ({
                      ...prev,
                      category: category?.name || "",
                    }));
                  }}
                  onCommissionChange={(commission) => {
                    setFormData((prev) => ({
                      ...prev,
                      wbCommission: commission.toString(),
                    }));
                    // Убираем ошибку комиссии при автозаполнении
                    if (errors.wbCommission) {
                      setErrors((prev) => ({ ...prev, wbCommission: undefined }));
                    }
                  }}
                  apiUrl={API_URL}
                  error={errors.category}
                />
              </motion.div>

              <Input
                label="Себестоимость"
                icon="💰"
                placeholder="Например: 500"
                suffix="₽"
                value={formData.costPrice}
                onChange={(e) => handleInputChange("costPrice", e.target.value)}
                error={errors.costPrice}
                type="text"
                inputMode="decimal"
              />

              <Input
                label="Цена продажи на WB"
                icon="🏷️"
                placeholder="Например: 1500"
                suffix="₽"
                value={formData.sellingPrice}
                onChange={(e) => handleInputChange("sellingPrice", e.target.value)}
                error={errors.sellingPrice}
                type="text"
                inputMode="decimal"
              />

              <Input
                label="Комиссия Wildberries"
                icon="📊"
                placeholder="15-25% (заполняется автоматически)"
                suffix="%"
                value={formData.wbCommission}
                onChange={(e) => handleInputChange("wbCommission", e.target.value)}
                error={errors.wbCommission}
                type="text"
                inputMode="decimal"
              />

              <Input
                label="Логистика"
                icon="🚚"
                placeholder="Доставка до покупателя"
                suffix="₽"
                value={formData.logistics}
                onChange={(e) => handleInputChange("logistics", e.target.value)}
                error={errors.logistics}
                type="text"
                inputMode="decimal"
              />

              <Input
                label="Хранение"
                icon="📦"
                placeholder="За период продажи"
                suffix="₽"
                value={formData.storage}
                onChange={(e) => handleInputChange("storage", e.target.value)}
                error={errors.storage}
                type="text"
                inputMode="decimal"
              />

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="pt-4"
              >
                <Button
                  size="lg"
                  onClick={calculateMargin}
                  loading={isCalculating}
                >
                  Рассчитать маржу
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 px-4 text-center"
      >
        <p className="text-xs text-tg-hint/50">
          Sellers Unit Bot • Калькулятор маржи WB
        </p>
      </motion.footer>
    </div>
  );
}
