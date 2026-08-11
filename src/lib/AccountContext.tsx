import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { computeAccountData, loadRawData, TABLES, type RawData } from '@/lib/data'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { loadLocal, saveLocal, uid, type LocalData } from '@/lib/localStore'
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
  addProduct: (p: Omit<ProductRow, 'id'>) => ProductRow
  addInvoice: (i: Omit<InvoiceRow, 'id'> & { id?: string }) => InvoiceRow
  removeInvoice: (id: string) => void
  addExpense: (e: Omit<ExpenseRow, 'id'>) => ExpenseRow
  addPayment: (p: Omit<PaymentRow, 'id'>) => PaymentRow
  addCashTxn: (t: Omit<CashTxnRow, 'id'>) => CashTxnRow
  setInvoiceCentre: (invoiceId: string, centre: LocationType) => void
  recordPayment: (invoice: InvoiceRow, p: PaymentInput) => Promise<boolean>
}

const AccountContext = createContext<AccountState | null>(null)

const EMPTY_LOCAL: LocalData = {
  customers: [], products: [], invoices: [], expenses: [], payments: [], cashTxns: [], invoiceCentres: {},
}

function hasLocalContent(l: LocalData) {
  return Boolean(
    l.customers.length || l.products.length || l.invoices.length || l.expenses.length ||
    l.payments.length || l.cashTxns.length || Object.keys(l.invoiceCentres).length
  )
}

/** Merge imported/Supabase raw rows with locally-created overlay rows.
 *  Local copies of raw rows (patched invoices) win; local rows already present
 *  in raw (same id — e.g. after a Supabase refresh) are dropped. */
function merge(raw: RawData, local: LocalData): RawData {
  const dedupe = <T extends { id: string }>(rawRows: T[], localRows: T[]): T[] => {
    const ids = new Set(rawRows.map((r) => r.id))
    return [...rawRows, ...localRows.filter((r) => !ids.has(r.id))]
  }
  const localInvById = new Map(local.invoices.map((i) => [i.id, i]))
  const rawInvIds = new Set(raw.invoices.map((i) => i.id))
  const invoices: InvoiceRow[] = [
    ...raw.invoices.map((i) => {
      const patched = localInvById.get(i.id)
      if (patched) return patched
      const centre = local.invoiceCentres[i.id]
      return centre ? { ...i, location: centre } : i
    }),
    ...local.invoices.filter((i) => !rawInvIds.has(i.id)),
  ]
  return {
    expenses: dedupe(raw.expenses, local.expenses),
    cashTxns: dedupe(raw.cashTxns, local.cashTxns),
    invoices,
    payments: dedupe(raw.payments, local.payments),
    customers: dedupe(raw.customers, local.customers),
    products: dedupe(raw.products, local.products),
  }
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = useState<Period>({ kind: 'all' })
  const [raw, setRaw] = useState<RawData | null>(null)
  const [local, setLocal] = useState<LocalData>(loadLocal)
  const [demo, setDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const migratedRef = useRef(false)

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

  const removeInvoice = useCallback<AccountState['removeInvoice']>((id) => {
    update((l) => ({ ...l, invoices: l.invoices.filter((i) => i.id !== id) }))
    if (isSupabaseConfigured) {
      void (async () => {
        const { error } = await supabase.from(TABLES.invoices).delete().eq('id', id)
        if (error) toast.error(`Could not delete in Supabase: ${error.message}`)
        await refresh()
      })()
    }
  }, [update, refresh])

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

  return (
    <AccountContext.Provider
      value={{
        period, setPeriod, data, demo, loading, refresh,
        backend: isSupabaseConfigured ? 'supabase' : 'local',
        invoiceCentres: local.invoiceCentres,
        localInvoiceIds,
        addCustomer, addProduct, addInvoice, removeInvoice, addExpense, addPayment, addCashTxn,
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
