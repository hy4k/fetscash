import { useMemo, useState } from 'react'
import { CalendarClock, Plus, Trash2, CheckCircle2, CircleDot, Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from '@/lib/AccountContext'
import { useSettings, type Settings } from '@/lib/settings'
import { PageHeader, PageSkeleton } from '@/components/kimi/PageHeader'
import { KimiCard } from '@/components/kimi/Card'
import { KimiBadge } from '@/components/kimi/Badge'
import { KimiButton } from '@/components/kimi/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatINR } from '@/lib/data'
import type { LocationType } from '@/types'

type Template = Settings['recurring'][number]

const thisMonth = () => new Date().toISOString().slice(0, 7)

function AddTemplateDialog({ onClose }: { onClose: () => void }) {
  const [settings, saveSettings] = useSettings()
  const [form, setForm] = useState<Template>({ name: '', amount: '', category: 'Rent', centre: '' })
  const save = () => {
    const amount = parseFloat(form.amount)
    if (!form.name.trim()) { toast.error('Name is required'); return }
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }
    saveSettings({ recurring: [...settings.recurring, form] })
    toast.success(`Recurring expense "${form.name}" added`)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New recurring expense</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="rt-name">Name *</Label>
            <Input id="rt-name" placeholder="e.g. Office rent — Cochin" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rt-amount">Monthly amount (₹) *</Label>
              <Input id="rt-amount" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
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
            <Label>Centre</Label>
            <Select value={form.centre || 'none'} onValueChange={(v) => setForm({ ...form, centre: v === 'none' ? '' : (v as LocationType) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Company-wide</SelectItem>
                <SelectItem value="calicut">Calicut</SelectItem>
                <SelectItem value="cochin">Cochin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save template</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Recurring() {
  const { data, loading, addExpense } = useAccount()
  const [settings, saveSettings] = useSettings()
  const [month, setMonth] = useState(thisMonth())
  const [addOpen, setAddOpen] = useState(false)

  const templates = settings.recurring

  const status = useMemo(() => {
    if (!data) return []
    return templates.map((t, idx) => {
      const target = parseFloat(t.amount) || 0
      const match = data.expenses.find(
        (e) => e.date.startsWith(month) && e.category === t.category && Math.abs(e.amount - target) <= 1
      )
      return { t, idx, match }
    })
  }, [data, templates, month])

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  const total = templates.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
  const paid = status.filter((s) => s.match).reduce((s, x) => s + (x.match?.amount ?? 0), 0)
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const record = (t: Template) => {
    const amount = parseFloat(t.amount)
    const isCurrent = month === thisMonth()
    addExpense({
      date: isCurrent ? new Date().toISOString().slice(0, 10) : `${month}-01`,
      amount,
      category: t.category,
      location: t.centre || undefined,
      payment_mode: 'Bank Transfer',
      description: t.name,
    })
    toast.success(`"${t.name}" recorded for ${monthLabel}`, { description: 'Added to the Bank Ledger' })
  }

  return (
    <>
      <PageHeader
        title="Recurring"
        description="Monthly repeating expenses — rent, salaries, utilities"
        actions={
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="h-9 rounded-[10px] border-[0.5px] border-[var(--k-separator)] bg-[var(--k-bg-primary)] px-3 text-[13px] font-medium text-[var(--k-label-primary)]"
            />
            <KimiButton leftIcon={<Plus />} onClick={() => setAddOpen(true)}>Add recurring</KimiButton>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="k-card p-5">
          <p className="k-b2-secondary">Monthly commitment</p>
          <p className="mt-1 text-[20px] font-semibold leading-[30px] text-[var(--k-label-primary)]">{formatINR(total)}</p>
        </div>
        <div className="k-card p-5">
          <p className="k-b2-secondary">Paid in {monthLabel}</p>
          <p className="mt-1 text-[20px] font-semibold leading-[30px] text-[var(--f-emerald-700)]">{formatINR(paid)}</p>
        </div>
        <div className="k-card p-5">
          <p className="k-b2-secondary">Pending in {monthLabel}</p>
          <p className="mt-1 text-[20px] font-semibold leading-[30px] text-[var(--f-gold-600)]">{formatINR(Math.max(0, total - paid))}</p>
        </div>
      </div>

      <KimiCard pad={false} title={
        <span className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-[var(--f-emerald-600)]" aria-hidden />
          {monthLabel}
        </span>
      }>
        {templates.length === 0 ? (
          <p className="k-b2-secondary px-5 py-10 text-center">No recurring expenses yet — add rent, salaries, utilities…</p>
        ) : (
          <ul className="divide-y divide-[rgba(0,0,0,0.06)] px-5 pb-2">
            {status.map(({ t, idx, match }) => (
              <li key={idx} className="flex items-center gap-3 py-3.5">
                {match
                  ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--f-emerald-600)]" aria-hidden />
                  : <CircleDot className="h-5 w-5 shrink-0 text-[var(--f-gold-600)]" aria-hidden />}
                <div className="min-w-0 flex-1">
                  <p className="k-b2-em truncate">{t.name}</p>
                  <p className="k-c1">
                    {t.category}
                    {t.centre ? ` · ${t.centre === 'cochin' ? 'Cochin' : 'Calicut'}` : ' · Company-wide'}
                    {match && ` · paid ${new Date(match.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                  </p>
                </div>
                <span className="k-b2-em shrink-0">{formatINR(parseFloat(t.amount) || 0)}</span>
                {match ? (
                  <KimiBadge tone="green">Paid</KimiBadge>
                ) : (
                  <KimiButton size={26} variant="outline" leftIcon={<Landmark />} onClick={() => record(t)}>
                    Record payment
                  </KimiButton>
                )}
                <button
                  type="button"
                  title="Remove template"
                  onClick={() => saveSettings({ recurring: templates.filter((_, i) => i !== idx) })}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--k-label-tertiary)] hover:bg-[var(--k-fill-f2)] hover:text-[var(--k-danger)]"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="k-c1 px-5 py-3">
          A template shows Paid when a matching bank expense (same category &amp; amount) exists for the month — recorded here or imported from a statement.
        </p>
      </KimiCard>

      {addOpen && <AddTemplateDialog onClose={() => setAddOpen(false)} />}
    </>
  )
}
