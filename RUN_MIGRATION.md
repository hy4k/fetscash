# 🚀 Running the Legacy Data Migration

Your migration scripts are ready. Follow these steps to import the historical accounting data.

---

## Prerequisites

You need your **Supabase credentials** from your project dashboard:
- `VITE_SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` - Your public anon key
- Your **User ID** from Supabase Auth (UUID format)

These are stored in GitHub Secrets (used for CI/CD). You can find them by:
1. Going to your Supabase Dashboard: https://app.supabase.io
2. Project Settings → API → Project URL and anon key
3. Auth → Users → Copy your user ID

---

## Step 1: Create .env File

Create a `.env` file in the project root:

```bash
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
EOF
```

Replace with your actual Supabase credentials.

---

## Step 2: Run the Migration

Execute the migration script with your user ID:

```bash
# Navigate to project root
cd ~/fetscash

# Run migration (replace UUID with your actual user ID)
node scripts/migrate-legacy-data.js 550e8400-e29b-41d4-a716-446655440000
```

Or use the bash wrapper:

```bash
./scripts/run-migration.sh 550e8400-e29b-41d4-a716-446655440000
```

---

## Expected Output

The script will:
1. ✅ Parse all 6 CSV files from `data-import/legacy/`
2. ✅ Create 12 exam types
3. ✅ Create 8 customers
4. ✅ Create 43 invoices with ~80 line items
5. ✅ Validate and display financial summary:
   ```
   ✅ Customers: 8 records
   ✅ Exam Types: 12 records
   ✅ Invoices: 43 records

   💰 Financial Summary:
      Total Invoiced: ₹6,419,520
      Outstanding: ₹6,419,520
      Overdue: 41 invoices
      Sent: 2 invoices
   ```

---

## Step 3: Verify in Dashboard

After migration completes:
1. Refresh your browser (F5)
2. Click **Invoices** tab
3. Verify all 43 invoices appear
4. Check dashboard shows total outstanding amount

---

## CSV Files Being Imported

The migration reads from: `data-import/legacy/`

- ✅ `Clients.csv` → customers table (8 records)
- ✅ `Products.csv` → exam_types table (12 records)
- ✅ `Invoice.csv` + `InvoiceItems.csv` → invoices table with service_lines (43 invoices, ~80 items)
- ⚪ `Payments.csv` → (empty - no historical payments to import)
- ⚪ `Suppliers.csv` → (empty - not used)

---

## Data Transformations

The migration automatically:
- Converts dates from `DD-MM-YYYY` to `YYYY-MM-DD`
- Infers country from address (India/USA/UK/Canada/Other)
- Maps currency based on country (INR/USD/GBP/CAD)
- Calculates due dates as `invoice_date + 30 days`
- Marks all invoices as `overdue` (since dates are 6+ months old, no payments recorded)
- Extracts service month for reporting (e.g., "March 2026")

---

## Troubleshooting

### Error: "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are required"

**Solution:** Make sure `.env` file exists in project root and has the correct values.

```bash
# Check if .env exists
ls -la .env

# View its contents (check for actual values, not placeholders)
cat .env
```

### Error: "User ID is required as first argument"

**Solution:** Include your Supabase user ID when running the script:

```bash
node scripts/migrate-legacy-data.js YOUR-USER-ID-HERE
```

### Error: "Cannot find module 'csv-parse'"

**Solution:** Install the required dependency:

```bash
npm install csv-parse --save
```

### Error: "Skipping invoice XXX - customer not found"

**Solution:** This means a customer in the CSV doesn't match the exact organization name. The migration continues but skips that invoice. Check `data-import/legacy/Clients.csv` and `Invoice.csv` for name mismatches.

---

## Next Steps After Migration

### Phase 3A: Reports & Analytics
Once migration is complete, we'll build:
- Historical revenue dashboard (Oct 2024 - Mar 2026)
- Customer breakdown & aging analysis
- Monthly trends

### Phase 3B: Bank Reconciliation
- Match invoices to bank statements
- Record historical payments
- Update payment references

### Phase 3C: Aging Report
- Display overdue invoices
- Calculate days outstanding
- Prioritize collection activities

---

## Technical Details

**Migration Script:** `scripts/migrate-legacy-data.js` (Node.js, ~450 lines)
- Standalone Node.js script (no TypeScript build required)
- Reads and parses CSV files synchronously
- Inserts data into Supabase with user_id scoping
- Provides validation summary

**Wrapper Script:** `scripts/run-migration.sh` (Bash)
- Loads environment variables from `.env`
- Installs csv-parse if missing
- Calls Node.js migration script
- Provides post-migration instructions

---

## Questions?

If you encounter issues:
1. Check your Supabase credentials are correct
2. Verify user ID is a valid UUID format
3. Ensure `data-import/legacy/` directory has all 6 CSV files
4. Check browser console for any error messages
