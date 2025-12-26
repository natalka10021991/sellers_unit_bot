import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "../Input";
import { CategoryAutocomplete } from "../CategoryAutocomplete";
import { Button } from "../Button";

interface Step1Props {
  productName: string;
  category: string;
  onProductNameChange: (value: string) => void;
  onCategoryChange: (category: { id: number; name: string } | null) => void;
  onCommissionChange?: (commission: number) => void;
  foundCategories: Array<{ id: number; name: string }>;
  isSearchingCategories: boolean;
  onCategorySelect: (category: { id: number; name: string }) => void;
  apiUrl: string;
  // Новые поля
  packageLength: string;
  packageWidth: string;
  packageHeight: string;
  packageVolume: string;
  taxationType: string;
  taxRate: string;
  customTaxRate: string;
  onPackageLengthChange: (value: string) => void;
  onPackageWidthChange: (value: string) => void;
  onPackageHeightChange: (value: string) => void;
  onPackageVolumeChange?: (value: string) => void;
  onTaxationTypeChange: (value: string) => void;
  onTaxRateChange: (value: string) => void;
  onCustomTaxRateChange: (value: string) => void;
  errors?: {
    productName?: string;
    category?: string;
  };
}

export function Step1({
  productName,
  category,
  onProductNameChange,
  onCategoryChange,
  onCommissionChange,
  foundCategories,
  isSearchingCategories,
  onCategorySelect,
  apiUrl,
  packageLength,
  packageWidth,
  packageHeight,
  packageVolume,
  taxationType,
  taxRate,
  customTaxRate,
  onPackageLengthChange,
  onPackageWidthChange,
  onPackageHeightChange,
  onPackageVolumeChange,
  onTaxationTypeChange,
  onTaxRateChange,
  onCustomTaxRateChange,
  errors,
}: Step1Props) {
  const [isPackageDimensionsSaved, setIsPackageDimensionsSaved] = useState(false);
  const [isTaxationDropdownOpen, setIsTaxationDropdownOpen] = useState(false);

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

  // Расчет объема при изменении габаритов
  const calculateVolume = () => {
    const length = parseFloat(packageLength) || 0;
    const width = parseFloat(packageWidth) || 0;
    const height = parseFloat(packageHeight) || 0;
    if (length > 0 && width > 0 && height > 0) {
      const volume = (length * width * height) / 1000; // Переводим из см³ в литры
      return volume.toFixed(2);
    }
    return "";
  };

  const handleSaveDimensions = () => {
    if (packageLength && packageWidth && packageHeight) {
      const volume = calculateVolume();
      if (volume && onPackageVolumeChange) {
        onPackageVolumeChange(volume);
      }
      setIsPackageDimensionsSaved(true);
    }
  };

  const taxationOptions = [
    'УСН "Доходы"',
    'УСН "Доходы-расходы"',
    'НПД',
    'ОСН',
    'Другое',
    'Не учитывать'
  ];

  const taxRateOptions = ['6%', '15%', '25%'];
  const showCustomTaxRate = taxationType === 'Другое';
  const showTaxRateSelection = taxationType && taxationType !== 'Не учитывать';

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
          💡 Введите название товара и выберите категорию для начала расчета
        </p>
      </motion.div>

      {/* Название товара */}
      <Input
        label="Название товара"
        icon="📝"
        placeholder="Например: бутылка для воды 1 л"
        value={productName}
        onChange={(e) => onProductNameChange(e.target.value)}
        type="text"
        error={errors?.productName}
      />

      {/* Индикатор поиска категорий */}
      {isSearchingCategories && productName.length >= 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-2 px-4 py-2 bg-accent-purple/10 rounded-xl text-sm text-tg-hint flex items-center gap-2"
        >
          <div className="animate-spin w-4 h-4 border-2 border-accent-purple border-t-transparent rounded-full" />
          Ищем категорию...
        </motion.div>
      )}

      {/* Показываем найденные категории, если их несколько */}
      {foundCategories.length > 1 && !isSearchingCategories && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-accent-purple/10 rounded-xl border border-accent-purple/20"
        >
          <p className="text-sm text-tg-hint mb-2">
            Найдено категорий: {foundCategories.length}
          </p>
          <div className="flex flex-wrap gap-2">
            {foundCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onCategorySelect(cat);
                }}
                className="px-3 py-1.5 bg-accent-purple/20 hover:bg-accent-purple/30 rounded-lg text-sm text-tg-text transition-colors"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Категория товара с autocomplete */}
      <CategoryAutocomplete
        key={category || "empty"} // Пересоздаем компонент при изменении категории
        value={category}
        onChange={onCategoryChange}
        onCommissionChange={onCommissionChange}
        apiUrl={apiUrl}
        error={errors?.category}
        suggestedCategories={foundCategories.length === 1 ? foundCategories : undefined}
      />

      {/* Габариты упаковки */}
      <div className="mt-6">
        <div className="mb-2">
          <label className="block text-sm font-medium text-tg-hint mb-2">
            <span className="mr-2">📦</span>
            Габариты упаковки
          </label>
          <p className="text-xs text-tg-hint mb-3">
            Указывайте внешние размеры упаковки товара в сантиметрах
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <Input
            label="Длина, см"
            placeholder="0"
            value={packageLength}
            onChange={(e) => onPackageLengthChange(e.target.value)}
            type="text"
            inputMode="decimal"
          />
          <Input
            label="Ширина, см"
            placeholder="0"
            value={packageWidth}
            onChange={(e) => onPackageWidthChange(e.target.value)}
            type="text"
            inputMode="decimal"
          />
          <Input
            label="Высота, см"
            placeholder="0"
            value={packageHeight}
            onChange={(e) => onPackageHeightChange(e.target.value)}
            type="text"
            inputMode="decimal"
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <a href="#" className="text-xs text-tg-hint underline">
            Как правильно измерить габариты?
          </a>
          <Button
            size="sm"
            onClick={handleSaveDimensions}
            disabled={!packageLength || !packageWidth || !packageHeight}
          >
            Сохранить
          </Button>
        </div>

        {/* Объем товара в литрах - показывается после сохранения */}
        <AnimatePresence>
          {(isPackageDimensionsSaved || packageVolume) && (packageVolume || calculateVolume()) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4"
            >
              <div className="p-3 rounded-xl bg-tg-secondary-bg/80">
                <p className="text-lg text-tg-hint mb-1">
                  Объем товара в литрах -  <span className="text-lg font-bold text-tg-text">
                    {packageVolume || calculateVolume()} л
                  </span>
                </p>

                <p className="text-xs text-tg-hint mt-1">
                  Рассчитано по формуле: Длина × Ширина × Высота / 1000
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Вид налогообложения */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-tg-hint mb-2">
          <span className="mr-2">📋</span>
          Вид налогообложения
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsTaxationDropdownOpen(!isTaxationDropdownOpen)}
            className="w-full px-4 py-3.5 backdrop-blur-sm border-2 rounded-2xl text-lg font-medium text-left flex items-center justify-between transition-colors"
            style={{
              backgroundColor: getInputColors().bg,
              color: getInputColors().text,
              borderColor: getInputColors().border,
            }}
          >
            <span>{taxationType || "Выберите вид налогообложения"}</span>
            <span style={{ color: getInputColors().text, opacity: 0.6 }}>{isTaxationDropdownOpen ? '▲' : '▼'}</span>
          </button>

          <AnimatePresence>
            {isTaxationDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 w-full mt-2 border rounded-2xl shadow-xl max-h-60 overflow-y-auto"
                style={{
                  backgroundColor: getInputColors().bg,
                  borderColor: getInputColors().border,
                }}
              >
                {taxationOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onTaxationTypeChange(option);
                      setIsTaxationDropdownOpen(false);
                      if (option !== 'Другое' && option !== 'Не учитывать') {
                        onTaxRateChange('');
                      }
                      if (option === 'Не учитывать') {
                        onTaxRateChange('');
                      }
                    }}
                    className="w-full px-4 py-3 text-left transition-colors border-b last:border-0"
                    style={{
                      color: getInputColors().text,
                      borderColor: getInputColors().border,
                    }}
                    onMouseEnter={(e) => {
                      const tg = window.Telegram?.WebApp;
                      const isDark = tg ? tg.colorScheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div className="font-medium">{option}</div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Налоговая ставка */}
      {showTaxRateSelection && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-tg-hint mb-2">
            <span className="mr-2">💰</span>
            Налоговая ставка, %
          </label>

          {showCustomTaxRate ? (
            // Инпут для "Другое"
            <Input
              placeholder="Введите %"
              suffix="%"
              value={customTaxRate}
              onChange={(e) => onCustomTaxRateChange(e.target.value)}
              type="text"
              inputMode="decimal"
            />
          ) : (
            // Радиокнопки
            <div className="space-y-3">
              {taxRateOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer"
                  style={{
                    backgroundColor: getInputColors().bg,
                  }}
                >
                  <input
                    type="radio"
                    name="taxRate"
                    value={option}
                    checked={taxRate === option}
                    onChange={(e) => onTaxRateChange(e.target.value)}
                    className="w-5 h-5 cursor-pointer"
                    style={{
                      accentColor: '#8B5CF6', // accent-purple
                    }}
                  />
                  <span
                    className="text-sm font-medium flex-1"
                    style={{
                      color: getInputColors().text,
                    }}
                  >
                    {option}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

