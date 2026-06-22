import { Customer, Currency, ServiceLine } from './customer';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid';

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  customer_id: string;
  customer?: Customer;
  invoice_date: string;
  due_date: string;
  service_month: string;
  currency: Currency;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  exchange_rate?: number;
  inr_equivalent?: number;
  status: InvoiceStatus;
  paid_amount: number;
  paid_date?: string;
  payment_reference?: string;
  tds_deducted?: number;
  tds_percentage?: number;
  pdf_url?: string;
  supporting_documents?: string[];
  service_lines: ServiceLine[];
  notes?: string;
  terms_and_conditions?: string;
  created_at?: string;
  updated_at?: string;
}

export type PaymentMethod = 'Bank Transfer' | 'Wire' | 'SWIFT' | 'Cheque' | 'Cash' | 'UPI' | 'Card';

export interface Payment {
  id: string;
  user_id: string;
  invoice_id: string;
  invoice?: Invoice;
  payment_date: string;
  amount: number;
  amount_inr: number;
  payment_method: PaymentMethod;
  bank_name: string;
  reference_number: string;
  swift_code?: string;
  sender_bank?: string;
  intermediary_bank?: string;
  foreign_bank_charges?: number;
  exchange_rate?: number;
  conversion_date?: string;
  bank_statement_url?: string;
  proof_of_remittance?: string;
  notes?: string;
  created_at?: string;
}
