/**
 * Константы для расчетов маржи
 */

// Формула расчета стоимости хранения: 0.16 руб/день × 30 дней
export const STORAGE_COST_PER_DAY = 0.16;
export const STORAGE_DAYS = 30;
export const STORAGE_COST = (STORAGE_COST_PER_DAY * STORAGE_DAYS).toFixed(2);

