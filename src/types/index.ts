export type LocationType = 'cochin' | 'calicut'

export type PeriodKind = 'all' | 'month' | 'last-month' | '3m' | 'custom'

export interface Period {
  kind: PeriodKind
  start?: string // ISO, custom only
  end?: string   // ISO, custom only
}

export interface ExpenseRow {
  id: string
  location?: LocationType
  date: string
  amount: number
  category: string
  paid_by?: string
  payment_mode?: string
  description?: string
}

export interface CashTxnRow {
  id: string
  location?: LocationType
  type: 'replenishment' | 'expense' | 'adjustment'
  description?: string
  category?: string
  amount: number
  date: string
}

export interface CustomerRow {
  id: string
  name: string
}

export interface CustomerFull {
  id: string
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  tax_id?: string
  balance: number
  total_invoices: number
  unpaid_invoices: number
}

export interface ProductRow {
  id: string
  name: string
  hsn?: string
  buy_rate: number
  sale_rate: number
  description?: string
  tax_list?: string
}

export interface InvoiceItemRow {
  invoice_number: string
  item: string
  qty: number
  rate: number
  amount: number
  description?: string
}

export interface InvoiceRow {
  id: string
  invoice_number: string
  customer_id?: string
  customer_name?: string
  client_label?: string
  invoice_date: string
  due_date?: string
  currency: string
  total_amount: number
  paid_amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid'
  items?: InvoiceItemRow[]
  location?: LocationType
  exchange_rate?: number
  original_amount?: number
  original_currency?: string
  payment_date?: string
}

export interface PaymentRow {
  id: string
  invoice_id?: string
  payment_date: string
  amount: number
  amount_inr: number
  payment_method?: string
  reference_number?: string
  exchange_rate?: number
}

export interface MonthlyPoint {
  month: string // short label e.g. "Mar"
  income: number
  expenses: number
}

export interface CategoryPoint {
  category: string
  amount: number
}

export interface ActivityItem {
  id: string
  date: string
  kind: 'income' | 'expense' | 'cash' | 'invoice'
  label: string
  detail?: string
  amount: number // signed: + money in, - money out
}

export interface AccountData {
  cashBalance: number
  cashByLocation: { cochin: number; calicut: number }
  monthIncome: number
  monthExpenses: number
  monthNet: number
  incomeLabel: 'Income' | 'Invoiced'
  outstandingTotal: number
  outstandingCount: number
  monthly: MonthlyPoint[]
  activity: ActivityItem[]
  unpaidInvoices: InvoiceRow[]
  expenses: ExpenseRow[]
  payments: PaymentRow[]
  invoices: InvoiceRow[]
  cashTxns: CashTxnRow[]
  categoryBreakdown: CategoryPoint[]
  clientBreakdown: CategoryPoint[]
  customers: CustomerFull[]
  products: ProductRow[]
  periodLabel: string
  currency: string
}
