import { Customer } from './customer';

export type RemittanceStatus = 'invoice_uploaded' | 'firc_ready' | 'firc_submitted' | 'payment_pending' | 'payment_received' | 'reconciled';

export interface ForeignRemittance {
  id: string;
  user_id: string;
  customer_id: string;
  customer?: Customer;
  invoice_number: string;
  invoice_date?: string;
  service_period?: string;
  invoice_pdf_url?: string;
  candidate_count?: number;
  currency: string;
  foreign_amount: number;
  gst_amount: number;
  total_amount: number;
  firc_number?: string;
  firc_date?: string;
  ad_code?: string;
  purpose_code?: string;
  remitter_name?: string;
  remitter_country?: string;
  remitter_bank?: string;
  swift_code?: string;
  beneficiary_account_id?: string;
  beneficiary_name?: string;
  exchange_rate?: number;
  inr_amount?: number;
  foreign_bank_charges?: number;
  status: RemittanceStatus;
  payment_date?: string;
  payment_reference?: string;
  payment_inr_amount?: number;
  payment_id?: string;
  bank_transaction_id?: string;
  firc_document_url?: string;
  bank_statement_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
