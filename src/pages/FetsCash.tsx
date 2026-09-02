import { useState } from 'react'
import { Wallet, Plus, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from '@/lib/AccountContext'
import { useSettings } from '@/lib/settings'
import { PageHeader, PageSkeleton } from '@/components/kimi/PageHeader'
import { KimiCard } from '@/components/kimi/Card'
import { KimiBadge } from '@/components/kimi/Badge'
import { KimiButton } from '@/components/kimi/Button'
import { EditCashDialog, RowActions } from '@/components/edit/EditDialogs'
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
import type { CashTxnRow, LocationType } from '@/types'

const today = () => new Date().toISOString().slice(0, 10)
const centreLabel = (l: LocationType) => (l === 'cochin' ? 'Cochin' : 'Calicut')
const UNCATEGORIZED = 'Uncategorized'

function AddCashTxnDialog({ defaultLocation, onClose }: { defaultLocation?: LocationType; onClose: () => void }) {
  const { addCashTxn, addExpense } = useAccount()
  const [settings] = useSettings()
  const [form, setForm] = useState({
    date: today(),
    amount: '',
    type: 'expense' as CashTxnRow['type'],
    location: defaultLocation ?? settings.defaultCentre,
    category: 'Misc',
    description: '',
    fromBank: true,
  })
  const save = () => {
    const amount = parseFloat(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }
    const centre = centreLabel(form.location)
    addCashTxn({
      date: form.date,
      amount,
      type: form.type,
      location: form.location,
      category: form.type === 'expense' ? form.category : undefined,
      description: form.description || (form.type === 'replenishment' ? 'Top-up from bank' : form.type === 'expense' ? form.category : 'Adjustment'),
    })
    if (form.type === 'replenishment' && form.fromBank) {
      addExpense({
        date: form.date,
        amount,
        category: 'Cash Transfer',
        payment_mode: 'Cash Withdrawal',
        location: form.location,
        description: `Transfer to FETS Cash — ${centre}`,
      })
    }
    toast.success(`FETS Cash entry saved — ${centre}`)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add cash transaction</DialogTitle>
          <DialogDescription>Office cash entry for a FETS Cash division.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Division</Label>
              <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v as LocationType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="calicut">Calicut</SelectItem>
                  <SelectItem value="cochin">Cochin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as CashTxnRow['type'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Cash expense (out)</SelectItem>
                  <SelectItem value="replenishment">Top-up from bank (in)</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ct-date">Date</Label>
              <Input id="ct-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ct-amount">Amount (₹)</Label>
              <Input id="ct-amount" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          {form.type === 'expense' && (
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
          {form.type === 'replenishment' && (
            <label className="flex items-center gap-2 text-[13px] text-[var(--k-label-secondary)]">
              <input
                type="checkbox"
                checked={form.fromBank}
                onChange={(e) => setForm({ ...form, fromBank: e.target.checked })}
                className="h-4 w-4 accent-[var(--f-emerald-600)]"
              />
              Also record a cash withdrawal in the Bank Ledger
            </label>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="ct-desc">Description</Label>
            <Input id="ct-desc" placeholder="Optional note" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save entry</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Division({ location, onAdd }: { location: LocationType; onAdd: (loc: LocationType) => void }) {
  const { data, deleteCashTxn } = useAccount()
  const [settings] = useSettings()
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

  // group spends/top-ups by category
  const groups = new Map<string, CashTxnRow[]>()
  for (const t of entries) {
    const key = t.type === 'replenishment' ? 'Top-ups' : (t.category || UNCATEGORIZED)
    groups.set(key, [...(groups.get(key) ?? []), t])
  }
  const orderedKeys = [...groups.keys()].sort((a, b) => {
    if (a === 'Top-ups') return -1
    if (b === 'Top-ups') return 1
    return a.localeCompare(b)
  })

  return (
    <KimiCard pad={false} title={
      <span className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-[var(--f-gold-600)]" aria-hidden />
        {centreLabel(location)}
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
      <div className="px-5 py-3">
        <KimiButton size={26} leftIcon={<Plus />} onClick={() => onAdd(location)}>
          Add transaction
        </KimiButton>
      </div>

      {entries.length === 0 ? (
        <p className="k-b2-secondary px-5 py-8 text-center">No cash entries for {centreLabel(location)} yet.</p>
      ) : (
        <div className="border-t-[0.5px] border-[var(--k-separator)]">
          {orderedKeys.map((key) => {
            const list = groups.get(key)!
            const net = list.reduce((s, t) => s + (t.type === 'expense' ? -t.amount : t.amount), 0)
            return (
              <div key={key} className="border-b-[0.5px] border-[var(--k-separator)] last:border-b-0">
                <div className="flex items-center gap-2 px-5 pb-1 pt-3">
                  <Tag className="h-3.5 w-3.5 text-[var(--k-label-tertiary)]" aria-hidden />
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--k-label-secondary)]">{key}</span>
                  <KimiBadge tone="neutral">{list.length}</KimiBadge>
                  <span className={`ml-auto text-[12px] font-semibold ${net >= 0 ? 'text-[var(--f-emerald-700)]' : 'text-[var(--k-danger)]'}`}>
                    {net >= 0 ? '+' : '−'}{formatINR(Math.abs(net))}
                  </span>
                </div>
                <ul className="divide-y divide-[rgba(0,0,0,0.06)] px-5 pb-2">
                  {list.map((t) => {
                    const signed = t.type === 'expense' ? -t.amount : t.amount
                    return (
                      <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="k-b2-em truncate">{t.description || key}</p>
                          <p className="k-c1">
                            {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`k-b2-em ${signed >= 0 ? 'text-[var(--f-emerald-600)]' : 'text-[var(--k-danger)]'}`}>
                            {signed >= 0 ? '+' : '−'}{formatINR(Math.abs(signed))}
                          </span>
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
              </div>
            )
          })}
        </div>
      )}
      {editing && <EditCashDialog txn={editing} onClose={() => setEditing(null)} />}
    </KimiCard>
  )
}

export default function FetsCash() {
  const { data, loading } = useAccount()
  const [addFor, setAddFor] = useState<LocationType | null>(null)

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  return (
    <>
      <PageHeader
        title="FETS Cash"
        description="Office cash accounts — Calicut and Cochin, each its own book"
        actions={<KimiButton leftIcon={<Plus />} onClick={() => setAddFor('calicut')}>Add transaction</KimiButton>}
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Division location="calicut" onAdd={setAddFor} />
        <Division location="cochin" onAdd={setAddFor} />
      </div>
      {addFor && <AddCashTxnDialog defaultLocation={addFor} onClose={() => setAddFor(null)} />}
    </>
  )
}
