import { useMemo, useState } from 'react'
import { Paperclip, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from '@/lib/AccountContext'
import { useSettings } from '@/lib/settings'
import { useReimbursements, type ReimbEntry } from '@/lib/reimburse'
import { PageHero, StatStrip, Pill, Kicker, M, StatusText } from '@/components/ledger'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { cn } from '@/lib/utils'

const today = () => new Date().toISOString().slice(0, 10)
const MAX_RECEIPT = 2 * 1024 * 1024 // 2 MB

function AddClaimDialog({ add, onClose }: { add: (e: Omit<ReimbEntry, 'id'>) => Promise<boolean>; onClose: () => void }) {
  const [settings] = useSettings()
  const [form, setForm] = useState({
    person: settings.reimbursePersons[0] ?? 'Me',
    date: today(),
    amount: '',
    category: 'Misc',
    description: '',
  })
  const [receipt, setReceipt] = useState<{ name: string; data: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const onFile = (f: File) => {
    if (f.size > MAX_RECEIPT) { toast.error('Receipt too large (max 2 MB)'); return }
    const reader = new FileReader()
    reader.onload = () => setReceipt({ name: f.name, data: String(reader.result) })
    reader.readAsDataURL(f)
  }

  const save = async () => {
    const amount = parseFloat(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    const ok = await add({
      person: form.person,
      date: form.date,
      amount,
      category: form.category,
      description: form.description || undefined,
      receipt_name: receipt?.name,
      receipt_data: receipt?.data,
    })
    setSaving(false)
    if (ok) { toast.success(`Claim added for ${form.person}`); onClose() }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add reimbursement claim</DialogTitle>
          <DialogDescription>Money spent personally for the company.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Spent by</Label>
              <Select value={form.person} onValueChange={(v) => setForm({ ...form, person: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {settings.reimbursePersons.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rc-date">Date</Label>
              <Input id="rc-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rc-amount">Amount (₹)</Label>
              <Input id="rc-amount" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {settings.categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rc-desc">What was it for?</Label>
            <Input id="rc-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Receipt / document (optional, max 2 MB)</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--k-separator)] px-3 py-2.5 text-[13px] text-[var(--k-label-secondary)] hover:border-[var(--f-green)]">
              <Paperclip className="h-4 w-4" aria-hidden />
              {receipt ? receipt.name : 'Attach image or PDF'}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Pill small onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save claim'}</Pill>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PersonLedger({ person, entries, onSettle, onDelete }: {
  person: string
  entries: ReimbEntry[]
  onSettle: (person: string) => void
  onDelete: (id: string) => void
}) {
  const unsettled = entries.filter((e) => !e.settled_on)
  const settled = entries.filter((e) => e.settled_on)
  const due = unsettled.reduce((s, e) => s + e.amount, 0)

  const row = (e: ReimbEntry) => (
    <div
      key={e.id}
      className="grid grid-cols-[76px_minmax(0,1fr)_auto_auto] items-center gap-4 border-t border-[var(--f-hairline-soft)] py-3 transition-colors hover:bg-[rgba(17,23,19,0.035)]"
    >
      <M className="text-[11.5px] text-[var(--k-label-tertiary)]">
        {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}
      </M>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium">{e.description || e.category || 'Claim'}</p>
        {e.settled_on && (
          <p className="k-c1 mt-0.5">settled {new Date(e.settled_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
        )}
      </div>
      <span className="flex items-center gap-2">
        {e.receipt_data && (
          <a
            href={e.receipt_data}
            target="_blank"
            rel="noreferrer"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--k-label-tertiary)] hover:bg-[var(--k-fill-f2)] hover:text-[var(--f-green)]"
            title={e.receipt_name ?? 'View receipt'}
          >
            <Paperclip className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
        <M className="text-[13px]">{formatINR(e.amount)}</M>
      </span>
      {e.settled_on ? (
        <StatusText tone="green">SETTLED</StatusText>
      ) : (
        <button
          type="button"
          title="Delete claim"
          onClick={() => onDelete(e.id)}
          className="flex h-7 w-7 items-center justify-center justify-self-end rounded-lg text-[var(--k-label-tertiary)] hover:bg-[var(--k-fill-f2)] hover:text-[var(--k-danger)]"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  )

  return (
    <section>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-[var(--f-hairline)] pb-5">
        <h2 className="m-0 text-[clamp(26px,2.8vw,38px)] font-medium tracking-[-0.02em]">{person}</h2>
        <M className="text-[12px] tracking-[0.10em] text-[var(--k-label-tertiary)]">
          {unsettled.length} OPEN · {settled.length} SETTLED
        </M>
        <span className="flex-1" />
        <M className={cn('text-[clamp(22px,2.4vw,30px)] font-medium', due > 0 ? 'text-[var(--f-gold-dark)]' : 'text-[var(--k-label-quaternary)]')}>
          {formatINR(due)}
        </M>
        <Pill small outline disabled={due <= 0} onClick={() => onSettle(person)}>
          Settle {due > 0 ? formatINR(due) : ''}
        </Pill>
      </div>
      {entries.length === 0 ? (
        <p className="k-b2-secondary py-8 text-center">No claims yet.</p>
      ) : (
        <div className="pt-2">
          {unsettled.map(row)}
          {settled.length > 0 && (
            <>
              <Kicker className="pb-1 pt-5">SETTLED HISTORY</Kicker>
              <div className="opacity-70">{settled.map(row)}</div>
            </>
          )}
        </div>
      )}
    </section>
  )
}

/** Twelve-month claim history per person — darker square = more claimed that month. */
function AnalysisDialog({ entries, persons, onClose }: { entries: ReimbEntry[]; persons: string[]; onClose: () => void }) {
  const months = useMemo(() => {
    const now = new Date()
    const arr: string[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return arr
  }, [])

  const rows = persons.map((p) => {
    const mine = entries.filter((e) => e.person === p)
    const byMonth = months.map((mo) =>
      mine.filter((e) => e.date.startsWith(mo)).reduce((s, e) => s + e.amount, 0)
    )
    const openAmt = mine.filter((e) => !e.settled_on).reduce((s, e) => s + e.amount, 0)
    const settledAmt = mine.filter((e) => e.settled_on).reduce((s, e) => s + e.amount, 0)
    return { p, byMonth, openAmt, settledAmt, total: openAmt + settledAmt, count: mine.length }
  })
  const maxCell = Math.max(1, ...rows.flatMap((r) => r.byMonth))
  const monthTotals = months.map((_, i) => rows.reduce((s, r) => s + r.byMonth[i], 0))
  const grand = rows.reduce((s, r) => s + r.total, 0)
  const abbr = (mo: string) => new Date(mo + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Claims analysis</DialogTitle>
        </DialogHeader>
        <p className="k-b2-secondary -mt-1">
          Twelve months of claims per person. The darker the square, the more was claimed that month — settled or not.
        </p>
        <div className="overflow-x-auto py-2">
          <div className="min-w-[720px]">
            <div className="f-kicker grid grid-cols-[minmax(120px,1.2fr)_repeat(12,minmax(0,1fr))_96px] gap-x-2 border-b border-[var(--f-hairline)] pb-3">
              <span>PERSON</span>
              {months.map((mo) => <span key={mo} className="text-center">{abbr(mo)}</span>)}
              <span className="text-right">TOTAL</span>
            </div>
            {rows.map((r) => (
              <div
                key={r.p}
                className="grid grid-cols-[minmax(120px,1.2fr)_repeat(12,minmax(0,1fr))_96px] items-center gap-x-2 border-b border-[var(--f-hairline-soft)] py-3.5"
              >
                <div className="min-w-0 pr-2">
                  <p className="truncate text-[13.5px] font-medium">{r.p}</p>
                  <p className="k-c1 mt-0.5">{r.count} CLAIM{r.count === 1 ? '' : 'S'}</p>
                </div>
                {r.byMonth.map((v, j) => (
                  <span
                    key={j}
                    title={`${abbr(months[j])} ${months[j].slice(0, 4)} — ${formatINR(v)}`}
                    className={cn('mx-auto block h-3.5 w-3.5 rounded-[3px]', v === 0 && 'border border-[var(--f-hairline)]')}
                    style={v > 0 ? { background: `rgba(11,92,67,${(0.25 + 0.75 * (v / maxCell)).toFixed(2)})` } : undefined}
                  />
                ))}
                <M className="text-right text-[12px]">{formatINR(r.total)}</M>
              </div>
            ))}
            <div className="grid grid-cols-[minmax(120px,1.2fr)_repeat(12,minmax(0,1fr))_96px] items-center gap-x-2 pt-3.5">
              <span className="f-kicker">BOTH</span>
              {monthTotals.map((t, j) => (
                <M key={j} className="text-center text-[10px] text-[var(--k-label-secondary)]">
                  {t > 0 ? `${(t / 100000).toFixed(1)}L` : '—'}
                </M>
              ))}
              <M className="text-right text-[12px] font-semibold">{formatINR(grand)}</M>
            </div>
            <p className="f-mono pt-4 text-[11px] tracking-[0.08em] text-[var(--k-label-tertiary)]">
              {rows.map((r) => `${r.p.toUpperCase()} — OPEN ${formatINR(r.openAmt)} · SETTLED ${formatINR(r.settledAmt)}`).join('  ·  ') || 'NO CLAIMS YET'}
              {' · MONTHLY TOTALS IN LAKHS (1L = ₹1,00,000)'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function Reimburse() {
  const [settings] = useSettings()
  const { entries, cloud, loaded, add, remove, settle } = useReimbursements()
  const { addExpense } = useAccount()
  const [addOpen, setAddOpen] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [settling, setSettling] = useState<string | null>(null)

  const doSettle = async (person: string) => {
    const total = await settle(person)
    setSettling(null)
    if (total > 0) {
      const count = entries.filter((e) => e.person === person && !e.settled_on).length
      addExpense({
        date: today(),
        amount: total,
        category: 'Reimbursement',
        payment_mode: 'Bank Transfer',
        description: `Reimbursement — ${person} (${count} claim${count === 1 ? '' : 's'})`,
      })
      toast.success(`${person} settled — ${formatINR(total)}`, { description: 'Bank ledger expense recorded' })
    }
  }

  const persons = settings.reimbursePersons
  const openTotal = entries.filter((e) => !e.settled_on).reduce((s, e) => s + e.amount, 0)
  const settledThisMonth = entries
    .filter((e) => e.settled_on?.startsWith(today().slice(0, 7)))
    .reduce((s, e) => s + e.amount, 0)

  return (
    <>
      <PageHero
        index="06"
        section="ALIMONY"
        title="Claims"
        lede="What you and Niyas spent out of pocket for the company — claim it with a receipt, then settle it off in one bank expense. Settled claims stay on record."
        actions={
          <>
            <Pill outline onClick={() => setAnalysisOpen(true)}>Analysis</Pill>
            <Pill onClick={() => setAddOpen(true)}>Add claim</Pill>
          </>
        }
      />

      {!cloud && loaded && (
        <p className="k-c1 mb-6 rounded-xl border border-[rgba(201,162,39,0.4)] bg-[var(--f-gold-50)] px-4 py-2.5 text-[var(--f-gold-dark)]">
          Saving to this browser only — run the reimbursements SQL in Supabase to sync across devices.
        </p>
      )}

      <StatStrip
        stats={[
          { label: 'AWAITING SETTLEMENT', value: formatINR(openTotal), tone: openTotal > 0 ? 'gold' : 'ink' },
          { label: `SETTLED · ${new Date().toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}`, value: formatINR(settledThisMonth), tone: 'green' },
          { label: 'CLAIMANTS', value: String(persons.length), sub: 'SETTINGS → PEOPLE' },
        ]}
      />

      <div className="grid gap-14 pt-12 xl:grid-cols-2">
        {persons.map((p) => (
          <PersonLedger
            key={p}
            person={p}
            entries={entries.filter((e) => e.person === p)}
            onSettle={setSettling}
            onDelete={(id) => void remove(id)}
          />
        ))}
      </div>
      {addOpen && <AddClaimDialog add={add} onClose={() => setAddOpen(false)} />}
      {analysisOpen && <AnalysisDialog entries={entries} persons={persons} onClose={() => setAnalysisOpen(false)} />}
      <AlertDialog open={!!settling} onOpenChange={(open) => !open && setSettling(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Settle {settling}?</AlertDialogTitle>
            <AlertDialogDescription>
              All unsettled claims for {settling} will be marked settled today, and one bank expense for the total will be recorded in the Vault.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => settling && void doSettle(settling)}>
              Settle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
