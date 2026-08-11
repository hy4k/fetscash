import type {
  CashTxnRow,
  CustomerFull,
  ExpenseRow,
  InvoiceRow,
  LocationType,
  PaymentRow,
  ProductRow,
} from '@/types'

/** Records created inside the app (not imported from CSV/bank). Persisted in localStorage. */
export interface LocalData {
  customers: CustomerFull[]
  products: ProductRow[]
  invoices: InvoiceRow[]
  expenses: ExpenseRow[]
  payments: PaymentRow[]
  cashTxns: CashTxnRow[]
  /** Manual centre overrides for imported invoices: invoice id -> centre */
  invoiceCentres: Record<string, LocationType>
}

const KEY = 'fets-accounts-local-v1'

const EMPTY: LocalData = {
  customers: [],
  products: [],
  invoices: [],
  expenses: [],
  payments: [],
  cashTxns: [],
  invoiceCentres: {},
}

export function loadLocal(): LocalData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY, invoiceCentres: {} }
    const parsed = JSON.parse(raw) as Partial<LocalData>
    return {
      customers: parsed.customers ?? [],
      products: parsed.products ?? [],
      invoices: parsed.invoices ?? [],
      expenses: parsed.expenses ?? [],
      payments: parsed.payments ?? [],
      cashTxns: parsed.cashTxns ?? [],
      invoiceCentres: parsed.invoiceCentres ?? {},
    }
  } catch {
    return { ...EMPTY, invoiceCentres: {} }
  }
}

export function saveLocal(d: LocalData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d))
  } catch {
    // storage full / private mode — keep in-memory copy only
  }
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}
