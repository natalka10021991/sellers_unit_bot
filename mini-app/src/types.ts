export interface FormData {
  costPrice: number;
  sellingPrice: number;
  wbCommission: number;
  logistics: number;
  storage: number;
}

export interface MarginResult extends FormData {
  revenue: number;
  commissionAmount: number;
  totalCosts: number;
  profit: number;
  marginPercent: number;
  markup: number;
}

