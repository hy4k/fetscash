export interface FetsSalaryData {
  id?: number;
  month: string;
  name: string;
  monthly_salary?: number | null;
  daily_rate?: number | null;
  start_date?: number | null;
  end_date?: number | null;
  leave_days?: number | null;
  ot_hours?: number | null;
  full_days?: number | null;
  half_days?: number | null;
  created_at?: string | null;
  designation?: string | null;
  id_num?: string | null;
  working_days_in_month?: number | null;
  extra_ot_hours?: number | null;
  location?: string | null;
}

export interface FetsExpensesData {
  id?: number;
  created_at?: string;
  name: string;
  amount: number;
  location: string;
  month: string;
  color?: string | null;
  date?: string | null;
  category?: string | null;
}

export interface ProductRow {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  stock_quantity?: number | null;
  category?: string | null;
  sku?: string | null;
  created_at?: string;
}

export interface MonthlyRevenueRow {
  user_id: string;
  month: string;
  currency: string;
  invoice_count: number;
  total_revenue: number;
  paid_amount: number;
  pending_amount: number;
}

export interface SettleUpCycle {
  id: number;
  created_at?: string;
  settled_date?: string | null;
  settlement_method?: string | null;
  mithun_total?: number | null;
  niyas_total?: number | null;
}

export interface SettleUpContribution {
  id: number;
  created_at?: string;
  date?: string | null;
  amount: number;
  description?: string | null;
  contributor?: string | null;
  is_settled?: boolean | null;
  cycle_id?: number | null;
}

export interface ImportBatch {
  id: string;
  user_id: string;
  import_type: 'customers' | 'invoices' | 'expenses' | 'payments' | 'bank_statement';
  file_name: string;
  total_rows: number;
  success_rows: number;
  error_rows: number;
  status: 'processing' | 'completed' | 'failed';
  error_log?: string[];
  created_at: string;
  completed_at?: string;
}

export interface ReconciliationMatch {
  id: string;
  user_id: string;
  bank_transaction_id: string;
  matched_type: 'invoice' | 'payment' | 'expense';
  matched_id: string;
  matched_amount: number;
  status: 'proposed' | 'confirmed' | 'rejected';
  notes?: string;
  created_at?: string;
}
