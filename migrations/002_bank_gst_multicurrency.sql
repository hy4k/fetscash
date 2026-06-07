-- ============================================
-- MIGRATION 002: Bank Reconciliation, GST Returns, Multi-Currency Reports
-- Run this in Supabase SQL Editor as a single query
-- ============================================

-- ============================================
-- 1. BANK RECONCILIATION
-- ============================================

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT,
  ifsc_code TEXT,
  swift_code TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN ('Current', 'Savings', 'FCNR', 'NRE', 'NRO', 'Cash')),
  currency TEXT NOT NULL CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP', 'CAD')),
  branch TEXT,
  opening_balance DECIMAL(12, 2) DEFAULT 0,
  current_balance DECIMAL(12, 2) DEFAULT 0,
  as_of_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_number TEXT,
  debit DECIMAL(12, 2) DEFAULT 0,
  credit DECIMAL(12, 2) DEFAULT 0,
  balance DECIMAL(12, 2),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer', 'unknown')),
  matched_invoice_id UUID,
  matched_expense_id UUID,
  matched_payment_id UUID,
  is_reconciled BOOLEAN DEFAULT FALSE,
  import_batch_id TEXT,
  raw_data TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reconciliation_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bank_transaction_id UUID NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  matched_type TEXT NOT NULL CHECK (matched_type IN ('invoice', 'payment', 'expense')),
  matched_id UUID NOT NULL,
  matched_amount DECIMAL(12, 2) NOT NULL,
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. GST RETURNS
-- ============================================

CREATE TABLE IF NOT EXISTS public.gst_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  return_period TEXT NOT NULL, -- MM-YYYY, e.g. "03-2024"
  return_type TEXT NOT NULL CHECK (return_type IN ('GSTR1', 'GSTR3B')),
  filing_due_date DATE,
  filed_date DATE,
  filed_reference TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'filed', 'pending')),
  taxable_value_igst DECIMAL(12, 2) DEFAULT 0,
  taxable_value_cgst DECIMAL(12, 2) DEFAULT 0,
  taxable_value_sgst DECIMAL(12, 2) DEFAULT 0,
  tax_igst DECIMAL(12, 2) DEFAULT 0,
  tax_cgst DECIMAL(12, 2) DEFAULT 0,
  tax_sgst DECIMAL(12, 2) DEFAULT 0,
  total_tax DECIMAL(12, 2) DEFAULT 0,
  total_invoices INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, return_period, return_type)
);

CREATE TABLE IF NOT EXISTS public.gst_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gst_return_id UUID NOT NULL REFERENCES public.gst_returns(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_number TEXT,
  customer_name TEXT,
  taxable_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
  igst DECIMAL(12, 2) DEFAULT 0,
  cgst DECIMAL(12, 2) DEFAULT 0,
  sgst DECIMAL(12, 2) DEFAULT 0,
  total_tax DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. MULTI-CURRENCY EXCHANGE RATES
-- ============================================

CREATE TABLE IF NOT EXISTS public.currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  base_currency TEXT NOT NULL CHECK (base_currency IN ('INR', 'USD', 'EUR', 'GBP', 'CAD')),
  target_currency TEXT NOT NULL CHECK (target_currency IN ('INR', 'USD', 'EUR', 'GBP', 'CAD')),
  rate DECIMAL(12, 6) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, base_currency, target_currency, effective_date)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON public.bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON public.bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_id ON public.bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON public.bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON public.bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciled ON public.bank_transactions(is_reconciled);
CREATE INDEX IF NOT EXISTS idx_reconciliation_matches_bt ON public.reconciliation_matches(bank_transaction_id);
CREATE INDEX IF NOT EXISTS idx_gst_returns_user_period ON public.gst_returns(user_id, return_period);
CREATE INDEX IF NOT EXISTS idx_gst_return_items_return ON public.gst_return_items(gst_return_id);
CREATE INDEX IF NOT EXISTS idx_currency_rates_lookup ON public.currency_rates(user_id, base_currency, target_currency, effective_date);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Convert any invoice/payment amount to INR for a given date
CREATE OR REPLACE FUNCTION public.convert_to_inr(
  p_user_id UUID,
  p_amount DECIMAL,
  p_currency TEXT,
  p_date DATE
) RETURNS DECIMAL AS $$
DECLARE
  v_rate DECIMAL;
BEGIN
  IF p_currency = 'INR' THEN
    RETURN p_amount;
  END IF;
  SELECT rate INTO v_rate
  FROM public.currency_rates
  WHERE user_id = p_user_id
    AND base_currency = p_currency
    AND target_currency = 'INR'
    AND effective_date <= p_date
  ORDER BY effective_date DESC
  LIMIT 1;
  IF v_rate IS NULL THEN
    -- Fallback rates if none stored
    v_rate := CASE p_currency
      WHEN 'USD' THEN 83.0
      WHEN 'EUR' THEN 90.0
      WHEN 'GBP' THEN 105.0
      WHEN 'CAD' THEN 61.0
      ELSE 1.0
    END;
  END IF;
  RETURN p_amount * v_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate monthly multi-currency revenue report
CREATE OR REPLACE FUNCTION public.monthly_revenue_report(
  p_user_id UUID,
  p_year INTEGER
) RETURNS TABLE (
  month TEXT,
  currency TEXT,
  invoice_count BIGINT,
  total_revenue DECIMAL,
  paid_amount DECIMAL,
  pending_amount DECIMAL,
  inr_equivalent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(i.invoice_date, 'Mon') AS month,
    i.currency,
    COUNT(*)::BIGINT AS invoice_count,
    COALESCE(SUM(i.total_amount), 0)::DECIMAL AS total_revenue,
    COALESCE(SUM(i.paid_amount), 0)::DECIMAL AS paid_amount,
    COALESCE(SUM(GREATEST(0, i.total_amount - COALESCE(i.paid_amount, 0))), 0)::DECIMAL AS pending_amount,
    COALESCE(SUM(public.convert_to_inr(p_user_id, i.total_amount, i.currency, i.invoice_date)), 0)::DECIMAL AS inr_equivalent
  FROM public.invoices i
  WHERE i.user_id = p_user_id
    AND EXTRACT(YEAR FROM i.invoice_date) = p_year
    AND i.status != 'cancelled'
  GROUP BY TO_CHAR(i.invoice_date, 'Mon'), i.currency
  ORDER BY MIN(i.invoice_date), i.currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-populate GST return items from invoices for a period
CREATE OR REPLACE FUNCTION public.populate_gst_return(
  p_gst_return_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_period_start DATE;
  v_period_end DATE;
  v_count INTEGER := 0;
BEGIN
  SELECT user_id, TO_DATE(return_period, 'MM-YYYY') INTO v_user_id, v_period_start
  FROM public.gst_returns WHERE id = p_gst_return_id;
  
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  v_period_end := DATE_TRUNC('MONTH', v_period_start) + INTERVAL '1 month' - INTERVAL '1 day';
  
  DELETE FROM public.gst_return_items WHERE gst_return_id = p_gst_return_id;
  
  INSERT INTO public.gst_return_items (
    gst_return_id, invoice_id, invoice_number, customer_name,
    taxable_value, igst, cgst, sgst, total_tax, total_amount
  )
  SELECT
    p_gst_return_id,
    i.id,
    i.invoice_number,
    c.name,
    i.subtotal,
    CASE WHEN c.country != 'India' THEN i.gst_amount ELSE 0 END,
    CASE WHEN c.country = 'India' THEN i.gst_amount / 2 ELSE 0 END,
    CASE WHEN c.country = 'India' THEN i.gst_amount / 2 ELSE 0 END,
    i.gst_amount,
    i.total_amount
  FROM public.invoices i
  JOIN public.customers c ON c.id = i.customer_id
  WHERE i.user_id = v_user_id
    AND i.invoice_date >= v_period_start
    AND i.invoice_date <= v_period_end
    AND i.status != 'cancelled'
    AND i.currency = 'INR'
    AND i.gst_amount > 0;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  UPDATE public.gst_returns
  SET
    taxable_value_igst = (SELECT COALESCE(SUM(taxable_value), 0) FROM public.gst_return_items WHERE gst_return_id = p_gst_return_id AND igst > 0),
    taxable_value_cgst = (SELECT COALESCE(SUM(taxable_value), 0) FROM public.gst_return_items WHERE gst_return_id = p_gst_return_id AND cgst > 0),
    taxable_value_sgst = (SELECT COALESCE(SUM(taxable_value), 0) FROM public.gst_return_items WHERE gst_return_id = p_gst_return_id AND sgst > 0),
    tax_igst = (SELECT COALESCE(SUM(igst), 0) FROM public.gst_return_items WHERE gst_return_id = p_gst_return_id),
    tax_cgst = (SELECT COALESCE(SUM(cgst), 0) FROM public.gst_return_items WHERE gst_return_id = p_gst_return_id),
    tax_sgst = (SELECT COALESCE(SUM(sgst), 0) FROM public.gst_return_items WHERE gst_return_id = p_gst_return_id),
    total_tax = (SELECT COALESCE(SUM(total_tax), 0) FROM public.gst_return_items WHERE gst_return_id = p_gst_return_id),
    total_invoices = v_count,
    updated_at = NOW()
  WHERE id = p_gst_return_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
