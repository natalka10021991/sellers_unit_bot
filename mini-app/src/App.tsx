import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTelegram } from "./hooks/useTelegram";
import { useDebounce } from "./hooks/useDebounce";
import { Button } from "./components/Button";
import { Step1 } from "./components/steps/Step1";
import { Step2 } from "./components/steps/Step2";
import { Step3 } from "./components/steps/Step3";
import { Step4 } from "./components/steps/Step4";
import { ResultCard } from "./components/ResultCard";
import { STORAGE_COST } from "./constants/calculations";

// Расширенная структура данных формы
interface FormData {
  // Шаг 1
  productName: string;
  category: string;
  categoryId: number | null;
  packageLength: string;
  packageWidth: string;
  packageHeight: string;
  packageVolume: string; // Рассчитывается автоматически
  taxationType: string; // УСН "Доходы", УСН "Доходы-расходы", НПД, ОСН, Другое
  taxRate: string; // 6%, 15%, 25%, Не учитывать, или кастомное значение
  customTaxRate: string; // Для "Другое"

  // Шаг 2
  purchasePrice: string;
  deliveryPricePerKg: string;
  weightGrams: string;
  deliveryToYou: string; // Рассчитывается автоматически
  packagingCost: string;
  otherExpenses: string;

  // Шаг 3
  commission: string;
  commissionPercent: string;
  logisticsCost: string;
  storageCost: string;
  returnPercent: string;

  // Шаг 4
  sellingPrice: string;
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
  productName: "",
  category: "",
  categoryId: null,
  packageLength: "",
  packageWidth: "",
  packageHeight: "",
  packageVolume: "",
  taxationType: "",
  taxRate: "",
  customTaxRate: "",
  purchasePrice: "",
  deliveryPricePerKg: "",
  weightGrams: "",
  deliveryToYou: "",
  packagingCost: "",
  otherExpenses: "",
  commission: "",
  commissionPercent: "15",
  logisticsCost: "",
  storageCost: "",
  returnPercent: "",
  sellingPrice: "",
};

// URL API бота
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL.trim();
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:3000";
  }

  const tg = window.Telegram?.WebApp;
  if (tg?.initDataUnsafe?.start_param) {
    const startParam = tg.initDataUnsafe.start_param;
    if (startParam.startsWith("http")) {
      return startParam.endsWith("/") ? startParam.slice(0, -1) : startParam;
    }
  }

  return "";
};

const API_URL = getApiUrl();

export default function App() {
  const { user, isReady, hapticFeedback } = useTelegram();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [result, setResult] = useState<MarginResult | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSearchingCategories, setIsSearchingCategories] = useState(false);
  const [foundCategories, setFoundCategories] = useState<Array<{ id: number; name: string }>>([]);

  // Debounce для поиска категорий (500ms задержка, минимум 2 символа)
  const debouncedProductName = useDebounce(formData.productName, 500);

  // Функция для сброса данных шагов 2-4
  const resetSteps2To4 = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      // Шаг 2
      purchasePrice: "",
      deliveryPricePerKg: "",
      weightGrams: "",
      deliveryToYou: "",
      packagingCost: "",
      otherExpenses: "",
      // Шаг 3
      commission: "0.00",
      logisticsCost: "",
      storageCost: "",
      returnPercent: "",
      // Шаг 4
      sellingPrice: "",
    }));
    setResult(null);
    // Сбрасываем ошибки для всех полей кроме шага 1
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.purchasePrice;
      delete newErrors.deliveryPricePerKg;
      delete newErrors.weightGrams;
      delete newErrors.packagingCost;
      delete newErrors.otherExpenses;
      delete newErrors.commission;
      delete newErrors.commissionPercent;
      delete newErrors.logisticsCost;
      delete newErrors.storageCost;
      delete newErrors.returnPercent;
      delete newErrors.sellingPrice;
      return newErrors;
    });
  }, []);

  // Загрузка комиссии для категории
  const loadCommissionForCategory = useCallback(async (categoryId: number) => {
    try {
      const url = `${API_URL}/api/commission/${categoryId}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        const commissionPercent = data.data.commission;

        setFormData((prev) => ({
          ...prev,
          commissionPercent: commissionPercent.toString(),
          // Комиссию в рублях рассчитываем только от цены продажи, поэтому пока оставляем 0.00
          commission: "0.00",
        }));
      }
    } catch (err) {
      // Ошибка загрузки комиссии - игнорируем
    }
  }, []);

  // Обработка выбора категории
  const handleCategoryChange = useCallback((category: { id: number; name: string } | null) => {
    setFormData((prev) => {
      // Проверяем, были ли заполнены данные шагов 2-4
      const hasSteps2To4Data =
        prev.purchasePrice ||
        prev.deliveryPricePerKg ||
        prev.weightGrams ||
        prev.packagingCost ||
        prev.otherExpenses ||
        prev.logisticsCost ||
        prev.storageCost ||
        prev.returnPercent ||
        prev.sellingPrice;

      // Если данные шагов 2-4 были заполнены, сбрасываем их
      if (hasSteps2To4Data) {
        resetSteps2To4();
        if (currentStep > 1) {
          setCurrentStep(1);
        }
      }

      if (category) {
        return {
          ...prev,
          category: category.name,
          categoryId: category.id,
          commissionPercent: "",
          commission: "0.00",
        };
      } else {
        return {
          ...prev,
          category: "",
          categoryId: null,
          commissionPercent: "",
          commission: "0.00",
        };
      }
    });

    // Загружаем комиссию после обновления состояния
    if (category) {
      loadCommissionForCategory(category.id);
    }
  }, [currentStep, resetSteps2To4, loadCommissionForCategory]);

  // Обработка выбора категории из найденных
  const handleCategorySelect = useCallback((category: { id: number; name: string }) => {
    handleCategoryChange(category);
    setFoundCategories([]);
  }, [handleCategoryChange]);

  // Поиск категорий по названию товара
  useEffect(() => {
    const searchCategories = async () => {
      if (!debouncedProductName || debouncedProductName.trim().length < 2) {
        setFoundCategories([]);
        return;
      }

      setIsSearchingCategories(true);
      try {
        const response = await fetch(
          `${API_URL}/api/categories/search?name=${encodeURIComponent(debouncedProductName.trim())}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          setFoundCategories(data.data);

          // Если найдена только одна категория - автоматически выбираем её
          if (data.data.length === 1) {
            handleCategorySelect(data.data[0]);
          }
        } else {
          setFoundCategories([]);
        }
      } catch (err) {
        setFoundCategories([]);
      } finally {
        setIsSearchingCategories(false);
      }
    };

    searchCategories();
  }, [debouncedProductName, handleCategorySelect]);

  // Обработчики изменений полей
  const handleFieldChange = (field: keyof FormData, value: string) => {
    // Если изменяется название товара или категория, проверяем наличие данных шагов 2-4
    if (field === "productName" || field === "category") {
      const hasSteps2To4Data =
        formData.purchasePrice ||
        formData.deliveryPricePerKg ||
        formData.weightGrams ||
        formData.packagingCost ||
        formData.otherExpenses ||
        formData.logisticsCost ||
        formData.storageCost ||
        formData.returnPercent ||
        formData.sellingPrice;

      if (hasSteps2To4Data) {
        resetSteps2To4();
        // Если мы не на шаге 1, возвращаемся на него
        if (currentStep > 1) {
          setCurrentStep(1);
        }
      }
    }

    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Если изменилась цена продажи, пересчитываем комиссию в рублях
      if (field === "sellingPrice") {
        const sellingPrice = parseFloat(value) || 0;
        const commissionPercent = parseFloat(prev.commissionPercent) || 0;
        const commissionAmount = (sellingPrice * commissionPercent) / 100;
        newData.commission = commissionAmount.toFixed(2);
      }

      return newData;
    });

    // Убираем ошибку при изменении
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Валидация шага
  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (step === 1) {
      if (!formData.productName.trim()) {
        newErrors.productName = "Введите название товара";
      }
      if (!formData.category) {
        newErrors.category = "Выберите категорию";
      }
    } else if (step === 2) {
      if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
        newErrors.purchasePrice = "Введите стоимость закупки";
      }
    } else if (step === 3) {
      if (!formData.commissionPercent || parseFloat(formData.commissionPercent) < 0) {
        newErrors.commissionPercent = "Комиссия должна быть указана";
      }
    } else if (step === 4) {
      if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
        newErrors.sellingPrice = "Введите цену продажи";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Навигация между шагами
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        const nextStep = currentStep + 1;

        // При переходе на шаг 3 автоматически рассчитываем стоимость хранения
        if (nextStep === 3 && !formData.storageCost) {
          setFormData((prev) => ({
            ...prev,
            storageCost: STORAGE_COST,
          }));
        }

        setCurrentStep(nextStep);
        hapticFeedback("light");
      }
    } else {
      hapticFeedback("error");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;

      // При переходе на шаг 3 автоматически рассчитываем стоимость хранения, если еще не рассчитана
      if (prevStep === 3 && !formData.storageCost) {
        setFormData((prev) => ({
          ...prev,
          storageCost: STORAGE_COST,
        }));
      }

      setCurrentStep(prevStep);
      hapticFeedback("light");
    }
  };

  // Расчет маржи
  const calculateMargin = useCallback(() => {
    if (!validateStep(4)) {
      hapticFeedback("error");
      return;
    }

    hapticFeedback("medium");

    const purchasePrice = parseFloat(formData.purchasePrice) || 0;
    const deliveryCost = formData.deliveryPricePerKg && formData.weightGrams
      ? ((parseFloat(formData.deliveryPricePerKg) || 0) * (parseFloat(formData.weightGrams) || 0)) / 1000
      : 0;
    const packagingCost = parseFloat(formData.packagingCost) || 0;
    const otherExpenses = parseFloat(formData.otherExpenses) || 0;
    const sellingPrice = parseFloat(formData.sellingPrice);
    const commissionPercent = parseFloat(formData.commissionPercent) || 0;
    const commissionAmount = (sellingPrice * commissionPercent) / 100;
    const logisticsCost = parseFloat(formData.logisticsCost) || 0;
    const storageCost = parseFloat(formData.storageCost) || 0;
    const returnPercent = parseFloat(formData.returnPercent) || 0;
    const returnCost = (sellingPrice * returnPercent) / 100;

    const totalCosts = purchasePrice + deliveryCost + packagingCost + otherExpenses + commissionAmount + logisticsCost + returnCost + storageCost;
    const profit = sellingPrice - totalCosts;
    const marginPercent = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
    const markup = purchasePrice > 0 ? ((sellingPrice - purchasePrice) / purchasePrice) * 100 : 0;

    setResult({
      costPrice: purchasePrice + deliveryCost + packagingCost + otherExpenses,
      sellingPrice,
      wbCommission: commissionPercent,
      logistics: logisticsCost,
      storage: storageCost,
      revenue: sellingPrice,
      commissionAmount,
      totalCosts,
      profit,
      marginPercent,
      markup,
    });

    hapticFeedback("success");
  }, [formData, hapticFeedback]);

  // Сброс формы
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setResult(null);
    setErrors({});
    setCurrentStep(1);
    setFoundCategories([]);
    hapticFeedback("light");
  }, [hapticFeedback]);

  // Обработка изменения комиссии
  const handleCommissionChange = useCallback((commission: number) => {
    setFormData((prev) => ({
      ...prev,
      commissionPercent: commission.toString(),
      // Пересчитываем комиссию в рублях, если есть цена продажи
      commission: prev.sellingPrice
        ? ((parseFloat(prev.sellingPrice) * commission) / 100).toFixed(2)
        : "0.00",
    }));
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full" />
      </div>
    );
  }

  // Если есть результат, показываем карточку результата
  if (result) {
    return (
      <div className="min-h-screen pb-8">
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

        <main className="px-4 pt-2">
          <ResultCard result={result} onNewCalculation={resetForm} />
        </main>
      </div>
    );
  }

  // Рассчитываем данные для Step4
  const costData = {
    purchasePrice: parseFloat(formData.purchasePrice) || 0,
    deliveryCost: formData.deliveryPricePerKg && formData.weightGrams
      ? ((parseFloat(formData.deliveryPricePerKg) || 0) * (parseFloat(formData.weightGrams) || 0)) / 1000
      : 0,
    packagingCost: parseFloat(formData.packagingCost) || 0,
    otherExpenses: parseFloat(formData.otherExpenses) || 0,
    logisticsCost: parseFloat(formData.logisticsCost) || 0,
    returnPercent: parseFloat(formData.returnPercent) || 0,
    storageCost: parseFloat(formData.storageCost) || 0,
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 px-4 py-4 backdrop-blur-xl bg-tg-bg/80"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-tg-text">WB Маржа</h1>
              <p className="text-xs text-tg-hint">
                Шаг {currentStep} из 4
              </p>
            </div>
          </div>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="px-3 py-1.5 text-sm text-tg-hint hover:text-tg-text transition-colors"
            >
              ← Назад
            </button>
          )}
        </div>
      </motion.header>

      {/* Progress Bar */}
      <div className="px-4 mb-4">
        <div className="h-1 bg-tg-secondary-bg rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-gradient-to-r from-accent-purple to-accent-pink"
          />
        </div>
      </div>

      {/* Content */}
      <main className="px-4 pt-2">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <Step1
              key="step1"
              productName={formData.productName}
              category={formData.category}
              onProductNameChange={(value) => handleFieldChange("productName", value)}
              onCategoryChange={handleCategoryChange}
              onCommissionChange={handleCommissionChange}
              foundCategories={foundCategories}
              isSearchingCategories={isSearchingCategories}
              onCategorySelect={handleCategorySelect}
              apiUrl={API_URL}
              packageLength={formData.packageLength}
              packageWidth={formData.packageWidth}
              packageHeight={formData.packageHeight}
              packageVolume={formData.packageVolume}
              taxationType={formData.taxationType}
              taxRate={formData.taxRate}
              customTaxRate={formData.customTaxRate}
              onPackageLengthChange={(value) => handleFieldChange("packageLength", value)}
              onPackageWidthChange={(value) => handleFieldChange("packageWidth", value)}
              onPackageHeightChange={(value) => handleFieldChange("packageHeight", value)}
              onPackageVolumeChange={(value) => handleFieldChange("packageVolume", value)}
              onTaxationTypeChange={(value) => handleFieldChange("taxationType", value)}
              onTaxRateChange={(value) => handleFieldChange("taxRate", value)}
              onCustomTaxRateChange={(value) => handleFieldChange("customTaxRate", value)}
              errors={{
                productName: errors.productName,
                category: errors.category,
              }}
            />
          )}

          {currentStep === 2 && (
            <Step2
              key="step2"
              purchasePrice={formData.purchasePrice}
              deliveryPricePerKg={formData.deliveryPricePerKg}
              weightGrams={formData.weightGrams}
              deliveryToYou={formData.deliveryToYou}
              packagingCost={formData.packagingCost}
              otherExpenses={formData.otherExpenses}
              onPurchasePriceChange={(value) => handleFieldChange("purchasePrice", value)}
              onDeliveryPricePerKgChange={(value) => handleFieldChange("deliveryPricePerKg", value)}
              onWeightGramsChange={(value) => handleFieldChange("weightGrams", value)}
              onDeliveryToYouChange={(value) => handleFieldChange("deliveryToYou", value)}
              onPackagingCostChange={(value) => handleFieldChange("packagingCost", value)}
              onOtherExpensesChange={(value) => handleFieldChange("otherExpenses", value)}
              errors={{
                purchasePrice: errors.purchasePrice,
                deliveryPricePerKg: errors.deliveryPricePerKg,
                weightGrams: errors.weightGrams,
                packagingCost: errors.packagingCost,
                otherExpenses: errors.otherExpenses,
              }}
            />
          )}

          {currentStep === 3 && (
            <Step3
              key="step3"
              commissionPercent={formData.commissionPercent}
              logisticsCost={formData.logisticsCost}
              storageCost={formData.storageCost}
              returnPercent={formData.returnPercent}
              onLogisticsCostChange={(value) => handleFieldChange("logisticsCost", value)}
              onReturnPercentChange={(value) => handleFieldChange("returnPercent", value)}
              errors={{
                commission: errors.commission,
                logisticsCost: errors.logisticsCost,
                storageCost: errors.storageCost,
                returnPercent: errors.returnPercent,
              }}
            />
          )}

          {currentStep === 4 && (
            <Step4
              key="step4"
              sellingPrice={formData.sellingPrice}
              commissionPercent={formData.commissionPercent}
              productName={formData.productName}
              category={formData.category}
              onSellingPriceChange={(value) => handleFieldChange("sellingPrice", value)}
              costData={{
                ...costData,
                returnPercent: parseFloat(formData.returnPercent) || 0,
              }}
              onCalculate={calculateMargin}
              result={null}
              onNewCalculation={resetForm}
              errors={{
                sellingPrice: errors.sellingPrice,
              }}
            />
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="pt-6 pb-4"
        >
          <Button size="lg" onClick={handleNext}>
            {currentStep === 4 ? "Рассчитать маржу" : "Далее"}
          </Button>
        </motion.div>
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
