export type LocationType = 'Cochin' | 'Calicut';
export type PartnerType = 'Mithun' | 'Niyas' | 'Company';
export type CardType = 'FETS Money' | 'FETS Card' | 'FETS Currency' | 'FETS Premier';

export interface Employee {
  id: string;
  name: string;
  email: string;
  designation?: string | null;
  department?: string | null;
  join_date?: string | null;
  phone?: string | null;
  location?: string | null;
  card_type: CardType;
  card_number: string;
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface SalaryRecord {
  id?: string;
  employee_id: string;
  month: string;
  working_days_in_month?: number | null;
  full_days?: number | null;
  half_days?: number | null;
  leave_days?: number | null;
  ot_hours?: number | null;
  extra_ot_hours?: number | null;
  toil_hours?: number | null;
  monthly_salary?: number | null;
  daily_rate?: number | null;
  gross_salary?: number | null;
  deductions?: number | null;
  net_salary?: number | null;
  basis?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SalaryBreakdown {
  grossSalary: number;
  deductions: number;
  netSalary: number;
  workedUnits: number;
  basis: string;
}

export interface Expense {
  id?: string;
  amount: number;
  description: string;
  date: string;
  location: LocationType;
  paid_by: PartnerType;
  category: string;
  is_recurring?: boolean;
  created_at?: string;
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

export interface MonthlyPartnerSummary {
  month: string;
  mithunTotal: number;
  niyasTotal: number;
  companyTotal: number;
  grandTotal: number;
  equalShare: number;
  mithunOwes: number;
  niyasOwes: number;
  settlementRequired: boolean;
}

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
