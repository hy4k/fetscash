import { useState } from 'react'
import { HandCoins, Plus, Paperclip, Trash2, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from '@/lib/AccountContext'
import { useSettings } from '@/lib/settings'
import { useReimbursements, type ReimbEntry } from '@/lib/reimburse'
import { PageHeader } from '@/components/kimi/PageHeader'
import { KimiCard } from '@/components/kimi/Card'
import { KimiBadge } from '@/components/kimi/Badge'
import { KimiButton } from '@/components/kimi/Button'
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
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border-[0.5px] border-dashed border-[var(--k-separator)] px-3 py-2.5 text-[13px] text-[var(--k-label-secondary)] hover:border-[var(--f-emerald-600)]">
              <Paperclip className="h-4 w-4" aria-hidden />
              {receipt ? receipt.name : 'Attach image or PDF'}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
            </label>
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={() => void save()} loading={saving}>Save claim</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PersonCard({ person, entries, onSettle, onDelete }: {
  person: string
  entries: ReimbEntry[]
  onSettle: (person: string) => void
  onDelete: (id: string) => void
}) {
  const unsettled = entries.filter((e) => !e.settled_on)
  const settled = entries.filter((e) => e.settled_on)
  const due = unsettled.reduce((s, e) => s + e.amount, 0)

  const row = (e: ReimbEntry) => (
    <li key={e.id} className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="k-b2-em truncate">{e.description || e.category || 'Claim'}</p>
        <p className="k-c1">
          {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {e.category ? ` · ${e.category}` : ''}
          {e.settled_on && ` · settled ${new Date(e.settled_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
        </p>
      </div>
      {e.receipt_data && (
        <a
          href={e.receipt_data}
          target="_blank"
          rel="noreferrer"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--k-label-tertiary)] hover:bg-[var(--k-fill-f2)] hover:text-[var(--f-emerald-700)]"
          title={e.receipt_name ?? 'View receipt'}
        >
          <Paperclip className="h-3.5 w-3.5" aria-hidden />
        </a>
      )}
      <span className="k-b2-em shrink-0">{formatINR(e.amount)}</span>
      {!e.settled_on && (
        <button
          type="button"
          title="Delete claim"
          onClick={() => onDelete(e.id)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--k-label-tertiary)] hover:bg-[var(--k-fill-f2)] hover:text-[var(--k-danger)]"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
      {e.settled_on && <KimiBadge tone="green">Settled</KimiBadge>}
    </li>
  )

  return (
    <KimiCard pad={false} title={
      <span className="flex items-center gap-2">
        <HandCoins className="h-4 w-4 text-[var(--f-gold-600)]" aria-hidden />
        {person}
      </span>
    }>
      <div className="flex items-center justify-between px-5 pt-3">
        <div>
          <p className="k-c1">Owed to {person}</p>
          <p className="text-[20px] font-semibold leading-[28px] text-[var(--f-gold-600)]">{formatINR(due)}</p>
        </div>
        <KimiButton size={26} leftIcon={<CheckCheck />} disabled={due <= 0} onClick={() => onSettle(person)}>
          Settle {due > 0 ? formatINR(due) : ''}
        </KimiButton>
      </div>
      {entries.length === 0 ? (
        <p className="k-b2-secondary px-5 py-8 text-center">No claims yet.</p>
      ) : (
        <>
          {unsettled.length > 0 && <ul className="divide-y divide-[rgba(0,0,0,0.06)] px-5 pt-2">{unsettled.map(row)}</ul>}
          {settled.length > 0 && (
            <>
              <p className="k-c1 px-5 pt-3">Settled history</p>
              <ul className="divide-y divide-[rgba(0,0,0,0.06)] px-5 pb-3 opacity-70">{settled.map(row)}</ul>
            </>
          )}
        </>
      )}
    </KimiCard>
  )
}

export default function Reimburse() {
  const [settings] = useSettings()
  const { entries, cloud, loaded, add, remove, settle } = useReimbursements()
  const { addExpense } = useAccount()
  const [addOpen, setAddOpen] = useState(false)
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

  return (
    <>
      <PageHeader
        title="Reimburse"
        description="Personal money spent for the company — claim it, then settle"
        actions={<KimiButton leftIcon={<Plus />} onClick={() => setAddOpen(true)}>Add claim</KimiButton>}
      />
      {!cloud && loaded && (
        <p className="k-c1 mb-4 rounded-xl bg-[var(--f-gold-50)] px-4 py-2.5 text-[var(--f-gold-600)]">
          Saving to this browser only — run the reimbursements SQL in Supabase to sync across devices.
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {persons.map((p) => (
          <PersonCard
            key={p}
            person={p}
            entries={entries.filter((e) => e.person === p)}
            onSettle={setSettling}
            onDelete={(id) => void remove(id)}
          />
        ))}
      </div>
      {addOpen && <AddClaimDialog add={add} onClose={() => setAddOpen(false)} />}
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
