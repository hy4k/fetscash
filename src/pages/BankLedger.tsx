import { useMemo, useRef, useState } from 'react'
import { Search, Landmark, Upload, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from '@/lib/AccountContext'
import { useSettings } from '@/lib/settings'
import { parseStatement, guessCategory, type StatementRow } from '@/lib/statement'
import { PageHeader, PageSkeleton } from '@/components/kimi/PageHeader'
import { KimiCard } from '@/components/kimi/Card'
import { KimiBadge } from '@/components/kimi/Badge'
import { KimiButton } from '@/components/kimi/Button'
import { KimiSegmentedControl } from '@/components/kimi/SegmentedControl'
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

  return (
    <>
      <PageHeader
        title="Vault"
        description="Bank ledger with auto-analysis — upload a statement or add manually"
        actions={
          <div className="flex items-center gap-2">
            <KimiButton variant="outline" leftIcon={<Plus />} onClick={() => setAddOpen(true)}>Add transaction</KimiButton>
            <KimiButton leftIcon={<Upload />} onClick={() => setUploadOpen(true)}>Upload statement</KimiButton>
          </div>
        }
      />

      {/* Auto-analysis strip */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="k-card p-5">
          <p className="k-b2-secondary">Income ({data.periodLabel})</p>
          <p className="mt-1 text-[20px] font-semibold leading-[30px] text-[var(--f-emerald-700)]">{formatINR(incomeTotal)}</p>
        </div>
        <div className="k-card p-5">
          <p className="k-b2-secondary">Expenses ({data.periodLabel})</p>
          <p className="mt-1 text-[20px] font-semibold leading-[30px] text-[var(--k-danger)]">{formatINR(expenseTotal)}</p>
        </div>
        <div className="k-card p-5">
          <p className="k-b2-secondary">Net ({data.periodLabel})</p>
          <p className={`mt-1 text-[20px] font-semibold leading-[30px] ${net >= 0 ? 'text-[var(--f-emerald-700)]' : 'text-[var(--k-danger)]'}`}>
            {net >= 0 ? '+' : '−'}{formatINR(Math.abs(net))}
          </p>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <KimiCard title="Expenses by category">
          {topCategories.length === 0 ? (
            <p className="k-b2-secondary py-4 text-center">No expenses in this period.</p>
          ) : (
            <div className="space-y-2.5 pt-1">
              {topCategories.map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[var(--k-label-secondary)]">{c.category}</span>
                    <span className="font-medium">{formatINR(c.amount)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--k-fill-f1)]">
                    <div className="h-full rounded-full bg-[var(--f-emerald-600)]" style={{ width: `${Math.max(4, (c.amount / maxCat) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </KimiCard>
        <KimiCard title="Income by source">
          {topSources.length === 0 ? (
            <p className="k-b2-secondary py-4 text-center">No income in this period.</p>
          ) : (
            <ul className="space-y-2 pt-1">
              {topSources.map(([src, amt]) => (
                <li key={src} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate text-[var(--k-label-secondary)]">{src}</span>
                  <span className="shrink-0 font-medium text-[var(--f-emerald-700)]">{formatINR(amt)}</span>
                </li>
              ))}
            </ul>
          )}
        </KimiCard>
      </div>

      <KimiCard pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-[var(--f-emerald-600)]" aria-hidden />
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
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--k-label-quaternary)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the ledger"
              className="h-8 w-56 rounded-[10px] border-[0.5px] border-[var(--k-separator)] bg-[var(--k-bg-primary)] pl-8 pr-3 text-[14px] leading-5 text-[var(--k-label-primary)] placeholder:text-[var(--k-label-quaternary)] focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--k-blue)]"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="k-b2-secondary px-5 py-12 text-center">
            {query ? `No transactions match “${query}”.` : 'No transactions yet.'}
          </p>
        ) : (
          <table className="mt-3 w-full text-left">
            <thead>
              <tr className="border-b-[0.5px] border-[var(--k-separator)]">
                <th className="k-c1-em px-5 py-2 font-medium">Date</th>
                <th className="k-c1-em px-3 py-2 font-medium">Description</th>
                <th className="k-c1-em hidden px-3 py-2 font-medium md:table-cell">Details</th>
                <th className="k-c1-em px-3 py-2 font-medium">Type</th>
                <th className="k-c1-em px-3 py-2 text-right font-medium">Amount</th>
                <th className="k-c1-em px-5 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors duration-150 hover:bg-[var(--k-fill-f1)]">
                  <td className="k-b2-secondary whitespace-nowrap px-5 py-3">
                    {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="k-b2-em max-w-[280px] truncate px-3 py-3">{r.label}</td>
                  <td className="k-b2-secondary hidden max-w-[220px] truncate px-3 py-3 md:table-cell">{r.detail}</td>
                  <td className="px-3 py-3">
                    <KimiBadge tone={r.kind === 'income' ? 'green' : 'red'}>
                      {r.kind === 'income' ? 'Income' : 'Expense'}
                    </KimiBadge>
                  </td>
                  <td className={`k-b2-em whitespace-nowrap px-3 py-3 text-right ${r.amount >= 0 ? 'text-[var(--f-emerald-600)]' : 'text-[var(--k-danger)]'}`}>
                    {r.amount >= 0 ? '+' : '−'}{formatINR(Math.abs(r.amount))}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="k-c1 px-5 py-3">{rows.length} record{rows.length === 1 ? '' : 's'}</p>
      </KimiCard>
      {editExpense && <EditExpenseDialog expense={editExpense} onClose={() => setEditExpense(null)} />}
      {editPayment && <EditPaymentDialog payment={editPayment} onClose={() => setEditPayment(null)} />}
      {uploadOpen && <StatementUploadDialog onClose={() => setUploadOpen(false)} />}
      {addOpen && <AddBankTxnDialog onClose={() => setAddOpen(false)} />}
    </>
  )
}
