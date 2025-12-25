import { InputHTMLAttributes, forwardRef } from "react";
import { motion } from "framer-motion";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  suffix?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, suffix, error, className = "", ...props }, ref) => {
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
              bg-tg-secondary-bg/80 backdrop-blur-sm
              border-2 border-transparent
              rounded-2xl
              text-lg font-medium
              placeholder:text-tg-hint/50
              focus:border-accent-purple/50
              focus:bg-tg-secondary-bg
              transition-all duration-200
              ${error ? "border-red-500/50" : ""}
              ${className}
            `}
            style={{
              color: 'var(--tg-theme-text-color)',
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
