-- ============================================
-- MIGRATION 003: Foreign Remittance Tracker
-- For tracking foreign invoices, FIRC forms & bank deposits
-- ============================================

CREATE TABLE IF NOT EXISTS public.foreign_remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  -- Invoice generated externally
  invoice_number TEXT NOT NULL,
  invoice_date DATE,
  service_period TEXT, -- e.g. "May 2024"
  invoice_pdf_url TEXT,
  candidate_count INTEGER,

  -- Amounts (as per external invoice)
  currency TEXT NOT NULL DEFAULT 'USD',
  foreign_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- FIRC Details
  firc_number TEXT,
  firc_date DATE,
  ad_code TEXT, -- Authorized Dealer Code
  purpose_code TEXT DEFAULT 'P0802', -- Testing services default
  remitter_name TEXT,
  remitter_country TEXT,
  remitter_bank TEXT,
  swift_code TEXT,

  -- Beneficiary (our bank account)
  beneficiary_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  beneficiary_name TEXT,

  -- Exchange details
  exchange_rate DECIMAL(12, 6),
  inr_amount DECIMAL(12, 2),
  foreign_bank_charges DECIMAL(12, 2) DEFAULT 0,

  -- Workflow status
  status TEXT DEFAULT 'invoice_uploaded'
    CHECK (status IN ('invoice_uploaded', 'firc_ready', 'firc_submitted', 'payment_pending', 'payment_received', 'reconciled')),

  -- Payment received
  payment_date DATE,
  payment_reference TEXT,
  payment_inr_amount DECIMAL(12, 2),

  -- Linked records
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  bank_transaction_id UUID REFERENCES public.bank_transactions(id) ON DELETE SET NULL,

  -- Documents
  firc_document_url TEXT,
  bank_statement_url TEXT,

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_foreign_remittances_user ON public.foreign_remittances(user_id);
CREATE INDEX IF NOT EXISTS idx_foreign_remittances_customer ON public.foreign_remittances(customer_id);
CREATE INDEX IF NOT EXISTS idx_foreign_remittances_status ON public.foreign_remittances(status);
CREATE INDEX IF NOT EXISTS idx_foreign_remittances_period ON public.foreign_remittances(service_period);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
