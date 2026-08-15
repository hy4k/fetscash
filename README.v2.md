# FETS Cash v2 — Refactored Architecture

> **Total change over** from a single 55KB monolithic `App.tsx` into a modern, modular, production-grade React application.

---

## New Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite |
| Routing | React Router v7 (BrowserRouter) |
| Server State | TanStack Query (React Query) v5 |
| Client State | Zustand v5 |
| UI Primitives | shadcn/ui style + Tailwind CSS |
| Charts | Recharts v3 |
| Notifications | Sonner (toast) |
| Icons | Lucide React |
| Backend | Supabase (PostgreSQL + Realtime) |
| PDF Generation | jsPDF + jspdf-autotable |

---

## Project Structure

```
src/
├── App.tsx                    # Router entry point (lazy-loaded pages, providers, error boundary)
├── constants.ts               # COMPANY_INFO, CATEGORY_REPLENISHMENT
├── lib/
│   └── utils.ts               # cn() — clsx + tailwind-merge helper
├── types/                     # Domain-specific TypeScript types
│   ├── index.ts               # Barrel export
│   ├── user.ts
│   ├── customer.ts            # Customer, ServiceLine, ExamType
│   ├── invoice.ts             # Invoice, InvoiceStatus, Payment
│   ├── expense.ts             # Expense, Category, FetsTransaction, LocationType
│   ├── bank.ts                # BankAccount, BankTransaction
│   ├── gst.ts                 # GSTReturn, GSTReturnItem
│   ├── currency.ts            # CurrencyRate, MonthlyCurrencyReportRow
│   ├── remittance.ts          # ForeignRemittance, RemittanceStatus
│   └── paybook.ts             # FetsSalaryData, FetsExpensesData, ProductRow, etc.
├── stores/                    # Zustand global state
│   ├── useAuthStore.ts        # User session + loading
│   ├── useAppStore.ts         # Location (cochin/calicut), sidebar, modals
│   └── useFilterStore.ts      # Search, category, date range filters
├── services/                  # Supabase API layer (repository pattern)
│   ├── index.ts               # Barrel export
│   ├── supabase.ts            # Client + isSupabaseConfigured
│   ├── api.ts                 # ApiError + handleResponse
│   ├── expensesApi.ts         # CRUD + categories + global counts
│   ├── cashApi.ts             # CRUD + description parsing + counts
│   ├── customersApi.ts        # CRUD + initializeDefaults
│   ├── invoicesApi.ts         # CRUD + service_lines join + invoice numbering
│   ├── paymentsApi.ts         # Create + updateInvoicePaymentStatus
│   ├── productsApi.ts         # CRUD
│   ├── bankApi.ts             # Fetch accounts + transactions
│   ├── gstApi.ts              # Fetch returns
│   ├── currencyApi.ts         # Fetch rates
│   ├── remittanceApi.ts       # Fetch remittances
│   └── paybookApi.ts          # Fetch salary + expenses data
├── hooks/                     # TanStack Query hooks
│   ├── index.ts               # Barrel export
│   ├── useAuth.ts             # Auth query + workspace user resolution
│   ├── useDataSubscription.ts # Supabase realtime → invalidateQueries
│   ├── useLocationColor.ts    # Cochin green / Calicut blue
│   ├── useExpenses.ts         # useExpenses, useCategories, useCreateExpense, useUpdateExpense, useDeleteExpense, useCreateCategory, useDeleteCategory
│   ├── useCash.ts             # useCashTransactions, useCreateCashTransaction, useUpdateCashTransaction, useDeleteCashTransaction
│   ├── useCustomers.ts        # useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, useInitializeCustomers
│   ├── useInvoices.ts         # useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, useGenerateInvoiceNumber
│   ├── usePayments.ts         # usePayments, useCreatePayment, useRecordPayment
│   ├── useProducts.ts         # useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct
│   ├── useBank.ts             # useBankAccounts, useBankTransactions
│   ├── useGST.ts              # useGSTReturns
│   ├── useCurrency.ts         # useCurrencyRates
│   ├── useRemittance.ts       # useForeignRemittances
│   ├── usePaybook.ts          # usePaybookSalary, usePaybookExpenses
│   └── useGlobalCounts.ts     # Aggregated expense + cash counts across both branches
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   │   ├── Button.tsx         # CVA variants (default, destructive, outline, secondary, ghost, link)
│   │   ├── Card.tsx           # Card + CardHeader + CardTitle + CardContent
│   │   ├── Input.tsx          # Themed form input
│   │   ├── Label.tsx          # Themed label
│   │   ├── Select.tsx         # Themed select
│   │   ├── Badge.tsx          # Variants: default, secondary, destructive, outline, success
│   │   └── Skeleton.tsx       # Pulse loading skeleton
│   ├── layout/
│   │   ├── AppLayout.tsx      # Sidebar + Header + main content area
│   │   ├── Sidebar.tsx        # Nav with lucide icons, route highlighting, location toggle
│   │   ├── Header.tsx         # Dynamic page title + branch info
│   │   └── PageHeader.tsx     # Reusable page header with actions slot
│   ├── dashboard/
│   │   ├── StatsCard.tsx      # Animated stat card with icon, value, color
│   │   ├── RevenueChart.tsx   # Income vs Expenses area chart (Recharts)
│   │   ├── ExpensePieChart.tsx # Expense breakdown pie chart (donut)
│   │   └── QuickActions.tsx   # Action button bar
│   ├── data/
│   │   ├── DataTable.tsx      # Generic typed table with search, filters, actions
│   │   └── SearchBar.tsx      # Search input with icon
│   ├── modals/
│   │   ├── ConfirmDialog.tsx  # Reusable confirmation overlay
│   │   ├── FormModal.tsx      # Generic modal wrapper
│   │   ├── ExpenseModal.tsx   # Full expense form
│   │   ├── CashModal.tsx      # Cash transaction form
│   │   ├── CustomerModal.tsx  # Customer form (GST/TAN, country, currency)
│   │   ├── InvoiceModal.tsx   # Invoice form with dynamic service lines
│   │   └── PaymentModal.tsx   # Payment recording form
│   ├── charts/
│   │   ├── AreaChart.tsx      # Recharts AreaChart wrapper
│   │   └── PieChart.tsx       # Recharts PieChart wrapper
│   ├── providers/
│   │   ├── QueryProvider.tsx  # TanStack Query client (5-min stale time)
│   │   └── StoreProvider.tsx  # Zustand pass-through (future-proof)
│   └── error/
│       ├── ErrorBoundary.tsx  # Class component with error display + reload
│       ├── LoadingPage.tsx    # Skeleton placeholders for dashboard layout
│       └── NotFoundPage.tsx   # 404 with home link
├── pages/                     # Route-level pages (all lazy-loaded)
│   ├── DashboardPage.tsx      # Stats, charts, quick actions
│   ├── ExpensesPage.tsx       # Full CRUD expense register
│   ├── CashBookPage.tsx       # Balance card + transaction table
│   ├── CustomersPage.tsx      # Client list + CRUD
│   ├── InvoicesPage.tsx       # Invoice list + monthly revenue tabs + payments
│   ├── PaybookPage.tsx        # Wraps original PaybookView
│   ├── BankReconciliationPage.tsx # Wraps original BankReconciliationView
│   ├── GSTReturnsPage.tsx     # Wraps original GSTReturnsView
│   ├── MultiCurrencyPage.tsx  # Wraps original MultiCurrencyReportView
│   ├── ForeignRemittancePage.tsx # Wraps original ForeignRemittanceView
│   └── SettingsPage.tsx       # Company info, categories, products, stats, quick links
├── utils/                     # Utilities & PDF generators
│   ├── index.ts               # Barrel export
│   ├── formatters.ts          # formatCurrency, formatDate, formatMonthLabel
│   ├── idGenerators.ts        # generateNextId (sequential numbering)
│   ├── validators.ts          # validateEmail, validateGST, validatePAN, validateRequired
│   ├── workspaceUser.ts       # resolveWorkspaceUserId (auth fallback)
│   ├── invoicePdf.ts          # Invoice PDF generation (jsPDF)
│   ├── numberToWords.ts       # Number → English words
│   ├── paybookMonth.ts        # Paybook month calculations
│   ├── paybookSalary.ts       # Salary computation helpers
│   ├── paybookPayslip.ts      # Payslip PDF generation
│   ├── remittancePdf.ts       # FIRC/remittance PDF generation
│   └── schemaCheck.ts         # Supabase schema validation
```

---

## Key Improvements

1. **Monolith → Modular** — Single 55KB `App.tsx` split into **80+ focused files** across 12 directories
2. **No more prop drilling** — Zustand stores handle global state (auth, location, filters, modals)
3. **Centralized data fetching** — TanStack Query handles caching, loading, error states, and real-time invalidation
4. **Type-safe APIs** — All Supabase operations are typed and centralized in `services/`
5. **Reusable UI** — shadcn/ui primitives + custom `glass-panel`, `neo-btn`, `neo-input` styles
6. **Code splitting** — All 11 pages are lazy-loaded via `React.lazy`
7. **Error boundaries** — Graceful error handling with reload option
8. **Toast notifications** — All CRUD operations show feedback via Sonner
9. **Path aliases** — `@/` imports for clean module resolution (`vite.config.ts` + `tsconfig.json`)
10. **Immutable business logic** — Invoice numbering, GST calculations, FIRC tracking, payslip generation all preserved exactly

---

## Original Components Preserved

The following original complex components remain in the root `components/` directory and are **wrapped** by the new page system:

| Original Component | Wrapped By | Props Passed |
|---|---|---|
| `PaybookView.tsx` | `PaybookPage.tsx` | `location`, `primaryColor` |
| `BankReconciliationView.tsx` | `BankReconciliationPage.tsx` | `userId`, `invoices`, `expenses`, `payments` |
| `GSTReturnsView.tsx` | `GSTReturnsPage.tsx` | `userId`, `invoices`, `customers` |
| `MultiCurrencyReportView.tsx` | `MultiCurrencyPage.tsx` | `userId` |
| `ForeignRemittanceView.tsx` | `ForeignRemittancePage.tsx` | `userId`, `customers` |

Original utility files (`utils/invoicePdf.ts`, `numberToWords.ts`, `paybookMonth.ts`, `paybookPayslip.ts`, `remittancePdf.ts`) also remain in the root `utils/` directory and are used by both old and new components.

**New copies** with updated `@/` imports were created under `src/utils/` for the new architecture.

---

## Environment Variables

Same as before — no changes required:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

---

## Migration Notes

- **Supabase schema unchanged** — all tables, columns, relationships identical
- **Data format unchanged** — all existing data continues to work
- **URL routing added** — direct links to `/expenses`, `/invoices`, `/settings` now work
- **No breaking API changes** — same Supabase tables, same data shapes
- **Dark theme preserved** — the unique money-green aesthetic (`#85bb65`, `#d4af37`, `#080f0c`) is fully intact

---

## Branch

All changes are on branch **`refactor/v2-total-changeover`**.
