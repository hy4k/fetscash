import { supabase, isSupabaseConfigured } from './supabase'
import importedJson from '@/data/imported.json'
import type {
  AccountData,
  ActivityItem,
  CashTxnRow,
  CategoryPoint,
  CustomerFull,
  ExpenseRow,
  InvoiceRow,
  LocationType,
  MonthlyPoint,
  PaymentRow,
  Period,
  ProductRow,
} from '@/types'

/** Supabase tables (isolated acc_ schema — see supabase-setup.sql). */
export const TABLES = {
  customers: 'acc_customers',
  products: 'acc_products',
  invoices: 'acc_invoices',
  payments: 'acc_payments',
  expenses: 'acc_expenses',
  cashTxns: 'acc_cash_transactions',
  centres: 'acc_invoice_centres',
} as const

const loc = (v: unknown): LocationType | undefined =>
  v === 'cochin' ? 'cochin' : v === 'calicut' ? 'calicut' : undefined

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthKey(d: string | Date) {
  const dt = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(dt.getTime())) return ''
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(k: string) {
  const [y, m] = k.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

function addTo(map: Map<string, number>, key: string, amt: number) {
  if (!key) return
  map.set(key, (map.get(key) ?? 0) + amt)
}

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDay(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** Resolve a Period to an inclusive [start, end] ISO day range (null = unbounded). */
export function periodRange(period: Period): { start: string | null; end: string | null; label: string } {
  const now = new Date()
  switch (period.kind) {
    case 'month': {
      return { start: isoDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: isoDay(now), label: 'This month' }
    }
    case 'last-month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const e = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start: isoDay(s), end: isoDay(e), label: s.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) }
    }
    case '3m': {
      const s = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      return { start: isoDay(s), end: isoDay(now), label: 'Last 3 months' }
    }
    case 'custom': {
      const start = period.start || null
      const end = period.end || null
      const label = start && end ? `${fmtDay(start)} – ${fmtDay(end)}` : 'Custom range'
      return { start, end, label }
    }
    default:
      return { start: null, end: null, label: 'All time' }
  }
}

function within(date: string, start: string | null, end: string | null) {
  if (!date) return false
  if (start && date < start) return false
  if (end && date > end) return false
  return true
}

// ---------- Raw data ----------

export interface RawData {
  expenses: ExpenseRow[]
  cashTxns: CashTxnRow[]
  invoices: InvoiceRow[]
  payments: PaymentRow[]
  customers: CustomerFull[]
  products: ProductRow[]
}

interface ImportedPayload {
  source: string
  customers: CustomerFull[]
  invoices: InvoiceRow[]
  products: ProductRow[]
  payments?: PaymentRow[]
  expenses?: { id: string; date: string; category: string; type: string; amount: number; description: string }[]
}

function rawFromImported(): RawData | null {
  const payload = importedJson as unknown as ImportedPayload
  if ((payload.invoices?.length ?? 0) === 0 && (payload.customers?.length ?? 0) === 0) return null
  return {
    expenses: (payload.expenses ?? []).map((e) => ({
      id: e.id,
      date: e.date,
      amount: e.amount,
      category: e.category,
      description: e.description,
    })),
    cashTxns: [],
    invoices: payload.invoices.map((i) => ({
      ...i,
      currency: 'INR',
      customer_name: i.customer_name || i.client_label,
    })),
    payments: (payload.payments ?? []).map((p) => ({
      id: p.id,
      invoice_id: p.invoice_id,
      payment_date: p.payment_date,
      amount: Number(p.amount) || 0,
      amount_inr: Number(p.amount_inr ?? p.amount) || 0,
      payment_method: p.payment_method,
      reference_number: p.reference_number,
      exchange_rate: p.exchange_rate,
    })),
    customers: payload.customers ?? [],
    products: payload.products ?? [],
  }
}

async function rawFromSupabase(): Promise<RawData> {
  const [expRes, cashRes, invRes, payRes, custRes, prodRes, centreRes] = await Promise.all([
    supabase.from(TABLES.expenses).select('*').order('date', { ascending: false }).limit(5000),
    supabase.from(TABLES.cashTxns).select('*').order('date', { ascending: false }).limit(2000),
    supabase.from(TABLES.invoices).select('*').order('invoice_date', { ascending: false }).limit(2000),
    supabase.from(TABLES.payments).select('*').order('payment_date', { ascending: false }).limit(5000),
    supabase.from(TABLES.customers).select('*').limit(1000),
    supabase.from(TABLES.products).select('*').limit(1000),
    supabase.from(TABLES.centres).select('*').limit(2000),
  ])

  const err = expRes.error || cashRes.error || invRes.error || payRes.error || custRes.error || prodRes.error || centreRes.error
  if (err) throw new Error(err.message)

  const centreMap = new Map<string, LocationType>()
  for (const r of centreRes.data ?? []) {
    const c = loc(r.centre)
    if (c) centreMap.set(String(r.invoice_id), c)
  }

  return {
    expenses: (expRes.data ?? []).map((r: any) => ({
      id: String(r.id),
      location: loc(r.location),
      date: r.date,
      amount: Number(r.amount) || 0,
      category: r.category ?? 'General',
      paid_by: r.paid_by ?? undefined,
      payment_mode: r.payment_mode ?? undefined,
      description: r.description ?? undefined,
    })),
    cashTxns: (cashRes.data ?? []).map((r: any) => ({
      id: String(r.id),
      location: loc(r.location),
      type: (r.type as CashTxnRow['type']) ?? 'expense',
      description: r.description ?? undefined,
      amount: Number(r.amount) || 0,
      date: r.date,
    })),
    invoices: (invRes.data ?? []).map((r: any) => ({
      id: String(r.id),
      invoice_number: r.invoice_number ?? '—',
      customer_id: r.customer_id ?? undefined,
      customer_name: r.customer_name ?? undefined,
      client_label: r.client_label ?? undefined,
      invoice_date: r.invoice_date,
      due_date: r.due_date ?? undefined,
      currency: r.currency ?? 'INR',
      total_amount: Number(r.total_amount) || 0,
      paid_amount: Number(r.paid_amount) || 0,
      status: (r.status as InvoiceRow['status']) ?? 'sent',
      items: Array.isArray(r.items) ? r.items : undefined,
      location: centreMap.get(String(r.id)) ?? loc(r.location),
      exchange_rate: r.exchange_rate != null ? Number(r.exchange_rate) : undefined,
      original_amount: r.original_amount != null ? Number(r.original_amount) : undefined,
      original_currency: r.original_currency ?? undefined,
      payment_date: r.payment_date ?? undefined,
    })),
    payments: (payRes.data ?? []).map((r: any) => ({
      id: String(r.id),
      invoice_id: r.invoice_id ?? undefined,
      payment_date: r.payment_date,
      amount: Number(r.amount) || 0,
      amount_inr: Number(r.amount_inr ?? r.amount) || 0,
      payment_method: r.payment_method ?? undefined,
      reference_number: r.reference_number ?? undefined,
      exchange_rate: r.exchange_rate != null ? Number(r.exchange_rate) : undefined,
    })),
    customers: (custRes.data ?? []).map((r: any) => ({
      id: String(r.id),
      name: r.name,
      contact_person: r.contact_person ?? undefined,
      email: r.email ?? undefined,
      phone: r.phone ?? undefined,
      address: r.address ?? undefined,
      tax_id: r.tax_id ?? undefined,
      balance: Number(r.balance) || 0,
      total_invoices: Number(r.total_invoices) || 0,
      unpaid_invoices: Number(r.unpaid_invoices) || 0,
    })),
    products: (prodRes.data ?? []).map((r: any) => ({
      id: String(r.id),
      name: r.name,
      hsn: r.hsn ?? undefined,
      buy_rate: Number(r.buy_rate) || 0,
      sale_rate: Number(r.sale_rate) || 0,
      description: r.description ?? undefined,
      tax_list: r.tax_list ?? undefined,
    })),
  }
}

function rawDemo(): RawData {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const d = (monthsAgo: number, day: number) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.min(day, 28))
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
  }
  return {
    expenses: [
      { id: 'e1', date: d(0, 3), amount: 4200, category: 'Utilities', description: 'Electricity bill', payment_mode: 'UPI' },
      { id: 'e3', date: d(0, 8), amount: 12500, category: 'Rent', description: 'Centre rent', payment_mode: 'Bank Transfer' },
      { id: 'e6', date: d(1, 6), amount: 6400, category: 'Maintenance', description: 'AC servicing', payment_mode: 'Card' },
      { id: 'e10', date: d(3, 3), amount: 12500, category: 'Rent', description: 'Centre rent', payment_mode: 'Bank Transfer' },
    ],
    cashTxns: [
      { id: 'c1', type: 'replenishment', date: d(0, 1), amount: 15000, description: 'Petty cash top-up' },
      { id: 'c2', type: 'expense', date: d(0, 6), amount: 2100, description: 'Office supplies' },
    ],
    invoices: [
      { id: 'i1', invoice_number: 'KP-42', customer_name: 'Prometric', invoice_date: d(0, 2), due_date: d(0, 25), currency: 'USD', total_amount: 94500, paid_amount: 0, status: 'sent' },
      { id: 'i4', invoice_number: 'KP-39', customer_name: 'Prometric', invoice_date: d(2, 3), due_date: d(1, 5), currency: 'USD', total_amount: 88200, paid_amount: 88200, status: 'paid' },
    ],
    payments: [
      { id: 'p1', payment_date: d(0, 6), amount: 60000, amount_inr: 60000, payment_method: 'Wire', reference_number: 'UTR8834120' },
      { id: 'p2', payment_date: d(1, 8), amount: 88200, amount_inr: 88200, payment_method: 'SWIFT', reference_number: 'FT24188PROM' },
    ],
    customers: [],
    products: [],
  }
}

export async function loadRawData(): Promise<{ raw: RawData; demo: boolean }> {
  if (isSupabaseConfigured) {
    try {
      return { raw: await rawFromSupabase(), demo: false }
    } catch (e) {
      console.warn('[fets-accounts] Supabase fetch failed, falling back to imported data:', e)
    }
  }
  const imported = rawFromImported()
  if (imported) return { raw: imported, demo: false }
  return { raw: rawDemo(), demo: true }
}

// ---------- Compute AccountData for a period ----------

export function computeAccountData(raw: RawData, period: Period): AccountData {
  const { start, end, label } = periodRange(period)
  const scoped = period.kind !== 'all'

  const expenses = raw.expenses.filter((e) => within(e.date, start, end))
  const payments = raw.payments.filter((p) => within(p.payment_date, start, end))
  const invoices = raw.invoices.filter((i) => within(i.invoice_date, start, end))
  const cash = raw.cashTxns.filter((t) => within(t.date, start, end))

  // Balances & outstanding are current-state figures — always all-time.
  const cashBalance = raw.cashTxns.reduce((sum, t) => {
    if (t.type === 'replenishment') return sum + t.amount
    if (t.type === 'expense') return sum - t.amount
    return sum + t.amount
  }, 0)
  const cashByLocation = { cochin: 0, calicut: 0 }
  for (const t of raw.cashTxns) {
    const signed = t.type === 'replenishment' ? t.amount : t.type === 'expense' ? -t.amount : t.amount
    if (t.location === 'cochin') cashByLocation.cochin += signed
    else cashByLocation.calicut += signed
  }
  cashByLocation.cochin = Math.round(cashByLocation.cochin)
  cashByLocation.calicut = Math.round(cashByLocation.calicut)

  const unpaid = raw.invoices.filter(
    (i) => i.status !== 'paid' && i.status !== 'cancelled' && i.total_amount - i.paid_amount > 0
  )
  const outstandingTotal = unpaid.reduce((s, i) => s + (i.total_amount - i.paid_amount), 0)

  // Income proxy: payments when present, else invoiced amounts.
  const incomeIsBilled = raw.payments.length === 0
  const incomeLabel: AccountData['incomeLabel'] = incomeIsBilled ? 'Invoiced' : 'Income'
  const incomeOf = (list: typeof invoices | typeof payments) =>
    incomeIsBilled
      ? (list as typeof invoices).reduce((s, i) => s + (i as InvoiceRow).total_amount, 0)
      : (list as typeof payments).reduce((s, p) => s + ((p as PaymentRow).amount_inr || (p as PaymentRow).amount), 0)

  const now = new Date()
  const refMonthKey = monthKey(end ?? isoDay(now))
  let monthIncome: number
  let monthExpenses: number
  if (scoped) {
    monthIncome = incomeIsBilled ? incomeOf(invoices) : incomeOf(payments)
    monthExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  } else {
    monthIncome = incomeIsBilled
      ? raw.invoices.filter((i) => monthKey(i.invoice_date) === refMonthKey).reduce((s, i) => s + i.total_amount, 0)
      : raw.payments.filter((p) => monthKey(p.payment_date) === refMonthKey).reduce((s, p) => s + (p.amount_inr || p.amount), 0)
    monthExpenses = raw.expenses.filter((e) => monthKey(e.date) === refMonthKey).reduce((s, e) => s + e.amount, 0)
  }

  // Monthly chart series: months inside the period (max 12), or trailing 6 for all-time.
  const monthKeys: string[] = []
  if (scoped && start && end) {
    const cursor = new Date(start + 'T00:00:00')
    const endKey = monthKey(end)
    while (monthKey(cursor) <= endKey && monthKeys.length < 12) {
      monthKeys.push(monthKey(cursor))
      cursor.setMonth(cursor.getMonth() + 1)
    }
  } else {
    const anchor = end ? new Date(end + 'T00:00:00') : now
    for (let i = 5; i >= 0; i--) {
      monthKeys.push(monthKey(new Date(anchor.getFullYear(), anchor.getMonth() - i, 1)))
    }
  }

  const incomeByMonth = new Map<string, number>()
  const expenseByMonth = new Map<string, number>()
  if (incomeIsBilled) {
    for (const i of invoices) addTo(incomeByMonth, monthKey(i.invoice_date), i.total_amount)
  } else {
    for (const p of payments) addTo(incomeByMonth, monthKey(p.payment_date), p.amount_inr || p.amount)
  }
  for (const e of expenses) addTo(expenseByMonth, monthKey(e.date), e.amount)
  const monthly: MonthlyPoint[] = monthKeys.map((k) => ({
    month: monthLabel(k),
    income: Math.round(incomeByMonth.get(k) ?? 0),
    expenses: Math.round(expenseByMonth.get(k) ?? 0),
  }))

  const byCategory = new Map<string, number>()
  for (const e of expenses) addTo(byCategory, e.category || 'General', e.amount)
  const categoryBreakdown: CategoryPoint[] = [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)

  const byClient = new Map<string, number>()
  for (const i of invoices) addTo(byClient, i.customer_name || 'Unknown', i.total_amount)
  const clientBreakdown: CategoryPoint[] = [...byClient.entries()]
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)

  const activity: ActivityItem[] = [
    ...expenses.map((e): ActivityItem => ({
      id: `exp-${e.id}`,
      date: e.date,
      kind: 'expense',
      label: e.description || e.category || 'Expense',
      detail: e.category,
      amount: -e.amount,
    })),
    ...payments.map((p): ActivityItem => ({
      id: `pay-${p.id}`,
      date: p.payment_date,
      kind: 'income',
      label: 'Payment received',
      detail: [p.payment_method, p.reference_number].filter(Boolean).join(' · ') || undefined,
      amount: p.amount_inr || p.amount,
    })),
    ...cash.map((t): ActivityItem => ({
      id: `cash-${t.id}`,
      date: t.date,
      kind: 'cash',
      label: t.type === 'replenishment' ? 'Cash replenishment' : t.type === 'adjustment' ? 'Cash adjustment' : 'Cash expense',
      detail: t.description || undefined,
      amount: t.type === 'expense' ? -t.amount : t.amount,
    })),
    ...invoices.map((i): ActivityItem => ({
      id: `inv-${i.id}`,
      date: i.invoice_date,
      kind: 'invoice',
      label: `Invoice ${i.invoice_number}`,
      detail: i.customer_name,
      amount: i.total_amount,
    })),
  ]
    .filter((a) => a.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12)

  return {
    cashBalance: Math.round(cashBalance),
    cashByLocation,
    monthIncome: Math.round(monthIncome),
    monthExpenses: Math.round(monthExpenses),
    monthNet: Math.round(monthIncome - monthExpenses),
    incomeLabel,
    outstandingTotal: Math.round(outstandingTotal),
    outstandingCount: unpaid.length,
    monthly,
    activity,
    unpaidInvoices: unpaid.sort((a, b) => b.invoice_date.localeCompare(a.invoice_date)).slice(0, 8),
    expenses,
    payments,
    invoices,
    cashTxns: cash,
    categoryBreakdown,
    clientBreakdown,
    customers: raw.customers,
    products: raw.products,
    periodLabel: scoped ? label : 'This month',
    currency: 'INR',
  }
}

export function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}
