import { Currency } from './customer';

export type AccountType = 'Current' | 'Savings' | 'FCNR' | 'NRE' | 'NRO' | 'Cash';

export interface BankAccount {
  id: string;
  user_id: string;
  account_name: string;
  bank_name: string;
  account_number?: string;
  ifsc_code?: string;
  swift_code?: string;
  account_type: AccountType;
  currency: Currency;
  branch?: string;
  opening_balance: number;
  current_balance: number;
  as_of_date?: string;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type BankTransactionType = 'income' | 'expense' | 'transfer' | 'unknown';

export interface BankTransaction {
  id: string;
  user_id: string;
  bank_account_id: string;
  transaction_date: string;
  description: string;
  reference_number?: string;
  debit: number;
  credit: number;
  balance?: number;
  transaction_type: BankTransactionType;
  matched_invoice_id?: string | null;
  matched_expense_id?: string | null;
  matched_payment_id?: string | null;
  is_reconciled: boolean;
  import_batch_id?: string;
  raw_data?: string;
  notes?: string;
  created_at?: string;
}
