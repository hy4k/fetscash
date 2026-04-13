# Data Migration Guide - Forum Testing & Educational Services

## Overview
This guide covers migrating your existing accounting data (Excel/PDF) into the new fetscash system.

---

## 📁 What Data You Likely Have

### 1. Customer/Client Data
```excel
- Client Name: Prometric, Pearson Vue, PSI, etc.
- Contact details
- Agreement/contract dates
- Payment terms (Net 30, Net 45, etc.)
- Service rates
```

**Migration Approach:**
- Manual entry (6-10 clients max - quick)
- Or: CSV import template I'll create

### 2. Invoices Issued
```excel
- Invoice numbers
- Client names
- Invoice dates
- Amounts (USD/INR)
- GST amounts
- Payment status (Paid/Pending)
- Payment dates
- Bank reference numbers
```

**Migration Approach:**
- CSV import via admin panel
- Upload PDFs as attachments

### 3. Expenses
```excel/pdf
- Rent receipts
- Staff salaries
- Electricity/internet bills
- Equipment purchases
- Maintenance
```

**Migration Approach:**
- Bulk import via CSV
- Scan and upload PDF receipts

### 4. Bank Statements
```excel/pdf
- Foreign bank (for USD receipts)
- Indian bank (for INR transactions)
- Forex conversion details
```

**Migration Approach:**
- Import bank statements
- Auto-match with invoices

---

## 🛠️ Migration Plan

### Phase 1: Setup (Week 1)
1. ✅ Create Customer records (Prometric, Pearson Vue, etc.)
2. ✅ Set up Chart of Accounts
3. ✅ Configure GST rates (18% for testing services)
4. ✅ Set up Bank Accounts (Foreign + Indian)

### Phase 2: Historical Data Import (Week 1-2)
1. Import invoices from Excel (last 12 months)
2. Import expenses from Excel/PDFs
3. Upload scanned documents as attachments
4. Reconcile opening balances

### Phase 3: Go Live (Week 2)
1. Start creating NEW invoices in the system
2. Record NEW expenses
3. Monthly reconciliation

---

## 📋 CSV Import Templates

I'll provide Excel/CSV templates for:
- `customers_import_template.csv`
- `invoices_import_template.csv`
- `expenses_import_template.csv`
- `bank_transactions_import_template.csv`

---

## 💾 Document Storage

All PDFs/scanned documents will be stored:
- **Option A:** Supabase Storage (if file size < 100MB total)
- **Option B:** Azure Blob Storage (if larger, integrates with your deployment)

**Structure:**
```
/documents
  /invoices
    /2024
      INV-001.pdf
      INV-002.pdf
  /receipts
    /2024
      receipt-001.pdf
  /agreements
    prometric-contract-2024.pdf
```

---

## ⚡ Quick Migration (If Data is Small)

If you have:
- < 50 invoices/year
- < 10 clients
- < 100 expense entries

**Recommendation:** Manual entry is faster than building import scripts.

**Time estimate:** 
- 2-3 hours of data entry
- System ready immediately

---

## 🔍 Verification Steps

After migration:
1. Verify total income matches bank statements
2. Verify total expenses match your records
3. Check GST calculations
4. Confirm all documents are attached

---

## Next Steps

1. **Export your Excel data** to CSV
2. **Scan important PDFs** (invoices, receipts)
3. **Send me sample data** (1-2 rows) so I can create exact import templates
4. **I'll build the import feature** in fetscash

**Question:** Can you share 1-2 sample rows from your Excel files? (anonymized is fine) This helps me create exact import templates for your data structure.