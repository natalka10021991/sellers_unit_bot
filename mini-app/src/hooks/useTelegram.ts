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
    
    if (tg) {
      setWebApp(tg);
      setUser(tg.initDataUnsafe.user || null);
      
      // Инициализируем WebApp
      // Telegram автоматически устанавливает CSS переменные --tg-theme-*
      tg.ready();
      tg.expand();
      
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


