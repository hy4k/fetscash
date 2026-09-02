import { useMemo, useRef, useState } from 'react'
import { Search, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from '@/lib/AccountContext'
import { useSettings } from '@/lib/settings'
import { parseStatement, guessCategory, type StatementRow } from '@/lib/statement'
import { PageSkeleton } from '@/components/kimi/PageHeader'
import { KimiBadge } from '@/components/kimi/Badge'
import { KimiButton } from '@/components/kimi/Button'
import { KimiSegmentedControl } from '@/components/kimi/SegmentedControl'
import { PageHero, StatStrip, Pill, Kicker, M, StatusText } from '@/components/ledger'
import { EditExpenseDialog, EditPaymentDialog, RowActions } from '@/components/edit/EditDialogs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatINR } from '@/lib/data'
import type { ExpenseRow, PaymentRow } from '@/types'

const today = () => new Date().toISOString().slice(0, 10)
const PAYMENT_MODES = ['Bank Transfer', 'NEFT', 'SWIFT', 'UPI', 'Card', 'Cheque', 'Cash']

/* ---------- Statement upload ---------- */

function StatementUploadDialog({ onClose }: { onClose: () => void }) {
  const { data, importRows } = useAccount()
  const [settings] = useSettings()
  const [rows, setRows] = useState<StatementRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const existingKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const e of data?.expenses ?? []) keys.add(`${e.date}|${e.amount}|${(e.description ?? '').slice(0, 40)}`)
    for (const p of data?.payments ?? []) keys.add(`${p.payment_date}|${p.amount_inr || p.amount}|${(p.reference_number ?? '').slice(0, 40)}`)
    return keys
  }, [data])

  const onFile = async (f: File) => {
    setParsing(true)
    setFileName(f.name)
    try {
      const parsed = await parseStatement(f)
      if (parsed.length === 0) {
        toast.error('No transactions found in that file', { description: 'Check it is a bank statement with a Date / Debit / Credit table.' })
        setRows(null)
      } else {
        setRows(parsed)
        toast.success(`Found ${parsed.length} transactions in ${f.name}`)
      }
    } catch (err) {
      toast.error('Could not read the file', { description: err instanceof Error ? err.message : undefined })
      setRows(null)
    }
    setParsing(false)
  }

  const isDuplicate = (r: StatementRow) =>
    existingKeys.has(`${r.date}|${r.amount}|${(r.description ?? '').slice(0, 40)}`)

  const importable = (rows ?? []).filter((r) => !isDuplicate(r))

  const doImport = async () => {
    if (!rows) return
    setImporting(true)
    const expenses = importable.filter((r) => r.kind === 'expense').map((r) => ({
      date: r.date,
      amount: r.amount,
      category: guessCategory(r.description, settings.categories),
      payment_mode: 'Bank Transfer',
      description: r.description,
    }))
    const payments = importable.filter((r) => r.kind === 'income').map((r) => ({
      payment_date: r.date,
      amount: r.amount,
      amount_inr: r.amount,
      payment_method: 'Bank Transfer',
      reference_number: r.description.slice(0, 80),
    }))
    const ok = await importRows(expenses, payments)
    setImporting(false)
    if (ok) onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Upload bank statement</DialogTitle>
          <DialogDescription>Excel (.xls / .xlsx / .csv) or PDF from Federal Bank. Review rows, then import.</DialogDescription>
        </DialogHeader>

        {!rows && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[var(--k-separator)] px-6 py-12 text-[var(--k-label-secondary)] transition-colors hover:border-[var(--f-emerald-600)] hover:text-[var(--f-emerald-700)]"
          >
            {parsing ? <Loader2 className="h-8 w-8 animate-spin" aria-hidden /> : <Upload className="h-8 w-8" aria-hidden />}
            <span className="text-[14px] font-medium">{parsing ? `Reading ${fileName}…` : 'Choose statement file'}</span>
            <span className="text-[12px] text-[var(--k-label-tertiary)]">.xlsx · .xls · .csv · .pdf</span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f) }}
        />

        {rows && (
          <>
            <div className="max-h-[380px] overflow-auto rounded-xl border-[0.5px] border-[var(--k-separator)]">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-[var(--k-bg-primary)]">
                  <tr className="border-b-[0.5px] border-[var(--k-separator)]">
                    <th className="k-c1-em px-3 py-2 font-medium">Date</th>
                    <th className="k-c1-em px-3 py-2 font-medium">Narration</th>
                    <th className="k-c1-em px-3 py-2 font-medium">Type</th>
                    <th className="k-c1-em px-3 py-2 text-right font-medium">Amount</th>
                    <th className="k-c1-em px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
                  {rows.slice(0, 500).map((r, i) => (
                    <tr key={i} className={isDuplicate(r) ? 'opacity-40' : ''}>
                      <td className="k-b2-secondary whitespace-nowrap px-3 py-2">{r.date}</td>
                      <td className="k-b2 max-w-[300px] truncate px-3 py-2">{r.description}</td>
                      <td className="px-3 py-2">
                        <KimiBadge tone={r.kind === 'income' ? 'green' : 'red'}>{r.kind === 'income' ? 'Credit' : 'Debit'}</KimiBadge>
                      </td>
                      <td className="k-b2-em whitespace-nowrap px-3 py-2 text-right">{formatINR(r.amount)}</td>
                      <td className="k-c1 px-3 py-2">{isDuplicate(r) ? 'Duplicate — skipped' : 'New'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="k-c1">{importable.length} new · {(rows.length - importable.length)} duplicate{rows.length - importable.length === 1 ? '' : 's'} skipped</p>
          </>
        )}

        <DialogFooter>
          {rows && (
            <>
              <KimiButton variant="outline" onClick={() => { setRows(null); setFileName('') }}>Choose another file</KimiButton>
              <KimiButton onClick={() => void doImport()} loading={importing} disabled={importable.length === 0}>
                Import {importable.length} transactions
              </KimiButton>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Manual add (income or expense) ---------- */

function AddBankTxnDialog({ onClose }: { onClose: () => void }) {
  const { addExpense, addPayment } = useAccount()
  const [settings] = useSettings()
  const [form, setForm] = useState({
    kind: 'expense' as 'expense' | 'income',
    date: today(),
    amount: '',
    category: 'Misc',
    method: 'Bank Transfer',
    description: '',
  })
  const save = () => {
    const amount = parseFloat(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }
    if (form.kind === 'expense') {
      addExpense({ date: form.date, amount, category: form.category, payment_mode: form.method, description: form.description || form.category })
      toast.success('Expense added to the ledger')
    } else {
      addPayment({ payment_date: form.date, amount, amount_inr: amount, payment_method: form.method, reference_number: form.description || undefined })
      toast.success('Income added to the ledger')
    }
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add bank transaction</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <KimiSegmentedControl
            ariaLabel="Kind"
            value={form.kind}
            onChange={(v) => setForm({ ...form, kind: v as 'expense' | 'income' })}
            options={[{ value: 'expense', label: 'Expense (money out)' }, { value: 'income', label: 'Income (money in)' }]}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="bt-date">Date</Label>
              <Input id="bt-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bt-amount">Amount (₹)</Label>
              <Input id="bt-amount" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {form.kind === 'expense' && (
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {settings.categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Mode</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bt-desc">Narration / reference</Label>
            <Input id="bt-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Page ---------- */

type BankRow = {
  id: string
  date: string
  kind: 'income' | 'expense'
  label: string
  detail: string
  amount: number
  expense?: ExpenseRow
  payment?: PaymentRow
}

export default function BankLedger() {
  const { data, loading, deleteExpense, deletePayment } = useAccount()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'all' | 'income' | 'expense'>('all')
  const [editExpense, setEditExpense] = useState<ExpenseRow | null>(null)
  const [editPayment, setEditPayment] = useState<PaymentRow | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const rows = useMemo<BankRow[]>(() => {
    if (!data) return []
    const all: BankRow[] = [
      ...data.expenses.map((e): BankRow => ({
        id: `e-${e.id}`, date: e.date, kind: 'expense',
        label: e.description || e.category,
        detail: [e.category, e.payment_mode, e.location ? (e.location === 'cochin' ? 'Cochin' : 'Calicut') : 'Company-wide'].filter(Boolean).join(' · '),
        amount: -e.amount, expense: e,
      })),
      ...data.payments.map((p): BankRow => ({
        id: `p-${p.id}`, date: p.payment_date, kind: 'income',
        label: p.invoice_id ? `Payment received — ${p.invoice_id}` : 'Receipt (unmatched)',
        detail: [p.payment_method, p.reference_number, p.exchange_rate ? `@ ₹${p.exchange_rate}/$` : undefined].filter(Boolean).join(' · '),
        amount: p.amount_inr || p.amount, payment: p,
      })),
    ]
    return all
      .filter((r) => kind === 'all' || r.kind === kind)
      .filter((r) => !query || `${r.label} ${r.detail}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data, query, kind])

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  /* Auto-analysis — computed from the ledger (follows the global period selector) */
  const incomeTotal = data.payments.reduce((s, p) => s + (p.amount_inr || p.amount), 0)
  const expenseTotal = data.expenses.reduce((s, e) => s + e.amount, 0)
  const net = incomeTotal - expenseTotal
  const topCategories = [...data.categoryBreakdown].sort((a, b) => b.amount - a.amount).slice(0, 6)
  const maxCat = topCategories[0]?.amount || 1
  const incomeBySource = new Map<string, number>()
  for (const p of data.payments) {
    const src = p.invoice_id
      ? (data.invoices.find((i) => i.id === p.invoice_id)?.customer_name ?? p.invoice_id)
      : (p.reference_number || 'Direct receipt')
    incomeBySource.set(src, (incomeBySource.get(src) ?? 0) + (p.amount_inr || p.amount))
  }
  const topSources = [...incomeBySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  const miscCount = data.expenses.filter((e) => e.category === 'Misc').length

  return (
    <>
      <PageHero
        index="03"
        section="VAULT"
        title="Bank ledger"
        lede="Statement lines imported from Federal Bank, categorised and reconciled against invoices, cash and recurring schedules."
        actions={
          <>
            <Pill outline onClick={() => setAddOpen(true)}>Add transaction</Pill>
            <Pill onClick={() => setUploadOpen(true)}>Import statement</Pill>
          </>
        }
      />

      <StatStrip
        stats={[
          { label: `CREDITS · ${data.periodLabel.toUpperCase()}`, value: formatINR(incomeTotal), tone: 'green' },
          { label: `DEBITS · ${data.periodLabel.toUpperCase()}`, value: formatINR(expenseTotal) },
          { label: 'NET', value: `${net >= 0 ? '+' : '−'}${formatINR(Math.abs(net))}`, tone: net >= 0 ? 'green' : 'red' },
          { label: 'UNCATEGORISED', value: String(miscCount), tone: miscCount > 0 ? 'gold' : 'ink', sub: 'CATEGORY = MISC' },
        ]}
      />

      {/* Auto-analysis — where it went / who it came from */}
      <section className="grid border-b border-[var(--f-hairline)] lg:grid-cols-2">
        <div className="min-w-0 py-10 lg:pr-10">
          <Kicker className="mb-6">WHERE IT WENT · {data.periodLabel.toUpperCase()}</Kicker>
          {topCategories.length === 0 ? (
            <p className="k-b2-secondary py-4">No expenses in this period.</p>
          ) : (
            <div className="grid gap-5">
              {topCategories.map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between gap-4 text-[14px]">
                    <span>{c.category}</span>
                    <M>{formatINR(c.amount)}</M>
                  </div>
                  <div className="mt-2 h-[8px] bg-[rgba(17,23,19,0.08)]">
                    <div className="h-full bg-[var(--f-green)]" style={{ width: `${Math.max(2, (c.amount / maxCat) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="min-w-0 border-t border-[var(--f-hairline-soft)] py-10 lg:border-l lg:border-t-0 lg:pl-10">
          <Kicker className="mb-6">WHO IT CAME FROM · {data.periodLabel.toUpperCase()}</Kicker>
          {topSources.length === 0 ? (
            <p className="k-b2-secondary py-4">No income in this period.</p>
          ) : (
            <div className="grid gap-5">
              {topSources.map(([src, amt]) => (
                <div key={src}>
                  <div className="flex justify-between gap-4 text-[14px]">
                    <span className="min-w-0 truncate">{src}</span>
                    <M>{formatINR(amt)}</M>
                  </div>
                  <div className="mt-2 h-[8px] bg-[rgba(17,23,19,0.08)]">
                    <div className="h-full bg-[var(--f-gold)]" style={{ width: `${Math.max(2, (amt / (topSources[0]?.[1] || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Ledger */}
      <section className="pt-10">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
          <KimiSegmentedControl
            ariaLabel="Transaction type"
            size="sm"
            value={kind}
            onChange={(v) => setKind(v as typeof kind)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Expenses' },
            ]}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--k-label-quaternary)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the ledger"
              className="h-9 w-56 rounded-full border border-[var(--k-separator)] bg-[var(--f-card)] pl-8 pr-3 text-[14px] leading-5 text-[var(--k-label-primary)] placeholder:text-[var(--k-label-quaternary)] focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--f-green)]"
            />
          </div>
        </div>

        <div className="f-kicker grid grid-cols-[76px_minmax(0,1fr)_auto] gap-x-5 border-b border-[var(--f-hairline)] py-4 sm:grid-cols-[90px_minmax(0,1.6fr)_minmax(0,1fr)_90px_110px_60px]">
          <span>DATE</span><span>NARRATION</span>
          <span className="hidden sm:block">DETAILS</span>
          <span className="hidden sm:block">TYPE</span>
          <span className="text-right">AMOUNT</span>
          <span className="hidden text-right sm:block">EDIT</span>
        </div>

        {rows.length === 0 ? (
          <p className="k-b2-secondary py-12 text-center">
            {query ? `No transactions match “${query}”.` : 'No transactions yet.'}
          </p>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-x-5 border-b border-[var(--f-hairline-soft)] py-4 transition-colors hover:bg-[rgba(17,23,19,0.035)] sm:grid-cols-[90px_minmax(0,1.6fr)_minmax(0,1fr)_90px_110px_60px]"
            >
              <M className="text-[12px] text-[var(--k-label-secondary)]">
                {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}
              </M>
              <span className="truncate text-[14px] font-medium">{r.label}</span>
              <span className="hidden truncate text-[13px] text-[var(--k-label-secondary)] sm:block">{r.detail}</span>
              <span className="hidden sm:block">
                <StatusText tone={r.kind === 'income' ? 'green' : 'muted'}>{r.kind === 'income' ? 'CREDIT' : 'DEBIT'}</StatusText>
              </span>
              <M className={`whitespace-nowrap text-right text-[13px] ${r.amount >= 0 ? 'text-[var(--f-green)]' : ''}`}>
                {r.amount >= 0 ? '+' : '−'}{formatINR(Math.abs(r.amount))}
              </M>
              <span className="hidden justify-end sm:flex">
                {r.expense && (
                  <RowActions
                    onEdit={() => setEditExpense(r.expense!)}
                    onDelete={() => deleteExpense(r.expense!.id)}
                    deleteTitle="Delete this expense?"
                  />
                )}
                {r.payment && (
                  <RowActions
                    onEdit={() => setEditPayment(r.payment!)}
                    onDelete={() => deletePayment(r.payment!.id)}
                    deleteTitle="Delete this receipt?"
                    deleteDescription={r.payment!.invoice_id
                      ? `Linked to invoice ${r.payment!.invoice_id} — the invoice's received total will not change automatically.`
                      : 'This cannot be undone.'}
                  />
                )}
              </span>
            </div>
          ))
        )}
        <p className="f-mono py-4 text-[11px] tracking-[0.10em] text-[var(--k-label-tertiary)]">
          {rows.length} RECORD{rows.length === 1 ? '' : 'S'}
        </p>
      </section>
      {editExpense && <EditExpenseDialog expense={editExpense} onClose={() => setEditExpense(null)} />}
      {editPayment && <EditPaymentDialog payment={editPayment} onClose={() => setEditPayment(null)} />}
      {uploadOpen && <StatementUploadDialog onClose={() => setUploadOpen(false)} />}
      {addOpen && <AddBankTxnDialog onClose={() => setAddOpen(false)} />}
    </>
  )
}
