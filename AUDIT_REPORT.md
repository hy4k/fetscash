# FETS Platform - Full Audit Report
Generated: 2026-04-13 | Auditor: AUDIT-BOT (spawned by FETS-PRIME)

---

## SECTION 1: FILE INVENTORY

| File Path | Module | In Deployment | Status |
|---|---|---|---|
| `App.tsx` | Core App / Router | YES (bundled in dist) | DEPLOYED |
| `index.tsx` | Entry Point | YES | DEPLOYED |
| `index.html` | HTML Shell | YES | DEPLOYED |
| `types.ts` | Type Definitions | YES | DEPLOYED |
| `constants.ts` | Constants | YES | DEPLOYED |
| `supabaseClient.ts` | Supabase Auth | YES | DEPLOYED |
| `vite.config.ts` | Build Config | YES (build tool) | DEPLOYED |
| `tsconfig.json` | TypeScript Config | YES (build tool) | DEPLOYED |
| `package.json` | Dependencies | YES | DEPLOYED |
| `Dockerfile` | Container | YES | DEPLOYED |
| `nginx.conf` | Reverse Proxy | YES | DEPLOYED |
| `components/Sidebar.tsx` | Navigation | YES | DEPLOYED |
| `components/ExpenseForm.tsx` | Expense Entry | YES | DEPLOYED |
| `components/CashTransactionForm.tsx` | Cash Book | YES | DEPLOYED |
| `components/CategoryManager.tsx` | Category Mgmt | YES | DEPLOYED |
| `components/Modal.tsx` | Modal Shell | YES | DEPLOYED |
| `components/StatsCard.tsx` | Dashboard Cards | YES | DEPLOYED |
| `components/HoloToggle.tsx` | Location Switch | YES | DEPLOYED |
| `components/CustomerList.tsx` | Client List | YES | DEPLOYED |
| `components/CustomerForm.tsx` | Client Entry | YES | DEPLOYED |
| `components/InvoiceList.tsx` | Invoice List | YES | DEPLOYED |
| `components/InvoiceForm.tsx` | Invoice Entry | YES | DEPLOYED |
| `components/DataImport.tsx` | CSV Import | YES | DEPLOYED |
| `utils/invoicePdf.ts` | PDF Generation | YES | DEPLOYED - BROKEN (see notes) |
| `database-schema.sql` | DB Schema | NOT in app bundle | SCHEMA ONLY - NOT APPLIED (verify) |
| `DATA_MIGRATION_GUIDE.md` | Documentation | N/A | GUIDE ONLY |
| `AZURE_DEPLOYMENT.md` | Documentation | N/A | GUIDE ONLY |
| `.env.example` | Env Template | N/A | REFERENCE ONLY |
| `azure.yaml` | AZD Config | N/A | INFRA ONLY |
| `infra/main.bicep` | Infrastructure | DEPLOYED | DEPLOYED |
| `infra/parameters.staging.json` | Infra Params | DEPLOYED | DEPLOYED |
| `infra/modules/containerapp.bicep` | Container App | DEPLOYED | DEPLOYED |
| `infra/modules/containerRegistry.bicep` | ACR | DEPLOYED | DEPLOYED |
| `infra/modules/environment.bicep` | ACA Environment | DEPLOYED | DEPLOYED |
| `infra/modules/loganalytics.bicep` | Logging | DEPLOYED | DEPLOYED |
| `.github/workflows/ci-build-push.yml` | CI/CD Build | ACTIVE | DEPLOYED |
| `.github/workflows/deploy-bicep.yml` | Infra Deploy | ACTIVE | DEPLOYED |
| `.github/workflows/bind-custom-domain.yml` | Domain Binding | ACTIVE | DEPLOYED |
| `.github/workflows/validate-bicep.yml` | Bicep Lint | ACTIVE | DEPLOYED |
| `dist/index.html` | Built App | YES | DEPLOYED (stale build - needs rebuild) |
| `dist/assets/index-Cn8tq0Gp.js` | Built Bundle | YES | DEPLOYED (stale build) |

---

## SECTION 2: FEATURE GAP ANALYSIS

### Legend: DEPLOYED / NOT DEPLOYED / MISSING / PARTIAL / BROKEN

| Feature | Status | Notes |
|---|---|---|
| Two-location support (Cochin/Calicut) | DEPLOYED | Toggle works, color themes work |
| Expense tracking (ECK/ECL IDs) | DEPLOYED | Working, single-entry only |
| Cash Book management | DEPLOYED | Working, single-entry only |
| Category management | DEPLOYED | Add/delete works |
| Dashboard with charts | PARTIAL | Area chart works; pie chart broken (hardcoded "Loading chart...") |
| Date range filtering | DEPLOYED | Works on expenses and cash |
| Search functionality | DEPLOYED | Works |
| Role-based access | MISSING | No roles implemented. Single hardcoded demo user |
| Customer/Client management | DEPLOYED | Full CRUD, filtering by India/Foreign |
| Invoice creation | DEPLOYED | Form works, saves to Supabase |
| Invoice PDF generation | BROKEN | Returns HTML Blob, not PDF. IFSC shows "FDRL000????". Auto-print on load is disruptive. jsPDF not installed |
| Invoice number format | BROKEN | Uses INV-YYYY-NNN instead of FETS/CAL/2024-25/001 format |
| Service lines in invoices | PARTIAL | In-memory only. NOT saved to service_lines table. Code has TODO comment on line 202 |
| Payment recording | MISSING | payments table defined in schema but no UI |
| Data import (CSV) | DEPLOYED | Customers and invoices via CSV paste |
| Payment import | MISSING | Tab exists in DataImport but shows no handler |
| Reports view | PLACEHOLDER | Hardcoded "Phase 2" message, no real reports |
| Chart of Accounts | MISSING | Not built |
| Double-entry journal system | MISSING | Not built |
| Multi-currency exchange rate management | MISSING | Only symbol display, no rate tracking |
| Bank account management | MISSING | BankAccount type defined, no UI or DB table |
| Bank reconciliation | MISSING | Not built |
| GST management / GSTR reports | MISSING | Not built |
| TDS management | MISSING | Not built |
| P&L Statement | MISSING | Not built |
| Balance Sheet | MISSING | Not built |
| Trial Balance | MISSING | Not built |
| Cash Flow Statement | MISSING | Not built |
| Revenue by client report | MISSING | Not built |
| Revenue by branch report | MISSING | Not built |
| Ageing report | MISSING | Not built |
| PDF export (reports) | MISSING | Not built |
| Tally export | MISSING | Not built |
| Audit trail | MISSING | Not built |
| User management screen | MISSING | Not built |
| Document attachments | MISSING | Not built |
| Petty cash module | MISSING | Not built |
| Recurring expense templates | MISSING | Not built |
| Expense approval workflow | MISSING | Not built |
| Branch-level data isolation | MISSING | No RLS per branch. All data shared under user_id |
| Historical invoice migration tool | PARTIAL | CSV import exists, no PDF parser |
| Supabase migrations folder | MISSING | database-schema.sql exists but no numbered migration files |

---

## SECTION 3: CRITICAL BUGS FOUND

### BUG-001: Service Lines Not Persisted
**File:** `App.tsx` line 202
```
// TODO: Fetch service_lines separately and join
```
Service lines are stored in the Invoice form's local state and passed as `service_lines` JSON in the `invoiceData` object, but the `invoices` table has no `service_lines` column. The `service_lines` table exists in the schema but the app never INSERTs into it. Invoices saved to Supabase have no line items.

### BUG-002: Invoice PDF is HTML, Not PDF
**File:** `utils/invoicePdf.ts` line 429
```
return new Blob([html], { type: 'text/html' });
```
Returns HTML. `jsPDF` is not installed (not in package.json). `generateInvoicePDF` is declared as returning `Blob` but the caller (`InvoiceList.tsx`) uses `window.URL.createObjectURL` and downloads it as `.pdf` - the downloaded file will be an HTML file with a .pdf extension. Broken in production.

### BUG-003: Invoice Number Format Wrong
**File:** `App.tsx` line 98-100
```javascript
return `INV-${year}-${nextNum.toString().padStart(3, '0')}`;
```
FETS requires `FETS/CAL/2024-25/001` or `FETS/COC/2024-25/001`. Also: `nextNum = invoices.length + 1` means duplicate numbers after deletes.

### BUG-004: Dashboard Pie Chart Broken
**File:** `App.tsx` line 501
```
<div className="h-[300px]">Loading chart...</div>
```
Hardcoded. PieChart component is imported but never rendered.

### BUG-005: IFSC Code Placeholder in PDF
**File:** `utils/invoicePdf.ts` line 391
```
<div><strong>IFSC:</strong> FDRL000????</div>
```
Placeholder value in production invoice PDF.

### BUG-006: Auto-Print on Load (Disruptive)
**File:** `utils/invoicePdf.ts` lines 415-422
The HTML blob has a `window.onload` auto-print trigger. When a user clicks "Download PDF", the browser opens a new tab that immediately triggers a print dialog. This is not acceptable UX.

---

## SECTION 4: DATABASE STATE

### Tables Confirmed in Schema (database-schema.sql):
- `customers` - with RLS
- `invoices` - with RLS
- `service_lines` - with RLS
- `payments` - with RLS
- `documents` - with RLS

### Tables Referenced in App but NOT in schema:
- `categories` - exists (was pre-Phase 2 feature)
- `expenses` - exists (was pre-Phase 2 feature)
- `fets_cash_transactions` - exists (was pre-Phase 2 feature)

### Tables Defined in types.ts but NOT in schema:
- `bank_accounts`
- `bank_transactions`
- `import_batches`
- `exchange_rates`
- `chart_of_accounts`
- `journal_entries`
- `journal_lines`

### Schema application status:
The `database-schema.sql` file exists locally but there are no Supabase migration files in `/supabase/migrations/`. It is UNKNOWN whether the schema has been applied to the production Supabase instance. The app is live and customers/invoices views exist, suggesting some tables are present, but service_lines, payments, documents status is unverified.

---

## SECTION 5: DEPENDENCY AUDIT

| Package | Version | Status | Notes |
|---|---|---|---|
| react | ^19.2.0 | Current | OK |
| @supabase/supabase-js | ^2.84.0 | Current | OK |
| recharts | ^3.5.0 | Current | OK |
| framer-motion | ^11.0.8 | Installed | Not used in code |
| jsPDF | NOT INSTALLED | MISSING | Required for PDF generation |
| html2canvas | NOT INSTALLED | MISSING | Required for PDF generation |
| Tailwind CSS | NOT IN package.json | ANOMALY | Used extensively in JSX but not in dependencies |

**Tailwind anomaly:** All components use Tailwind classes (`glass-panel`, `neo-btn`, `money-green`, etc.) but Tailwind is not in package.json. These must be custom CSS classes defined somewhere. Check index.html or a global CSS file - these are likely loaded via CDN in index.html.

---

## SECTION 6: WHAT IS WORKING IN PRODUCTION

Based on code analysis and deployment confirmation:
1. Authentication (auto-login with demo credentials)
2. Location toggle (Cochin/Calicut)
3. Expense add/edit/delete
4. Cash book add/edit/delete
5. Category management
6. Customer add/edit/delete
7. Invoice creation (form saves, but no service lines persisted)
8. CSV data import (customers and invoices)
9. Dashboard stats (income, pending invoices, expenses, cash balance)
10. Dashboard Area chart (income vs expenses)

---

## SECTION 7: SUMMARY SCORE

| Area | Score |
|---|---|
| Infrastructure | 10/10 - Azure, CI/CD, TLS all operational |
| Authentication | 4/10 - Works but single hardcoded user, no real roles |
| Expense Management | 7/10 - Functional but no double-entry, no receipts |
| Invoice Management | 4/10 - Form works, PDF broken, service lines not saved |
| Reports | 0/10 - Placeholder only |
| Accounting (COA, Journal) | 0/10 - Not started |
| GST Management | 0/10 - Not started |
| Bank Management | 0/10 - Not started |
| Overall | 3/10 |
