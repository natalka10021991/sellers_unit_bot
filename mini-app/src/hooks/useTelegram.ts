import { useEffect, useState, useCallback } from "react";

// Типы для Telegram WebApp
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface WebApp {
  ready: () => void;
  close: () => void;
  expand: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  initDataUnsafe: {
    user?: TelegramUser;
    start_param?: string;
  };
  colorScheme: "light" | "dark";
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: WebApp;
    };
  }
}

export function useTelegram() {
  const [webApp, setWebApp] = useState<WebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    
    // Функция для нормализации цвета (Telegram может передавать с # или без)
    const normalizeColor = (color?: string): string | undefined => {
      if (!color) return undefined;
      // Если цвет уже начинается с #, возвращаем как есть
      if (color.startsWith('#')) return color;
      // Если это hex без #, добавляем #
      if (/^[0-9A-Fa-f]{6}$/.test(color)) return `#${color}`;
      // Иначе возвращаем как есть (может быть rgb/rgba)
      return color;
    };

    // Функция для применения цветов
    const applyThemeColors = () => {
      if (!tg?.themeParams) return;
      
      const root = document.documentElement;
      const bgColor = normalizeColor(tg.themeParams.bg_color);
      const secondaryBgColor = normalizeColor(tg.themeParams.secondary_bg_color);
      const textColor = normalizeColor(tg.themeParams.text_color);
      const hintColor = normalizeColor(tg.themeParams.hint_color);
      const linkColor = normalizeColor(tg.themeParams.link_color);
      const buttonColor = normalizeColor(tg.themeParams.button_color);
      const buttonTextColor = normalizeColor(tg.themeParams.button_text_color);

      if (bgColor) root.style.setProperty('--tg-theme-bg-color', bgColor);
      if (secondaryBgColor) root.style.setProperty('--tg-theme-secondary-bg-color', secondaryBgColor);
      if (textColor) {
        root.style.setProperty('--tg-theme-text-color', textColor);
        // Применяем цвет напрямую ко всем инпутам
        document.querySelectorAll('input').forEach((input) => {
          (input as HTMLElement).style.color = textColor;
        });
      }
      if (hintColor) root.style.setProperty('--tg-theme-hint-color', hintColor);
      if (linkColor) root.style.setProperty('--tg-theme-link-color', linkColor);
      if (buttonColor) root.style.setProperty('--tg-theme-button-color', buttonColor);
      if (buttonTextColor) root.style.setProperty('--tg-theme-button-text-color', buttonTextColor);
    };
    
    if (tg) {
      setWebApp(tg);
      setUser(tg.initDataUnsafe.user || null);
      
      // Инициализируем WebApp
      tg.ready();
      tg.expand();
      
      // Применяем цвета сразу
      applyThemeColors();
      
      // Слушаем изменения темы
      if (tg.onEvent) {
        tg.onEvent('themeChanged', applyThemeColors);
      }
      
      setIsReady(true);
    } else {
      // Для тестирования вне Telegram
      setIsReady(true);
      setUser({
        id: 123456789,
        first_name: "Тест",
        username: "test_user",
      });
    }
  }, []);

  const hapticFeedback = useCallback(
    (type: "light" | "medium" | "heavy" | "success" | "error" | "warning") => {
      if (!webApp?.HapticFeedback) return;
      
      if (type === "success" || type === "error" || type === "warning") {
        webApp.HapticFeedback.notificationOccurred(type);
      } else {
        webApp.HapticFeedback.impactOccurred(type);
      }
    },
    [webApp]
  );

  const closeApp = useCallback(() => {
    webApp?.close();
  }, [webApp]);

  return {
    webApp,
    user,
    isReady,
    hapticFeedback,
    closeApp,
    MainButton: webApp?.MainButton,
    BackButton: webApp?.BackButton,
  };
}


