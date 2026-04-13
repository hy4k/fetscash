# 📊 Historical Data Migration Plan - fetscash

## Executive Summary
**Source:** Legacy accounting system (6 CSV files)
**Target:** fetscash platform (Supabase)
**Data Period:** October 2024 - March 2026 (6 months of invoices)
**Total Records:** 43 invoices, 8 customers, 12 exam types, ~80 line items

---

## 📋 Source Data Analysis

### 1. **Clients.csv** (8 records)
| Organization | Country | Currency | Tax ID | Balance | Total Invoices |
|---|---|---|---|---|---|
| PROMETRIC B.V | Netherlands | Foreign | - | ₹4,725,735 | 13 |
| ETS Digital LLC | USA | Foreign | - | ₹13,087 | 4 |
| ETS India Pvt Ltd | India | INR | 06AAGCE5881J1ZA | ₹387,040 | 14 |
| NCS PEARSON INCORP | USA | Foreign | - | ₹428,577 | 6 |
| Pearson Vue | India | INR | - | ₹0 | 0 |
| Planet EDU Exams | India | INR | 32AAGCP0307G1Z0 | ₹76,700 | 2 |
| Elance Learning Provider | India | INR | 32AAFCE9145C1ZY | ₹81,420 | 2 |
| Vsion Tech Park Pvt Ltd | India | INR | 29AAFCV9109B1ZA | ₹70,800 | 1 |

**Mapping Strategy:**
- → `customers` table
- Country field maps to existing enum ('India' | 'USA' | 'UK' | 'Canada' | 'Other')
- GST Number: Use Tax ID for Indian customers
- Payment Terms: Default to 30 days (legacy data doesn't specify)
- Status: All marked as 'active'

---

### 2. **Invoice.csv** (43 records)
Sample data:
```
Invoice#  | Organization      | Amount    | Date       | Due Date | Balance
CP-09     | PROMETRIC B.V     | ₹1,804    | 11-03-2026 | -        | ₹1,804
CP-08     | PROMETRIC B.V     | ₹275,370  | 10-01-2026 | -        | ₹275,370
PSI-04    | ETS Digital LLC   | ₹4,719    | 05-01-2026 | -        | ₹4,719
```

**Mapping Strategy:**
- `invoice_number` → Invoice No.
- `invoice_date` → Created Date (format: DD-MM-YYYY → YYYY-MM-DD)
- `due_date` → Currently blank in legacy, use invoice_date + 30 days as default
- `currency` → Infer from Customer (INR for India, USD for USA/foreign)
- `total_amount` → Gross Amount (Amount + Tax)
- `gst_amount` → Tax Amount (where applicable)
- `gst_rate` → 18% for some, 0% for others (foreign)
- `status` → Infer from payment data:
  - No payment record + Date < Today → 'overdue'
  - No payment record + Date ≥ Today → 'sent'
  - Payment exists → 'paid' or 'partially_paid'
- `paid_amount` → From Payments.csv (0 for all since it's empty)
- `service_month` → Extract from invoice date (e.g., "March 2026", "January 2026")

**Date Range:**
- Earliest: October 2024 (B-11, B-12, B-13)
- Latest: March 2026 (CP-09)
- Total: 43 invoices over 6 months

---

### 3. **InvoiceItems.csv** (80+ line items)
Sample:
```
Invoice# | Description      | Qty | Rate  | Tax% | Tax Amount | Amount
CP-09    | ICMA Exam Fees   | 1   | 1,804 | 0%   | 0          | 1,804
CE-08    | TOEFL           | 16  | 1,000 | 18%  | 2,880      | 18,880
CE-08    | GRE             | 4   | 1,000 | 18%  | 720        | 4,720
```

**Mapping Strategy:**
- → `service_lines` (array within Invoice)
- `exam_type_id` → Match by description to Products (TOEFL, GRE, ICMA, MRCA, PSI, etc.)
- `description` → "Add Item" field
- `quantity` → Qty
- `rate` → Rate
- `currency` → Infer from Invoice's currency
- `amount` → Amount (Qty × Rate)
- HSN/SAC codes preserved for tax tracking

---

### 4. **Products.csv** (12 exam types)
| Product | Rate | Tax Rate | HSN/SAC |
|---|---|---|---|
| TOEFL | ₹1,000 | 18% | 999295 |
| GRE | ₹1,000 | 18% | 999295 |
| ICMA Exam Reg | ₹10 | 0% | - |
| MRCA Exam | Variable | 0% | - |
| PSI Exam | ₹7 | 0% | - |
| CMA US Mock | ₹1,500 | 18% | - |
| ACCA CBT | ₹300 | 0% | - |
| IELTS Paper | ₹35,000 | 18% | 999295 |
| TOEIC | ₹1,000 | 18% | 999295 |
| Additional Expense | ₹10,000 | 0% | - |

**Mapping Strategy:**
- → `exam_types` table
- `code` → Derived from product name (TOEFL, GRE, ICMA, etc.)
- `name` → Product Name
- `default_rate_inr` → Sale Rate (converted if foreign)
- `default_rate_usd` → Estimate using ₹83/USD conversion
- `status` → 'active' for all current products

---

### 5. **Payments.csv** (Empty)
Headers only, no payment records. This means:
- All 43 invoices are currently unpaid
- Outstanding balance = ₹6.4 Million (cumulative)

---

## 🔄 Migration Workflow

### Phase 1: Prepare & Validate
- [ ] Export CSV files to current working directory: `/fetscash/data-import/legacy/`
- [ ] Create migration script: `/fetscash/scripts/migrate-legacy-data.ts`
- [ ] Validate data integrity (dates, amounts, customer references)
- [ ] Create backup of production database

### Phase 2: Import Exam Types (ExamTypes)
```
Sequence:
1. TOEFL (HSN 999295)
2. GRE (HSN 999295)
3. ICMA Exam Registration
4. MRCA Exam
5. PSI Exam
6. CMA US Mock
7. ACCA CBT
8. IELTS Paper
9. TOEIC (HSN 999295)
10. Additional Expense
11-12. Other seasonal exams
```

### Phase 3: Import Customers (Customers)
```
Sequence:
1. Match organization names exactly
2. Infer country from address/contact details
3. Set currency based on country
4. Extract GST/Tax IDs for Indian customers
5. Create inactive placeholder for "Shilpa T" (individual)
```

### Phase 4: Import Invoices (Invoices)
```
Sequence:
1. Create invoice with calculated fields:
   - Generate invoice_number (preserve existing: CP-09, PSI-04, etc.)
   - invoice_date: Parse DD-MM-YYYY → YYYY-MM-DD
   - due_date: invoice_date + 30 days (legacy doesn't specify)
   - currency: Infer from customer
   - service_month: Extract from date
   - status: 'overdue' (all unpaid + past due date)
   - paid_amount: 0 (no payments in legacy)
   - gst_rate: From InvoiceItems (18% or 0%)
   - gst_amount: Calculate from line items
   - subtotal: Sum of line items before tax
   - total_amount: subtotal + gst_amount

2. Add service_lines (from InvoiceItems):
   - exam_type_id: Match by product name
   - description: Product + any notes
   - quantity: From Qty field
   - rate: From Rate field
   - amount: Calculate (Qty × Rate)
   - currency: Same as invoice
```

### Phase 5: Import Line Items (ServiceLines)
- Attached to each invoice via service_lines array
- Match products by name to exam_types

### Phase 6: Validate & Reconcile
- [ ] Verify customer count: 8
- [ ] Verify invoice count: 43
- [ ] Verify line item count: ~80
- [ ] Verify grand total: ₹6.4M outstanding
- [ ] Check date range: Oct 2024 - Mar 2026

---

## 📊 Financial Summary (Validation)

| Metric | Count | Amount (₹) |
|---|---|---|
| Total Invoices | 43 | 6,419,520 |
| Invoices (Paid) | 0 | 0 |
| Invoices (Outstanding) | 43 | 6,419,520 |
| Invoices (Overdue) | 41 | ~6.3M |
| Invoices (Sent) | 2 | ~100K |

**Top Customers by Revenue:**
1. PROMETRIC B.V: ₹4,725,735 (13 invoices)
2. ETS India Pvt Ltd: ₹387,040 (14 invoices)
3. NCS PEARSON: ₹428,577 (6 invoices)
4. Planet EDU: ₹76,700 (2 invoices)

---

## ⚠️ Data Quality Issues & Handling

### Issue 1: Missing Due Dates
- **Problem:** Legacy system shows "-" for due dates
- **Solution:** Use invoice_date + 30 days (standard payment terms)
- **Impact:** Medium (affects age calculations)

### Issue 2: Inconsistent Customer Names
- **Problem:** "Pearson Vue" vs "NCS PEARSON INCORPORATED" (same entity?)
- **Solution:** Keep separate; flag for manual review post-migration
- **Impact:** Low (reporting clarity issue)

### Issue 3: Empty Payments.csv
- **Problem:** No historical payment records available
- **Solution:** Mark all invoices as 'overdue' status; users can manually record payments
- **Impact:** High (lost payment history, but recoverable)

### Issue 4: Currency Detection
- **Problem:** No explicit currency field in legacy data
- **Solution:** Infer from customer country + address
- **Impact:** Low (mapping is clear for 8 customers)

### Issue 5: Missing Service Month Descriptors
- **Problem:** Legacy doesn't store "billing month" explicitly
- **Solution:** Extract from invoice_date (e.g., "March 2026" from 11-03-2026)
- **Impact:** Low (can be reconstructed from dates)

---

## 🛠️ Implementation Checklist

### Step 1: Setup
- [ ] Create `/fetscash/scripts/migrate-legacy-data.ts`
- [ ] Copy CSV files to `/fetscash/data-import/legacy/`
- [ ] Setup CSV parsing (using `csv-parse` or similar)

### Step 2: Data Transformation
- [ ] Parse Clients.csv → Customer records
- [ ] Parse Products.csv → ExamType records
- [ ] Parse Invoice.csv + InvoiceItems.csv → Invoice + ServiceLines

### Step 3: Database Insertion
- [ ] Insert exam_types (idempotent: skip if exists)
- [ ] Insert customers (with user_id = current logged-in user)
- [ ] Insert invoices with nested service_lines
- [ ] Set status: 'overdue' for all (since all unpaid + past due)

### Step 4: Validation
- [ ] Verify all 43 invoices exist
- [ ] Check totals match legacy system (₹6.4M)
- [ ] Validate customer-invoice relationships
- [ ] Confirm line items are attached

### Step 5: Post-Migration Review
- [ ] Dashboard shows 43 invoices, 43 outstanding, ₹6.4M
- [ ] Reports show historical revenue by month/customer
- [ ] Manual payment entry ready (users can record what was paid)

---

## 🎯 Next Steps After Migration

1. **Phase 3A: Reports & Analytics**
   - Historical revenue dashboard (2024-2026)
   - Customer breakdown & aging analysis
   - Monthly trends

2. **Phase 3B: Bank Reconciliation**
   - Match statement entries to these invoices
   - Record historical payments (if bank statement provided)
   - Update payment_reference with any available data

3. **Phase 3C: Aging Report**
   - Show overdue invoices (most are >6 months old)
   - Calculate days outstanding
   - Prioritize collection

---

## 📝 Migration Script Pseudocode

```typescript
// 1. Read CSV files
const clients = parseCSV('Clients.csv')
const products = parseCSV('Products.csv')
const invoices = parseCSV('Invoice.csv')
const items = parseCSV('InvoiceItems.csv')

// 2. Transform to schema
const examTypes = products.map(p => ({
  code: generateCode(p.name),
  name: p.name,
  default_rate_inr: parseFloat(p.rate),
  status: 'active'
}))

const customers = clients.map(c => ({
  name: c['Organization Name'],
  country: inferCountry(c.Address),
  email: c.Email || 'noemail@example.com',
  currency: c.country === 'India' ? 'INR' : 'USD',
  gst_number: c['Tax ID'] || null,
  status: 'active'
}))

const invoiceRecords = invoices.map(inv => {
  const customer = customers.find(c => c.name === inv['Organization Name'])
  const lineItems = items.filter(i => i['Invoice No.'] === inv['Invoice No.'])

  return {
    invoice_number: inv['Invoice No.'],
    invoice_date: parseDate(inv['Created Date']),
    due_date: addDays(parseDate(inv['Created Date']), 30),
    customer_id: customer.id,
    currency: customer.currency,
    subtotal: lineItems.reduce((sum, l) => sum + parseFloat(l.Amount), 0),
    gst_rate: lineItems[0].Tax ? 18 : 0,
    gst_amount: parseFloat(inv['Tax Amount']),
    total_amount: parseFloat(inv['Gross Amount']),
    status: isPastDue(...) ? 'overdue' : 'sent',
    paid_amount: 0,
    service_month: formatMonth(inv['Created Date']),
    service_lines: lineItems.map(item => ({
      description: item['Add Item'],
      quantity: parseFloat(item.Qty),
      rate: parseFloat(item.Rate),
      amount: parseFloat(item.Amount),
      currency: customer.currency
    }))
  }
})

// 3. Insert into Supabase
await supabase.from('exam_types').insert(examTypes)
await supabase.from('customers').insert(customers)
await supabase.from('invoices').insert(invoiceRecords) // with nested service_lines
```

---

## 💾 Estimated Storage

- **Customers:** 8 records × 500 bytes = 4 KB
- **Exam Types:** 12 records × 300 bytes = 3.6 KB
- **Invoices:** 43 records × 1 KB = 43 KB
- **Service Lines:** 80 records × 200 bytes = 16 KB
- **Total:** ~67 KB (negligible in Supabase free tier)

---

## ✅ Success Criteria

- [ ] All 43 invoices imported
- [ ] All customers matched
- [ ] Grand total = ₹6,419,520 (±₹100)
- [ ] No duplicate invoices
- [ ] All dates formatted consistently
- [ ] Service lines attached to invoices
- [ ] Dashboard updated to show historical data
- [ ] Reports functional with legacy data

---

**Next Action:** Proceed with Step 1 (Setup) - create migration script and validate CSV parsing.
