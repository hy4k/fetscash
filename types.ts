export type LocationType = 'cochin' | 'calicut';

// ============================================
// CUSTOMER / CLIENT MANAGEMENT
// ============================================
export interface Customer {
  id: string;
  user_id: string;
  name: string;                    // Company name: Prometric, Pearson Vue, etc.
  contact_person?: string;
  email: string;
  phone?: string;
  address?: string;
  country: 'India' | 'USA' | 'UK' | 'Canada' | 'Other';
  payment_terms: number;           // Days: 30, 45, 60
  currency: 'INR' | 'USD' | 'EUR' | 'GBP' | 'CAD';
  gst_number?: string;             // For Indian customers only
  tan_number?: string;             // For TDS tracking
  status: 'active' | 'inactive';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// EXAM TYPES - Different rates per exam
// ============================================
export interface ExamType {
  id: string;
  user_id: string;
  code: string;                    // Short code: PMI, AWS, GRE, etc.
  name: string;                    // Full name: "PMI Project Management"
  description?: string;
  duration_minutes?: number;
  default_rate_inr: number;        // Base rate in INR
  default_rate_usd: number;        // Base rate in USD
  status: 'active' | 'inactive';
}

// ============================================
// SERVICES - Monthly invoice line items
// ============================================
export interface ServiceLine {
  id?: string;
  exam_type_id?: string;
  exam_type?: ExamType;
  description: string;             // "PMI Certification - 45 candidates"
  quantity: number;                  // Number of exams conducted
  rate: number;                    // Rate per exam (INR or USD)
  amount: number;                  // quantity * rate
  currency: 'INR' | 'USD' | 'EUR' | 'GBP' | 'CAD';
}

// ============================================
// INVOICES
// ============================================
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid';

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;          // INV-2024-001 format
  customer_id: string;
  customer?: Customer;
  invoice_date: string;
  due_date: string;
  service_month: string;           // "January 2024" - which month this invoice covers
  
  // Currency & Totals
  currency: 'INR' | 'USD' | 'EUR' | 'GBP' | 'CAD';
  subtotal: number;
  gst_rate: number;                // 18% for Indian, 0% for foreign
  gst_amount: number;              // Calculated GST
  total_amount: number;            // subtotal + gst_amount
  
  // Foreign remittance tracking
  exchange_rate?: number;          // USD/INR rate at invoice date
  inr_equivalent?: number;         // Total converted to INR
  
  status: InvoiceStatus;
  paid_amount: number;
  paid_date?: string;
  payment_reference?: string;      // Bank reference/UTR number
  
  // TDS tracking (for Indian clients)
  tds_deducted?: number;          // TDS amount deducted
  tds_percentage?: number;         // TDS rate applied
  
  // Documents
  pdf_url?: string;                // Generated PDF path
  supporting_documents?: string[]; // Array of document URLs
  
  // Line items
  service_lines: ServiceLine[];
  
  notes?: string;                  // Internal notes
  terms_and_conditions?: string;
  
  created_at?: string;
  updated_at?: string;
}

// ============================================
// PAYMENTS RECEIVED
// ============================================
export interface Payment {
  id: string;
  user_id: string;
  invoice_id: string;
  invoice?: Invoice;
  payment_date: string;
  amount: number;                  // Amount in invoice currency
  amount_inr: number;              // Converted to INR (for reporting)
  
  // Payment method
  payment_method: 'Bank Transfer' | 'Wire' | 'SWIFT' | 'Cheque' | 'Cash' | 'UPI' | 'Card';
  bank_name: string;               // Federal Bank, etc.
  reference_number: string;        // UTR/SWIFT ref
  
  // Foreign remittance specific
  swift_code?: string;
  sender_bank?: string;
  intermediary_bank?: string;
  foreign_bank_charges?: number;   // Charges deducted by foreign bank
  
  // Conversion details
  exchange_rate?: number;          // Rate applied by bank
  conversion_date?: string;        // Date of conversion
  
  // Documents
  bank_statement_url?: string;     // Screenshot/PDF of bank credit
  proof_of_remittance?: string;      // FIRC (Foreign Inward Remittance Certificate)
  
  notes?: string;
  created_at?: string;
}

// ============================================
// ORIGINAL EXPENSE TRACKING (FETS)
// ============================================
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
  
  // New: Attach receipt
  receipt_url?: string;
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

// ============================================
// BANK ACCOUNTS
// ============================================
export interface BankAccount {
  id: string;
  user_id: string;
  account_name: string;            // "Federal Bank - Current Account"
  bank_name: string;               // Federal Bank
  account_number: string;          // Masked: ****1234
  ifsc_code?: string;              // FDRL000****
  swift_code?: string;             // For foreign remittances
  account_type: 'Current' | 'Savings' | 'FCNR' | 'NRE' | 'NRO';
  currency: 'INR' | 'USD' | 'Multi';
  branch?: string;
  contact_person?: string;
  opening_balance: number;
  current_balance: number;
  as_of_date: string;
  is_active: boolean;
}

export interface BankTransaction {
  id: string;
  user_id: string;
  bank_account_id: string;
  transaction_date: string;
  description: string;
  reference_number?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  transaction_type: 'income' | 'expense' | 'transfer' | 'unknown';
  
  // Reconciliation
  matched_invoice_id?: string;
  matched_expense_id?: string;
  is_reconciled: boolean;
  
  // Import
  import_batch_id?: string;
  raw_data?: string;               // Original CSV data
}

// ============================================
// DATA IMPORT
// ============================================
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

export interface User {
  id: string;
  email?: string;
  company_name?: string;           // "Forum Testing & Educational Services"
  gst_number?: string;               // 32AAIFF5955B1ZO
  pan_number?: string;               // For Indian tax
  address?: string;
  phone?: string;
  logo_url?: string;
}