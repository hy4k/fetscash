import { Currency } from './customer';

export interface CurrencyRate {
  id: string;
  user_id: string;
  base_currency: Currency;
  target_currency: Currency;
  rate: number;
  effective_date: string;
  source?: string;
  notes?: string;
  created_at?: string;
}

export interface MonthlyCurrencyReportRow {
  month: string;
  currency: string;
  invoice_count: number;
  total_revenue: number;
  paid_amount: number;
  pending_amount: number;
  inr_equivalent: number;
}
