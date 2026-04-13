-- ============================================
-- COMPLETE SCHEMA FOR FETSCASH
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. EXAM TYPES TABLE
CREATE TABLE IF NOT EXISTS public.exam_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  default_rate_inr DECIMAL(10, 2) NOT NULL,
  default_rate_usd DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, code)
);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  country TEXT NOT NULL CHECK (country IN ('India', 'USA', 'UK', 'Canada', 'Other')),
  payment_terms INTEGER DEFAULT 30,
  currency TEXT NOT NULL CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP', 'CAD')),
  gst_number TEXT,
  tan_number TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- 3. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  service_month TEXT,
  currency TEXT NOT NULL CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP', 'CAD')),
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  gst_rate DECIMAL(5, 2) DEFAULT 0,
  gst_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  exchange_rate DECIMAL(10, 4),
  inr_equivalent DECIMAL(12, 2),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'partially_paid')),
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  paid_date DATE,
  payment_reference TEXT,
  tds_deducted DECIMAL(12, 2),
  tds_percentage DECIMAL(5, 2),
  pdf_url TEXT,
  supporting_documents TEXT[],
  service_lines JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  terms_and_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, invoice_number)
);

-- 4. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'verified', 'reconciled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - EXAM TYPES
-- ============================================

DROP POLICY IF EXISTS "Users can view own exam types" ON public.exam_types;
CREATE POLICY "Users can view own exam types"
  ON public.exam_types FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own exam types" ON public.exam_types;
CREATE POLICY "Users can create own exam types"
  ON public.exam_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own exam types" ON public.exam_types;
CREATE POLICY "Users can update own exam types"
  ON public.exam_types FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own exam types" ON public.exam_types;
CREATE POLICY "Users can delete own exam types"
  ON public.exam_types FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - CUSTOMERS
-- ============================================

DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
CREATE POLICY "Users can view own customers"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own customers" ON public.customers;
CREATE POLICY "Users can create own customers"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own customers" ON public.customers;
CREATE POLICY "Users can update own customers"
  ON public.customers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own customers" ON public.customers;
CREATE POLICY "Users can delete own customers"
  ON public.customers FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - INVOICES
-- ============================================

DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own invoices" ON public.invoices;
CREATE POLICY "Users can create own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
CREATE POLICY "Users can update own invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own invoices" ON public.invoices;
CREATE POLICY "Users can delete own invoices"
  ON public.invoices FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - PAYMENTS
-- ============================================

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own payments" ON public.payments;
CREATE POLICY "Users can create own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
CREATE POLICY "Users can update own payments"
  ON public.payments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_exam_types_user_id ON public.exam_types(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_types_status ON public.exam_types(status);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_country ON public.customers(country);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON public.invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);

-- ============================================
-- SCHEMA SETUP COMPLETE
-- ============================================
-- All tables created with RLS policies and indexes
-- Ready for historical data migration
