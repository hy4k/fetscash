# 🔧 Supabase Schema Setup & Migration Execution

Your Supabase project needs one missing table (`exam_types`) and proper RLS policies. Follow these steps to complete the setup.

---

## Step 1: Create Missing exam_types Table

### Method: Supabase Dashboard SQL Editor

1. **Open your project:**
   - Go to: https://app.supabase.com
   - Project: `fcuxncgafmtfmagtzouh`
   - Navigate to: **SQL Editor**

2. **Create new query** and paste this SQL:

```sql
-- Create exam_types table
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

-- Enable RLS
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for exam_types
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exam_types_user_id ON public.exam_types(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_types_status ON public.exam_types(status);
```

3. **Click "Run"** and wait for success message ✅

---

## Step 2: Verify/Create RLS Policies on Other Tables

After `exam_types` is created, verify policies on `payments` table:

```sql
-- RLS Policies for payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

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

-- Create index
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
```

---

## Step 3: Get Your User ID

Once schema is set up, get your user ID for the migration:

### Option A: From Supabase Dashboard
1. Go to: https://app.supabase.com → Your Project
2. Navigate to: **Authentication** → **Users**
3. Find `demo@fets.com`
4. Click to view details
5. Copy the **User ID** (UUID format)

Example: `550e8400-e29b-41d4-a716-446655440000`

### Option B: Query via SQL
In SQL Editor, run:
```sql
SELECT id, email FROM auth.users WHERE email = 'demo@fets.com';
```

The `id` column is your user ID.

---

## Step 4: Run Historical Data Migration

Once you have your user ID and the `exam_types` table is created:

```bash
# Navigate to project root
cd ~/fetscash

# Run migration with your user ID
node scripts/migrate-legacy-data.js YOUR-USER-ID

# Example:
node scripts/migrate-legacy-data.js 550e8400-e29b-41d4-a716-446655440000
```

### Expected Output:
```
✅ Parsed 8 clients
✅ Parsed 43 invoices
✅ Parsed 80 line items
✅ Parsed 12 products

📚 Migrating Exam Types...
✅ Processed 12 exam types

👥 Migrating Customers...
✅ Processed 8 customers

📄 Migrating Invoices...
✅ Migrated 43 invoices

✅ Customers: 8 records
✅ Exam Types: 12 records
✅ Invoices: 43 records

💰 Financial Summary:
   Total Invoiced: ₹6,419,520
   Outstanding: ₹6,419,520
   Overdue: 41 invoices
   Sent: 2 invoices

✅ Migration completed successfully!
```

---

## Step 5: Verify Migration in Dashboard

After migration completes:

1. **Refresh your app:** Press F5 or restart
2. **Check Invoices tab:** Should show 43 historical invoices
3. **Check Dashboard:** Total outstanding should be ₹6,419,520
4. **Check Customers tab:** Should show 8 customers
5. **Check Balance display:** Invoices should show paid amount and balance due

---

## RLS Policy Summary

All tables now have proper Row-Level Security:

| Table | Policies | Purpose |
|-------|----------|---------|
| customers | SELECT, INSERT, UPDATE | Users see only their customers |
| invoices | SELECT, INSERT, UPDATE | Users see only their invoices |
| payments | SELECT, INSERT, UPDATE | Users see only their payments |
| exam_types | SELECT, INSERT, UPDATE | Users see only their exam types |

Each policy ensures: `auth.uid() = user_id`

---

## Troubleshooting

### Error: "relation exam_types does not exist"
**Solution:** Run the `CREATE TABLE` SQL from Step 1 in Supabase Dashboard

### Error: "Invalid login credentials" when testing
**Solution:** The demo@fets.com account may need to be created or has a different password. Use the SQL query in Step 3 Option B to find your user ID directly.

### Error: "User ID is required" when running migration
**Solution:** Make sure you have:
1. Created the exam_types table
2. Retrieved your correct user ID from Supabase
3. Run: `node scripts/migrate-legacy-data.js YOUR-ID-HERE`

### Payment recording not working after migration
**Solution:** Ensure RLS policies on `payments` table are created (Step 2)

---

## What's Next After Migration

### Phase 3A: Reports & Analytics
- Dashboard showing historical revenue
- Customer breakdown
- Monthly trends

### Phase 3B: Bank Reconciliation
- Match invoices to statements
- Record historical payments
- Update references

### Phase 3C: Aging Report
- Overdue tracking
- Days outstanding calculation
- Collection prioritization

---

## Important Notes

✅ **All tables are already created** (customers, invoices, payments)
✅ **Only exam_types is missing** - create it using the SQL above
✅ **RLS policies ensure data isolation** - users only see their own data
✅ **Migration is idempotent** - safe to re-run if needed
✅ **All credentials are configured** - .env file is ready

---

## Files Used

- `.env` - Supabase credentials (created ✅)
- `create-exam-types.sql` - Schema DDL
- `scripts/migrate-legacy-data.js` - Migration script
- `data-import/legacy/` - CSV data files

---

**Status:** Ready for Step 1 (SQL execution in Supabase Dashboard)
**Next:** Execute the SQL from Step 1, then proceed with migration
