import { motion } from "framer-motion";
import { Input } from "../Input";
import { CategoryAutocomplete } from "../CategoryAutocomplete";

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
  errors,
}: Step1Props) {
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
    </motion.div>
  );
}

