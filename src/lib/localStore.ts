import type {
  CashTxnRow,
  CustomerFull,
  ExpenseRow,
  InvoiceRow,
  LocationType,
  PaymentRow,
  ProductRow,
} from '@/types'

export type EntityKey = 'customers' | 'products' | 'invoices' | 'expenses' | 'payments' | 'cashTxns'

export type DeletedMap = Record<EntityKey, string[]>

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
  /** Ids of raw (Supabase/imported) rows deleted while offline — merge filters them out. */
  deleted: DeletedMap
}

const KEY = 'fets-accounts-local-v1'

const EMPTY_DELETED: DeletedMap = {
  customers: [], products: [], invoices: [], expenses: [], payments: [], cashTxns: [],
}

const EMPTY: LocalData = {
  customers: [],
  products: [],
  invoices: [],
  expenses: [],
  payments: [],
  cashTxns: [],
  invoiceCentres: {},
  deleted: EMPTY_DELETED,
}

export function loadLocal(): LocalData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY, invoiceCentres: {}, deleted: { ...EMPTY_DELETED } }
    const parsed = JSON.parse(raw) as Partial<LocalData>
    return {
      customers: parsed.customers ?? [],
      products: parsed.products ?? [],
      invoices: parsed.invoices ?? [],
      expenses: parsed.expenses ?? [],
      payments: parsed.payments ?? [],
      cashTxns: parsed.cashTxns ?? [],
      invoiceCentres: parsed.invoiceCentres ?? {},
      deleted: { ...EMPTY_DELETED, ...(parsed.deleted ?? {}) },
    }
  } catch {
    return { ...EMPTY, invoiceCentres: {}, deleted: { ...EMPTY_DELETED } }
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
