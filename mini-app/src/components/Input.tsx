import { InputHTMLAttributes, forwardRef, useMemo } from "react";
import { motion } from "framer-motion";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  suffix?: string;
  error?: string;
}

// Функция для определения темы и получения правильных цветов для инпутов
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
    // Инвертируем: используем светлый фон (как bg светлой темы) и темный текст
    return {
      bg: '#ffffff', // Светлый фон (инверсия темного фона)
      text: '#000000', // Темный текст (инверсия светлого текста)
      border: '#e9e9e9',
    };
  } else {
    // Светлая тема Telegram: темный фон инпута + светлый текст
    // Инвертируем: используем темный фон (как bg темной темы) и светлый текст
    return {
      bg: 'rgb(243 243 243)', // Темный фон (инверсия светлого фона)
      text: '#000000', // Светлый текст (инверсия темного текста)
      border: '#e9e9e9',
    };
  }
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, suffix, error, className = "", ...props }, ref) => {
    const inputColors = useMemo(() => getInputColors(), []);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        {label && (
          <label className="block text-sm font-medium text-tg-hint mb-2">
            {icon && <span className="mr-2">{icon}</span>}
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={`
              w-full px-4 py-3.5 
              border-2 border-transparent
              rounded-2xl
              text-lg font-medium
              placeholder:text-tg-hint/50
              focus:border-accent-purple/50
              transition-all duration-200
              ${error ? "border-red-500/50" : ""}
              ${className}
            `}
            style={{
              backgroundColor: inputColors.bg,
              color: inputColors.text,
              borderColor: inputColors.border,
            }}
            {...props}
          />
          {suffix && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tg-hint font-medium">
              {suffix}
            </span>
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
      </motion.div>
    );
  }
);

Input.displayName = "Input";
