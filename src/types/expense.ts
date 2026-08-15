export type LocationType = 'cochin' | 'calicut';
export type PaymentMode = 'Card' | 'Cash' | 'UPI' | 'Bank Transfer';
export type TransactionType = 'replenishment' | 'expense' | 'adjustment';

export interface Category {
  id?: number;
  user_id: string;
  name: string;
}

export interface Expense {
  id?: string;
  user_id: string;
  location: LocationType;
  date: string;
  amount: number;
  category: string;
  paid_by: string;
  payment_mode: PaymentMode;
  settled_y_n: boolean;
  settled_date?: string | null;
  description: string;
  created_at?: string;
  receipt_url?: string;
}

export interface FetsTransaction {
  id?: string;
  user_id: string;
  location: LocationType;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  source_expense_id?: string;
  custom_id?: string;
  category?: string;
  clean_description?: string;
}
