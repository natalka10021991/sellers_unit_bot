/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Telegram theme colors
        tg: {
          bg: "var(--tg-theme-bg-color, #1a1a2e)",
          "secondary-bg": "var(--tg-theme-secondary-bg-color, #16213e)",
          text: "var(--tg-theme-text-color, #ffffff)",
          hint: "var(--tg-theme-hint-color, #7a7a7a)",
          link: "var(--tg-theme-link-color, #6c63ff)",
          button: "var(--tg-theme-button-color, #6c63ff)",
          "button-text": "var(--tg-theme-button-text-color, #ffffff)",
        },
        // Custom accent colors
        accent: {
          purple: "#6c63ff",
          pink: "#ff6b9d",
          cyan: "#4ecdc4",
          orange: "#ff8c42",
        },
      },
      fontFamily: {
        sans: [
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      animation: {
        "slide-up": "slideUp 0.4s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
