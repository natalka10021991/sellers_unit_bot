import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Функция для определения темы и получения правильных цветов для инпутов
const getInputColors = () => {
  const tg = window.Telegram?.WebApp;
  if (!tg) {
    return {
      bg: '#1a1a2e',
      text: '#ffffff',
    };
  }

  const isDark = tg.colorScheme === 'dark';

  if (isDark) {
    return {
      bg: '#ffffff',
      text: '#000000',
    };
  } else {
    return {
      bg: '#1a1a2e',
      text: '#ffffff',
    };
  }
};

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
  suggestedCategories?: Array<{ id: number; name: string }>;
}

export function CategoryAutocomplete({
  value,
  onChange,
  onCommissionChange,
  apiUrl = "http://localhost:3000",
  error,
  suggestedCategories,
}: CategoryAutocompleteProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [inputValue, setInputValue] = useState<string>(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputColors = useMemo(() => getInputColors(), []);

  // Фильтруем категории с помощью useMemo (без useEffect)
  const filteredCategories = useMemo(() => {
    // Не фильтруем, если категория уже выбрана
    if (selectedCategory && inputValue === selectedCategory.name) {
      return categories;
    }

    if (inputValue.trim() === "") {
      return categories;
    }

    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [inputValue, categories, selectedCategory]);

  // Загружаем категории при монтировании
  useEffect(() => {
    loadCategories();
  }, []);

  // Если переданы предложенные категории (из поиска по названию товара), используем их
  useEffect(() => {
    if (suggestedCategories && suggestedCategories.length > 0) {
      const mappedCategories: Category[] = suggestedCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        parent: "",
      }));
      setCategories(mappedCategories);
    }
  }, [suggestedCategories]);

  // Синхронизируем inputValue с внешним value и закрываем список
  useEffect(() => {
    // Если value изменился и не пустой - закрываем список и обновляем состояние
    if (value && value.trim() !== "") {
      setInputValue(value);

      // Ищем категорию в списках (если они уже загружены)
      const foundCategory = categories.find((cat) => cat.name === value);
      if (foundCategory) {
        setSelectedCategory(foundCategory);
      }

      // ВСЕГДА закрываем список при установке value извне
      setIsOpen(false);
      // Используем setTimeout чтобы гарантировать закрытие после всех обновлений
      setTimeout(() => {
        inputRef.current?.blur();
        setIsOpen(false); // Дополнительная проверка
      }, 0);
    } else if (!value || value.trim() === "") {
      setInputValue(value);
      setSelectedCategory(null);
      setIsOpen(false);
    }
  }, [value]);




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
      setIsLoading(false);
      setCategories([]);
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
      } else {
        setCategories([]);
      }
    } catch (err: any) {
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = useCallback(
    async (category: Category) => {
      setSelectedCategory(category);
      setInputValue(category.name);
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
          // Ошибка загрузки комиссии - игнорируем
        }
      }
    },
    [onChange, onCommissionChange, apiUrl]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Если пользователь изменил текст, сбрасываем выбранную категорию
    if (selectedCategory && newValue !== selectedCategory.name) {
      setSelectedCategory(null);
      onChange(null);
    }

    // Открываем список при вводе
    setIsOpen(newValue.trim() !== "");
  };

  const handleInputFocus = () => {
    // Не открываем список, если категория уже выбрана или value установлен
    if (selectedCategory || (value && value.trim() !== "")) {
      setIsOpen(false);
      return;
    }
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
          value={selectedCategory?.name || inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder="Начните вводить название категории..."
          className={`
            w-full px-4 py-3.5 
            border-2 border-transparent
            rounded-2xl
            text-lg font-medium
            placeholder:text-tg-hint/50
            focus:border-accent-purple/50
            transition-all duration-200
            ${error ? "border-red-500/50" : ""}
            ${isLoading ? "opacity-50" : ""}
          `}
          style={{
            backgroundColor: inputColors.bg,
            color: inputColors.text,
          }}
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
              setInputValue("");
              onChange(null);
              if (inputRef.current) {
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
              max-h-80 overflow-y-auto
              overscroll-contain
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

      {isOpen && filteredCategories.length === 0 && inputValue && !isLoading && (
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

