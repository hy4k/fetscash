import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { computeAccountData, loadRawData, TABLES, type RawData } from '@/lib/data'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { loadLocal, saveLocal, uid, type EntityKey, type LocalData } from '@/lib/localStore'
import type {
  AccountData,
  CashTxnRow,
  CustomerFull,
  ExpenseRow,
  InvoiceRow,
  LocationType,
  PaymentRow,
  Period,
  ProductRow,
} from '@/types'

export interface PaymentInput {
  date: string
  amount: number
  amount_inr: number
  payment_method: string
  reference_number?: string
  exchange_rate?: number
}

interface AccountState {
  period: Period
  setPeriod: (p: Period) => void
  data: AccountData | null
  demo: boolean
  loading: boolean
  backend: 'supabase' | 'local'
  refresh: () => Promise<void>
  invoiceCentres: Record<string, LocationType>
  localInvoiceIds: Set<string>
  addCustomer: (c: Omit<CustomerFull, 'id' | 'balance' | 'total_invoices' | 'unpaid_invoices'>) => CustomerFull
  updateCustomer: (id: string, patch: Partial<CustomerFull>) => void
  deleteCustomer: (id: string) => void
  addProduct: (p: Omit<ProductRow, 'id'>) => ProductRow
  updateProduct: (id: string, patch: Partial<ProductRow>) => void
  deleteProduct: (id: string) => void
  addInvoice: (i: Omit<InvoiceRow, 'id'> & { id?: string }) => InvoiceRow
  updateInvoice: (id: string, patch: Partial<InvoiceRow>) => void
  removeInvoice: (id: string) => void
  addExpense: (e: Omit<ExpenseRow, 'id'>) => ExpenseRow
  updateExpense: (id: string, patch: Partial<ExpenseRow>) => void
  deleteExpense: (id: string) => void
  addPayment: (p: Omit<PaymentRow, 'id'>) => PaymentRow
  updatePayment: (id: string, patch: Partial<PaymentRow>) => void
  deletePayment: (id: string) => void
  addCashTxn: (t: Omit<CashTxnRow, 'id'>) => CashTxnRow
  updateCashTxn: (id: string, patch: Partial<CashTxnRow>) => void
  deleteCashTxn: (id: string) => void
  setInvoiceCentre: (invoiceId: string, centre: LocationType) => void
  recordPayment: (invoice: InvoiceRow, p: PaymentInput) => Promise<boolean>
}

const AccountContext = createContext<AccountState | null>(null)

const EMPTY_LOCAL: LocalData = {
  customers: [], products: [], invoices: [], expenses: [], payments: [], cashTxns: [], invoiceCentres: {},
  deleted: { customers: [], products: [], invoices: [], expenses: [], payments: [], cashTxns: [] },
}

function hasLocalContent(l: LocalData) {
  return Boolean(
    l.customers.length || l.products.length || l.invoices.length || l.expenses.length ||
    l.payments.length || l.cashTxns.length || Object.keys(l.invoiceCentres).length
  )
}

/** Merge imported/Supabase raw rows with locally-created overlay rows.
 *  Local copies of raw rows (edited/patched) win; rows tombstoned in
 *  local.deleted are filtered out; local rows already present in raw
 *  (same id — e.g. after a Supabase refresh) are dropped. */
function merge(raw: RawData, local: LocalData): RawData {
  const combine = <T extends { id: string }>(key: EntityKey, rawRows: T[], localRows: T[]): T[] => {
    const tomb = new Set(local.deleted[key])
    const localById = new Map(localRows.map((r) => [r.id, r]))
    const kept = rawRows.filter((r) => !tomb.has(r.id)).map((r) => localById.get(r.id) ?? r)
    const rawIds = new Set(rawRows.map((r) => r.id))
    return [...kept, ...localRows.filter((r) => !rawIds.has(r.id))]
  }
  const invoices = combine('invoices', raw.invoices, local.invoices).map((i) => {
    const centre = local.invoiceCentres[i.id]
    return centre ? { ...i, location: centre } : i
  })
  return {
    expenses: combine('expenses', raw.expenses, local.expenses),
    cashTxns: combine('cashTxns', raw.cashTxns, local.cashTxns),
    invoices,
    payments: combine('payments', raw.payments, local.payments),
    customers: combine('customers', raw.customers, local.customers),
    products: combine('products', raw.products, local.products),
  }
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = useState<Period>({ kind: 'all' })
  const [raw, setRaw] = useState<RawData | null>(null)
  const [local, setLocal] = useState<LocalData>(loadLocal)
  const [demo, setDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const migratedRef = useRef(false)
  const rawRef = useRef<RawData | null>(null)
  rawRef.current = raw

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await loadRawData()
    setRaw(res.raw)
    setDemo(res.demo)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const update = useCallback((fn: (l: LocalData) => LocalData) => {
    setLocal((prev) => {
      const next = fn(prev)
      saveLocal(next)
      return next
    })
  }, [])

  /** Persist one row to Supabase in the background; refresh on success, toast on failure. */
  const persist = useCallback((table: string, row: object) => {
    if (!isSupabaseConfigured) return
    void (async () => {
      const { error } = await supabase.from(table).insert(row)
      if (error) toast.error(`Could not save to Supabase: ${error.message}`)
      await refresh()
    })()
  }, [refresh])

  /** Edit any entity: patch the local overlay (raw rows are copied in first), then Supabase. */
  const patchEntity = useCallback(<T extends { id: string }>(key: EntityKey, table: string, id: string, patch: Partial<T>) => {
    const rawRow = ((rawRef.current?.[key] as unknown) as T[] | undefined)?.find((r) => r.id === id)
    update((l) => {
      const rows = (l[key] as unknown) as T[]
      const next = rows.some((r) => r.id === id)
        ? rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
        : rawRow
          ? [...rows, { ...rawRow, ...patch }]
          : rows
      return { ...l, [key]: next }
    })
    if (isSupabaseConfigured) {
      void (async () => {
        const { error } = await supabase.from(table).update(patch as object).eq('id', id)
        if (error) toast.error(`Could not update in Supabase: ${error.message}`)
        await refresh()
      })()
    }
  }, [update, refresh])

  /** Delete any entity: tombstone locally (so a failed remote delete doesn't resurrect it), then Supabase. */
  const removeEntity = useCallback((key: EntityKey, table: string, id: string) => {
    update((l) => ({
      ...l,
      [key]: (l[key] as { id: string }[]).filter((r) => r.id !== id),
      deleted: { ...l.deleted, [key]: [...l.deleted[key], id] },
    }))
    if (isSupabaseConfigured) {
      void (async () => {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) toast.error(`Could not delete in Supabase: ${error.message}`)
        await refresh()
      })()
    }
  }, [update, refresh])

  /** One-time move of any browser-local records into Supabase, then clear the local copy. */
  useEffect(() => {
    if (!isSupabaseConfigured || migratedRef.current || loading || !raw) return
    if (!hasLocalContent(local)) { migratedRef.current = true; return }
    migratedRef.current = true
    const snapshot = local
    void (async () => {
      try {
        if (snapshot.customers.length)
          await supabase.from(TABLES.customers).upsert(snapshot.customers, { onConflict: 'id', ignoreDuplicates: true })
        if (snapshot.products.length)
          await supabase.from(TABLES.products).upsert(snapshot.products, { onConflict: 'id', ignoreDuplicates: true })
        if (snapshot.invoices.length)
          await supabase.from(TABLES.invoices).upsert(snapshot.invoices, { onConflict: 'id', ignoreDuplicates: true })
        if (snapshot.expenses.length)
          await supabase.from(TABLES.expenses).upsert(snapshot.expenses, { onConflict: 'id', ignoreDuplicates: true })
        if (snapshot.payments.length)
          await supabase.from(TABLES.payments).upsert(snapshot.payments, { onConflict: 'id', ignoreDuplicates: true })
        if (snapshot.cashTxns.length)
          await supabase.from(TABLES.cashTxns).upsert(snapshot.cashTxns, { onConflict: 'id', ignoreDuplicates: true })
        const centres = Object.entries(snapshot.invoiceCentres).map(([invoice_id, centre]) => ({ invoice_id, centre }))
        if (centres.length)
          await supabase.from(TABLES.centres).upsert(centres, { onConflict: 'invoice_id', ignoreDuplicates: true })
        setLocal(EMPTY_LOCAL)
        saveLocal(EMPTY_LOCAL)
        toast.success('Browser-saved entries moved to Supabase')
      } catch {
        toast.error('Could not move browser entries to Supabase yet — will retry next load')
        migratedRef.current = false
      }
      await refresh()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, raw])

  const addCustomer = useCallback<AccountState['addCustomer']>((c) => {
    const row: CustomerFull = { ...c, id: uid('cust'), balance: 0, total_invoices: 0, unpaid_invoices: 0 }
    update((l) => ({ ...l, customers: [...l.customers, row] }))
    persist(TABLES.customers, row)
    return row
  }, [update, persist])

  const addProduct = useCallback<AccountState['addProduct']>((p) => {
    const row: ProductRow = { ...p, id: uid('prod') }
    update((l) => ({ ...l, products: [...l.products, row] }))
    persist(TABLES.products, row)
    return row
  }, [update, persist])

  const addInvoice = useCallback<AccountState['addInvoice']>((i) => {
    const row: InvoiceRow = { ...i, id: i.id || uid('inv') }
    update((l) => ({ ...l, invoices: [...l.invoices, row] }))
    persist(TABLES.invoices, { ...row, items: row.items ?? null })
    return row
  }, [update, persist])

  const updateInvoice = useCallback<AccountState['updateInvoice']>(
    (id, patch) => patchEntity<InvoiceRow>('invoices', TABLES.invoices, id, patch), [patchEntity])

  const removeInvoice = useCallback<AccountState['removeInvoice']>(
    (id) => removeEntity('invoices', TABLES.invoices, id), [removeEntity])

  const addExpense = useCallback<AccountState['addExpense']>((e) => {
    const row: ExpenseRow = { ...e, id: uid('exp') }
    update((l) => ({ ...l, expenses: [...l.expenses, row] }))
    persist(TABLES.expenses, row)
    return row
  }, [update, persist])

  const addPayment = useCallback<AccountState['addPayment']>((p) => {
    const row: PaymentRow = { ...p, id: uid('pay') }
    update((l) => ({ ...l, payments: [...l.payments, row] }))
    persist(TABLES.payments, row)
    return row
  }, [update, persist])

  const addCashTxn = useCallback<AccountState['addCashTxn']>((t) => {
    const row: CashTxnRow = { ...t, id: uid('cash') }
    update((l) => ({ ...l, cashTxns: [...l.cashTxns, row] }))
    persist(TABLES.cashTxns, row)
    return row
  }, [update, persist])

  const setInvoiceCentre = useCallback<AccountState['setInvoiceCentre']>((invoiceId, centre) => {
    update((l) => ({ ...l, invoiceCentres: { ...l.invoiceCentres, [invoiceId]: centre } }))
    if (isSupabaseConfigured) {
      void (async () => {
        const { error } = await supabase.from(TABLES.centres).upsert({ invoice_id: invoiceId, centre })
        if (error) toast.error(`Could not save centre: ${error.message}`)
      })()
    }
  }, [update])

  const recordPayment = useCallback<AccountState['recordPayment']>(async (invoice, p) => {
    const newPaid = Math.round((invoice.paid_amount + p.amount_inr) * 100) / 100
    const settled = newPaid >= invoice.total_amount - 0.005
    const status: InvoiceRow['status'] = settled ? 'paid' : 'partially_paid'
    if (isSupabaseConfigured) {
      const ins = await supabase.from(TABLES.payments).insert({
        id: uid('pay'),
        invoice_id: invoice.id,
        payment_date: p.date,
        amount: p.amount,
        amount_inr: p.amount_inr,
        payment_method: p.payment_method,
        reference_number: p.reference_number ?? null,
        exchange_rate: p.exchange_rate ?? null,
      })
      if (ins.error) { toast.error(`Payment not saved: ${ins.error.message}`); return false }
      const upd = await supabase.from(TABLES.invoices)
        .update({ paid_amount: newPaid, status, payment_date: p.date })
        .eq('id', invoice.id)
      if (upd.error) { toast.error(`Invoice not updated: ${upd.error.message}`); return false }
      toast.success(`Payment recorded on ${invoice.invoice_number}`, {
        description: settled ? 'Invoice fully settled' : `Balance ₹${(invoice.total_amount - newPaid).toLocaleString('en-IN')}`,
      })
      await refresh()
      return true
    }
    // Offline fallback — overlay in localStorage
    const payment: PaymentRow = {
      id: uid('pay'), invoice_id: invoice.id, payment_date: p.date,
      amount: p.amount, amount_inr: p.amount_inr,
      payment_method: p.payment_method, reference_number: p.reference_number,
      exchange_rate: p.exchange_rate,
    }
    const patched: InvoiceRow = { ...invoice, paid_amount: newPaid, status, payment_date: p.date }
    update((l) => ({
      ...l,
      payments: [...l.payments, payment],
      invoices: [...l.invoices.filter((i) => i.id !== invoice.id), patched],
    }))
    toast.success(`Payment recorded on ${invoice.invoice_number}`)
    return true
  }, [update, refresh])

  const data = useMemo(() => (raw ? computeAccountData(merge(raw, local), period) : null), [raw, local, period])
  const localInvoiceIds = useMemo(() => new Set(local.invoices.map((i) => i.id)), [local.invoices])

  const updateCustomer = useCallback<AccountState['updateCustomer']>(
    (id, patch) => patchEntity<CustomerFull>('customers', TABLES.customers, id, patch), [patchEntity])
  const deleteCustomer = useCallback<AccountState['deleteCustomer']>(
    (id) => removeEntity('customers', TABLES.customers, id), [removeEntity])
  const updateProduct = useCallback<AccountState['updateProduct']>(
    (id, patch) => patchEntity<ProductRow>('products', TABLES.products, id, patch), [patchEntity])
  const deleteProduct = useCallback<AccountState['deleteProduct']>(
    (id) => removeEntity('products', TABLES.products, id), [removeEntity])
  const updateExpense = useCallback<AccountState['updateExpense']>(
    (id, patch) => patchEntity<ExpenseRow>('expenses', TABLES.expenses, id, patch), [patchEntity])
  const deleteExpense = useCallback<AccountState['deleteExpense']>(
    (id) => removeEntity('expenses', TABLES.expenses, id), [removeEntity])
  const updatePayment = useCallback<AccountState['updatePayment']>(
    (id, patch) => patchEntity<PaymentRow>('payments', TABLES.payments, id, patch), [patchEntity])
  const deletePayment = useCallback<AccountState['deletePayment']>(
    (id) => removeEntity('payments', TABLES.payments, id), [removeEntity])
  const updateCashTxn = useCallback<AccountState['updateCashTxn']>(
    (id, patch) => patchEntity<CashTxnRow>('cashTxns', TABLES.cashTxns, id, patch), [patchEntity])
  const deleteCashTxn = useCallback<AccountState['deleteCashTxn']>(
    (id) => removeEntity('cashTxns', TABLES.cashTxns, id), [removeEntity])

  return (
    <AccountContext.Provider
      value={{
        period, setPeriod, data, demo, loading, refresh,
        backend: isSupabaseConfigured ? 'supabase' : 'local',
        invoiceCentres: local.invoiceCentres,
        localInvoiceIds,
        addCustomer, updateCustomer, deleteCustomer,
        addProduct, updateProduct, deleteProduct,
        addInvoice, updateInvoice, removeInvoice,
        addExpense, updateExpense, deleteExpense,
        addPayment, updatePayment, deletePayment,
        addCashTxn, updateCashTxn, deleteCashTxn,
        setInvoiceCentre, recordPayment,
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount(): AccountState {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider')
  return ctx
}
