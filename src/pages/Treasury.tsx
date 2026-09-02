import { useMemo, useState } from 'react'
import { Search, ArrowDownToLine, Wallet, Landmark, ArrowUpFromLine } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from '@/lib/AccountContext'
import { useSettings } from '@/lib/settings'
import { PageHeader, PageSkeleton } from '@/components/kimi/PageHeader'
import { KimiCard } from '@/components/kimi/Card'
import { KimiBadge } from '@/components/kimi/Badge'
import { KimiButton } from '@/components/kimi/Button'
import { KimiSegmentedControl } from '@/components/kimi/SegmentedControl'
import { QuickAdd } from '@/sections/QuickAdd'
import { EditCashDialog, EditExpenseDialog, EditPaymentDialog, RowActions } from '@/components/edit/EditDialogs'
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
import { formatINR } from '@/lib/data'
import type { CashTxnRow, ExpenseRow, LocationType, PaymentRow } from '@/types'

const today = () => new Date().toISOString().slice(0, 10)
const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0 ? n : null
}
const centreLabel = (l: LocationType) => (l === 'cochin' ? 'Cochin' : 'Calicut')

/* ---------- Bank Ledger (bank & other transactions) ---------- */

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

function BankLedger() {
  const { data, deleteExpense, deletePayment } = useAccount()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'all' | 'income' | 'expense'>('all')
  const [editExpense, setEditExpense] = useState<ExpenseRow | null>(null)
  const [editPayment, setEditPayment] = useState<PaymentRow | null>(null)

  const rows = useMemo<BankRow[]>(() => {
    if (!data) return []
    const all: BankRow[] = [
      ...data.expenses.map((e): BankRow => ({
        id: `e-${e.id}`, date: e.date, kind: 'expense',
        label: e.description || e.category,
        detail: [e.category, e.payment_mode, e.location ? centreLabel(e.location) : 'Company-wide'].filter(Boolean).join(' · '),
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

  return (
    <>
      <KimiCard pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
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
    </>
  )
}

/* ---------- FETS Cash (office petty cash per centre) ---------- */

function TransferDialog({ location, onClose }: { location: LocationType; onClose: () => void }) {
  const { addExpense, addCashTxn } = useAccount()
  const [form, setForm] = useState({ date: today(), amount: '', note: '' })
  const save = () => {
    const amount = num(form.amount)
    if (!amount) { toast.error('Enter a valid amount'); return }
    const centre = centreLabel(location)
    addExpense({
      date: form.date,
      amount,
      category: 'Cash Transfer',
      payment_mode: 'Cash Withdrawal',
      location,
      description: `Transfer to FETS Cash — ${centre}`,
    })
    addCashTxn({
      date: form.date,
      amount,
      type: 'replenishment',
      location,
      description: form.note || 'Transfer from bank ledger',
    })
    toast.success(`${formatINR(amount)} moved to FETS Cash — ${centre}`, {
      description: 'Bank ledger expense + cash top-up created',
    })
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer from bank → FETS Cash {centreLabel(location)}</DialogTitle>
          <DialogDescription>Records a cash withdrawal in the Bank Ledger and tops up this office cash account.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="tr-date">Date</Label>
              <Input id="tr-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tr-amount">Amount (₹)</Label>
              <Input id="tr-amount" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tr-note">Note</Label>
            <Input id="tr-note" placeholder="Optional" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Transfer</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CashSpendDialog({ location, onClose }: { location: LocationType; onClose: () => void }) {
  const { addCashTxn } = useAccount()
  const [form, setForm] = useState({ date: today(), amount: '', description: '' })
  const save = () => {
    const amount = num(form.amount)
    if (!amount) { toast.error('Enter a valid amount'); return }
    addCashTxn({
      date: form.date,
      amount,
      type: 'expense',
      location,
      description: form.description || 'Cash expense',
    })
    toast.success(`Cash expense recorded — ${centreLabel(location)}`)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cash expense — {centreLabel(location)}</DialogTitle>
          <DialogDescription>Spent from this office's FETS Cash in hand.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cs-date">Date</Label>
              <Input id="cs-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cs-amount">Amount (₹)</Label>
              <Input id="cs-amount" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cs-desc">What was it for?</Label>
            <Input id="cs-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save expense</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FetsCashDivision({ location }: { location: LocationType }) {
  const { data, deleteCashTxn } = useAccount()
  const [settings] = useSettings()
  const [transfer, setTransfer] = useState(false)
  const [spend, setSpend] = useState(false)
  const [editing, setEditing] = useState<CashTxnRow | null>(null)

  const opening = parseFloat(location === 'calicut' ? settings.openingCalicut : settings.openingCochin) || 0
  const entries = (data?.cashTxns ?? [])
    .filter((t) => t.location === location)
    .sort((a, b) => b.date.localeCompare(a.date))
  const movement = entries.reduce(
    (s, t) => s + (t.type === 'replenishment' ? t.amount : t.type === 'expense' ? -t.amount : t.amount),
    0
  )
  const balance = opening + movement

  return (
    <KimiCard pad={false} title={
      <span className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-[var(--f-gold-600)]" aria-hidden />
        FETS Cash — {centreLabel(location)}
      </span>
    }>
      <div className="grid grid-cols-3 gap-4 px-5 pt-3">
        <div>
          <p className="k-c1">Opening balance</p>
          <p className="text-[16px] font-semibold text-[var(--k-label-primary)]">{formatINR(opening)}</p>
        </div>
        <div>
          <p className="k-c1">Net movement</p>
          <p className={`text-[16px] font-semibold ${movement >= 0 ? 'text-[var(--f-emerald-700)]' : 'text-[var(--k-danger)]'}`}>
            {movement >= 0 ? '+' : '−'}{formatINR(Math.abs(movement))}
          </p>
        </div>
        <div>
          <p className="k-c1">Cash in hand</p>
          <p className="text-[16px] font-semibold text-[var(--f-emerald-700)]">{formatINR(balance)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 px-5 py-3">
        <KimiButton size={26} leftIcon={<ArrowDownToLine />} onClick={() => setTransfer(true)}>
          Transfer from bank
        </KimiButton>
        <KimiButton size={26} variant="outline" leftIcon={<ArrowUpFromLine />} onClick={() => setSpend(true)}>
          Cash expense
        </KimiButton>
      </div>

      {entries.length === 0 ? (
        <p className="k-b2-secondary px-5 py-8 text-center">No cash entries for {centreLabel(location)} yet.</p>
      ) : (
        <ul className="divide-y divide-[rgba(0,0,0,0.06)] border-t-[0.5px] border-[var(--k-separator)] px-5 pb-2">
          {entries.map((t) => {
            const signed = t.type === 'expense' ? -t.amount : t.amount
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="k-b2-em truncate">{t.description || (t.type === 'replenishment' ? 'Top-up' : 'Cash expense')}</p>
                  <p className="k-c1">
                    {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`k-b2-em ${signed >= 0 ? 'text-[var(--f-emerald-600)]' : 'text-[var(--k-danger)]'}`}>
                    {signed >= 0 ? '+' : '−'}{formatINR(Math.abs(signed))}
                  </span>
                  <KimiBadge tone={t.type === 'replenishment' ? 'green' : t.type === 'expense' ? 'red' : 'neutral'}>
                    {t.type === 'replenishment' ? 'Top-up' : t.type === 'expense' ? 'Spend' : 'Adjustment'}
                  </KimiBadge>
                  <RowActions
                    onEdit={() => setEditing(t)}
                    onDelete={() => deleteCashTxn(t.id)}
                    deleteTitle="Delete this cash entry?"
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {transfer && <TransferDialog location={location} onClose={() => setTransfer(false)} />}
      {spend && <CashSpendDialog location={location} onClose={() => setSpend(false)} />}
      {editing && <EditCashDialog txn={editing} onClose={() => setEditing(null)} />}
    </KimiCard>
  )
}

/* ---------- Treasury page ---------- */

export default function Treasury() {
  const { data, loading } = useAccount()
  const [tab, setTab] = useState<'ledger' | 'cash'>('ledger')

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  return (
    <>
      <PageHeader
        title="Treasury"
        description="Bank ledger and office cash, side by side"
        actions={<QuickAdd />}
      />
      <div className="mb-5">
        <KimiSegmentedControl
          ariaLabel="Treasury section"
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          options={[
            { value: 'ledger', label: '🏦 Bank Ledger' },
            { value: 'cash', label: '💵 FETS Cash' },
          ]}
        />
      </div>
      {tab === 'ledger' ? (
        <>
          <div className="mb-4 flex items-center gap-2">
            <Landmark className="h-5 w-5 text-[var(--f-emerald-600)]" aria-hidden />
            <h2 className="k-t2-em">Bank Ledger</h2>
            <span className="k-c1">— every bank &amp; non-cash transaction</span>
          </div>
          <BankLedger />
        </>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <FetsCashDivision location="calicut" />
          <FetsCashDivision location="cochin" />
        </div>
      )}
    </>
  )
}
