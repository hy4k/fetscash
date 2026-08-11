-- FETS Accounts backend — run once in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/fcuxncgafmtfmagtzouh/sql/new
-- Creates isolated acc_* tables (does NOT touch the old fets.cash tables).

create table if not exists public.acc_customers (
  id text primary key,
  name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  tax_id text,
  balance numeric not null default 0,
  total_invoices numeric not null default 0,
  unpaid_invoices numeric not null default 0
);

create table if not exists public.acc_products (
  id text primary key,
  name text not null,
  hsn text,
  buy_rate numeric not null default 0,
  sale_rate numeric not null default 0,
  description text,
  tax_list text
);

create table if not exists public.acc_invoices (
  id text primary key,
  invoice_number text not null unique,
  customer_id text,
  customer_name text,
  client_label text,
  reference text,
  invoice_date date,
  due_date date,
  currency text not null default 'INR',
  total_amount numeric not null default 0,
  balance numeric not null default 0,
  paid_amount numeric not null default 0,
  status text not null default 'sent',
  items jsonb,
  location text check (location in ('calicut','cochin') or location is null),
  exchange_rate numeric,
  original_amount numeric,
  original_currency text,
  payment_date date
);

create table if not exists public.acc_payments (
  id text primary key,
  invoice_id text references public.acc_invoices(id) on delete set null,
  payment_date date,
  amount numeric not null default 0,
  amount_inr numeric not null default 0,
  payment_method text,
  reference_number text,
  exchange_rate numeric
);

create table if not exists public.acc_expenses (
  id text primary key,
  date date,
  category text,
  type text,
  location text check (location in ('calicut','cochin') or location is null),
  amount numeric not null default 0,
  paid_by text,
  payment_mode text,
  description text
);

create table if not exists public.acc_cash_transactions (
  id text primary key,
  location text check (location in ('calicut','cochin') or location is null),
  type text not null default 'expense',
  description text,
  amount numeric not null default 0,
  date date
);

create table if not exists public.acc_invoice_centres (
  invoice_id text primary key,
  centre text not null check (centre in ('calicut','cochin'))
);

alter table public.acc_customers enable row level security;
alter table public.acc_products enable row level security;
alter table public.acc_invoices enable row level security;
alter table public.acc_payments enable row level security;
alter table public.acc_expenses enable row level security;
alter table public.acc_cash_transactions enable row level security;
alter table public.acc_invoice_centres enable row level security;

create policy "anon full access" on public.acc_customers for all to anon using (true) with check (true);
create policy "anon full access" on public.acc_products for all to anon using (true) with check (true);
create policy "anon full access" on public.acc_invoices for all to anon using (true) with check (true);
create policy "anon full access" on public.acc_payments for all to anon using (true) with check (true);
create policy "anon full access" on public.acc_expenses for all to anon using (true) with check (true);
create policy "anon full access" on public.acc_cash_transactions for all to anon using (true) with check (true);
create policy "anon full access" on public.acc_invoice_centres for all to anon using (true) with check (true);
