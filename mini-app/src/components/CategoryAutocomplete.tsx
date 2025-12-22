import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Category {
  id: number;
  name: string;
  parent: string;
}

interface CategoryAutocompleteProps {
  value: string;
  onChange: (category: Category | null) => void;
  onCommissionChange?: (commission: number) => void;
  apiUrl?: string;
  error?: string;
}

export function CategoryAutocomplete({
  value,
  onChange,
  onCommissionChange,
  apiUrl = "http://localhost:3000",
  error,
}: CategoryAutocompleteProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Загружаем категории при монтировании
  useEffect(() => {
    loadCategories();
  }, []);

  // Фильтруем категории при изменении значения
  useEffect(() => {
    if (value.trim() === "") {
      setFilteredCategories(categories.slice(0, 10)); // Показываем первые 10
      return;
    }

    const filtered = categories
      .filter((cat) =>
        cat.name.toLowerCase().includes(value.toLowerCase())
      )
      .slice(0, 10); // Ограничиваем 10 результатами

    setFilteredCategories(filtered);
  }, [value, categories]);

  // Закрываем dropdown при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadCategories = async () => {
    // Если API URL не задан или пустой - пропускаем загрузку, но показываем компонент
    if (!apiUrl || apiUrl === "" || (apiUrl.includes("localhost") && window.location.hostname !== "localhost")) {
      console.warn("API URL не настроен для Telegram Mini App. Категории будут недоступны, но можно ввести вручную.");
      setIsLoading(false);
      // Показываем пустой список, чтобы пользователь мог ввести категорию вручную
      setCategories([]);
      setFilteredCategories([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/categories`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setCategories(data.data);
        setFilteredCategories(data.data.slice(0, 10));
      } else {
        console.error("Ошибка загрузки категорий:", data.error);
        // Если API недоступен, показываем компонент, но без категорий
        // Пользователь все равно может ввести категорию вручную
        setCategories([]);
        setFilteredCategories([]);
      }
    } catch (err: any) {
      console.error("Ошибка при загрузке категорий:", err);
      console.warn("Компонент будет работать в режиме ручного ввода");
      // Не скрываем компонент при ошибке - пользователь может ввести вручную
      setCategories([]);
      setFilteredCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = useCallback(
    async (category: Category) => {
      setSelectedCategory(category);
      onChange(category);
      setIsOpen(false);
      inputRef.current?.blur();

      // Загружаем комиссию для выбранной категории
      if (onCommissionChange) {
        try {
          const response = await fetch(
            `${apiUrl}/api/commission/${category.id}`
          );
          const data = await response.json();

          if (data.success) {
            onCommissionChange(data.data.commission);
          }
        } catch (err) {
          console.error("Ошибка при загрузке комиссии:", err);
        }
      }
    },
    [onChange, onCommissionChange, apiUrl]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!selectedCategory || newValue !== selectedCategory.name) {
      setSelectedCategory(null);
      onChange(null);
    }
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className="relative mb-4">
      <label className="block text-sm font-medium text-tg-hint mb-2">
        <span className="mr-2">📦</span>
        Категория товара
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={selectedCategory?.name || value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder="Начните вводить название категории..."
          className={`
            w-full px-4 py-3.5 
            bg-tg-secondary-bg/80 backdrop-blur-sm
            border-2 border-transparent
            rounded-2xl
            text-tg-text text-lg font-medium
            placeholder:text-tg-hint/50
            focus:border-accent-purple/50
            focus:bg-tg-secondary-bg
            transition-all duration-200
            ${error ? "border-red-500/50" : ""}
            ${isLoading ? "opacity-50" : ""}
          `}
          disabled={isLoading}
        />

        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="animate-spin w-5 h-5 border-2 border-accent-purple border-t-transparent rounded-full" />
          </div>
        )}

        {selectedCategory && !isOpen && (
          <button
            type="button"
            onClick={() => {
              setSelectedCategory(null);
              onChange(null);
              if (inputRef.current) {
                inputRef.current.value = "";
                inputRef.current.focus();
              }
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-tg-hint hover:text-tg-text transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && filteredCategories.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="
              absolute z-50 w-full mt-2
              bg-tg-secondary-bg border border-white/10
              rounded-2xl shadow-xl
              max-h-64 overflow-y-auto
            "
          >
            {filteredCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleSelect(category)}
                className={`
                  w-full px-4 py-3 text-left
                  hover:bg-accent-purple/10
                  transition-colors
                  border-b border-white/5 last:border-0
                  ${selectedCategory?.id === category.id ? "bg-accent-purple/20" : ""}
                `}
              >
                <div className="text-tg-text font-medium">{category.name}</div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && filteredCategories.length === 0 && value && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="
            absolute z-50 w-full mt-2
            bg-tg-secondary-bg border border-white/10
            rounded-2xl p-4 text-center
            text-tg-hint
          "
        >
          Категория не найдена
        </motion.div>
      )}
    </div>
  );
}

