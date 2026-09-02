-- Reimbursement claims (personal spends into the company).
-- Run once in the Supabase SQL editor for project fcuxncgafmtfmagtzouh.

create table if not exists acc_reimbursements (
  id text primary key,
  person text not null,
  date date not null,
  amount numeric not null,
  description text,
  category text,
  receipt_name text,
  receipt_data text,
  settled_on date,
  created_at timestamptz default now()
);

alter table acc_reimbursements enable row level security;

drop policy if exists "anon all" on acc_reimbursements;
create policy "anon all" on acc_reimbursements
  for all to anon using (true) with check (true);
