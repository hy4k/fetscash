export type LocationType = 'cochin' | 'calicut';

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
  paid_by: string; // Used for Auto-ID (ECK/ECL)
  payment_mode: 'Card' | 'Cash' | 'UPI' | 'Bank Transfer';
  settled_y_n: boolean;
  settled_date?: string | null;
  description: string;
  created_at?: string;
}

export interface FetsTransaction {
  id?: string;
  user_id: string;
  location: LocationType;
  type: 'replenishment' | 'expense' | 'adjustment';
  description: string; // Stores "ID | Category | RealDescription"
  amount: number;
  date: string;
  source_expense_id?: string;
  
  // UI-only properties (parsed from description)
  custom_id?: string;
  category?: string;
  clean_description?: string;
}

export interface User {
  id: string;
  email?: string;
}