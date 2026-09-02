import { useState } from 'react'
import { toast } from 'sonner'
import { useAccount } from '@/lib/AccountContext'
import { useSettings } from '@/lib/settings'
import { PageSkeleton } from '@/components/kimi/PageHeader'
import { KimiButton } from '@/components/kimi/Button'
import { PageHero, Pill, Kicker, M } from '@/components/ledger'
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
import { cn } from '@/lib/utils'
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
                className="h-4 w-4 accent-[var(--f-green)]"
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

function DivisionLedger({ location, onAdd }: { location: LocationType; onAdd: (loc: LocationType) => void }) {
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
    <section>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-[var(--f-hairline)] pb-5">
        <h2 className="m-0 text-[clamp(26px,2.8vw,38px)] font-medium tracking-[-0.02em]">{centreLabel(location)}</h2>
        <M className="text-[12px] tracking-[0.10em] text-[var(--k-label-tertiary)]">
          OPENING {formatINR(opening)} · {entries.length} MOVEMENTS
        </M>
        <span className="flex-1" />
        <M className={cn('text-[clamp(22px,2.4vw,30px)] font-medium', balance >= 0 ? 'text-[var(--f-green)]' : 'text-[var(--f-red)]')}>
          {formatINR(balance)}
        </M>
        <Pill small outline onClick={() => onAdd(location)}>Add transaction</Pill>
      </div>

      {entries.length === 0 ? (
        <p className="k-b2-secondary py-8 text-center">No cash entries for {centreLabel(location)} yet.</p>
      ) : (
        <div className="pt-2">
          {orderedKeys.map((key) => {
            const list = groups.get(key)!
            const net = list.reduce((s, t) => s + (t.type === 'expense' ? -t.amount : t.amount), 0)
            return (
              <div key={key} className="py-3">
                <div className="flex items-baseline gap-4 pb-1">
                  <Kicker>{key}</Kicker>
                  <M className="text-[10.5px] text-[var(--k-label-quaternary)]">{list.length}</M>
                  <M className={cn('ml-auto text-[12px]', net >= 0 ? 'text-[var(--f-green)]' : 'text-[var(--f-red)]')}>
                    {net >= 0 ? '+' : '−'}{formatINR(Math.abs(net))}
                  </M>
                </div>
                <div className="grid">
                  {list.map((t) => {
                    const signed = t.type === 'expense' ? -t.amount : t.amount
                    return (
                      <div
                        key={t.id}
                        className="grid grid-cols-[76px_minmax(0,1fr)_auto_auto] items-center gap-4 border-t border-[var(--f-hairline-soft)] py-3 transition-colors hover:bg-[rgba(17,23,19,0.035)]"
                      >
                        <M className="text-[11.5px] text-[var(--k-label-tertiary)]">
                          {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}
                        </M>
                        <span className="truncate text-[14px] font-medium">{t.description || key}</span>
                        <M className={cn('text-right text-[13px]', signed >= 0 ? 'text-[var(--f-green)]' : '')}>
                          {signed >= 0 ? '+' : '−'}{formatINR(Math.abs(signed))}
                        </M>
                        <RowActions
                          onEdit={() => setEditing(t)}
                          onDelete={() => deleteCashTxn(t.id)}
                          deleteTitle="Delete this cash entry?"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {editing && <EditCashDialog txn={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}

export default function FetsCash() {
  const { data, loading } = useAccount()
  const [addFor, setAddFor] = useState<LocationType | null>(null)

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  return (
    <>
      <PageHero
        index="04"
        section="FETS CASH"
        title="Cash in hand"
        lede="Petty cash held at Cochin and Calicut. Replenished from the bank, spent on the floor, counted at close."
        actions={<Pill onClick={() => setAddFor('calicut')}>Add transaction</Pill>}
      />

      {/* Division balances — one hairline strip */}
      <section className="grid border-b border-t border-[var(--f-hairline)] sm:grid-cols-3">
        {(['cochin', 'calicut'] as LocationType[]).map((loc, i) => (
          <div key={loc} className={cn('min-w-0 py-9 sm:px-8', i > 0 && 'border-t border-[var(--f-hairline-soft)] sm:border-l sm:border-t-0')} style={i === 0 ? { paddingLeft: 0 } : undefined}>
            <Kicker>{loc === 'cochin' ? 'COCHIN' : 'CALICUT'}</Kicker>
            <div className="f-stat mt-4 !text-[clamp(30px,3.4vw,44px)]">{formatINR(data.cashByLocation[loc])}</div>
            <div className="f-mono mt-3 text-[11px] tracking-[0.08em] text-[var(--k-label-secondary)]">
              {data.cashTxns.filter((t) => t.location === loc).length} MOVEMENTS
            </div>
          </div>
        ))}
        <div className="min-w-0 border-t border-[var(--f-hairline-soft)] py-9 sm:border-l sm:border-t-0 sm:px-8 sm:pr-0">
          <Kicker>TOTAL</Kicker>
          <div className="f-stat mt-4 !text-[clamp(30px,3.4vw,44px)] text-[var(--f-green)]">{formatINR(data.cashBalance)}</div>
          <div className="f-mono mt-3 text-[11px] tracking-[0.08em] text-[var(--k-label-secondary)]">BOTH DIVISIONS</div>
        </div>
      </section>

      <div className="grid gap-14 pt-12 xl:grid-cols-2">
        <DivisionLedger location="calicut" onAdd={setAddFor} />
        <DivisionLedger location="cochin" onAdd={setAddFor} />
      </div>
      {addFor && <AddCashTxnDialog defaultLocation={addFor} onClose={() => setAddFor(null)} />}
    </>
  )
}
