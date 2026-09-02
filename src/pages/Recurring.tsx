import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from '@/lib/AccountContext'
import { useSettings, type Settings } from '@/lib/settings'
import { PageSkeleton } from '@/components/kimi/PageHeader'
import { PageHero, StatStrip, Pill, StatusText, M } from '@/components/ledger'
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
import { cn } from '@/lib/utils'
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
          <Pill small onClick={save}>Save template</Pill>
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
      <PageHero
        index="05"
        section="RECURRING"
        title={<>Every month,<br />without asking.</>}
        lede={`${templates.length} schedules totalling ${formatINR(total)} a month. A template shows paid the moment a matching bank expense exists.`}
        actions={
          <>
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              aria-label="Month"
              className="f-mono h-12 rounded-full border border-[rgba(17,23,19,0.22)] bg-[var(--f-card)] px-5 text-[13px] font-medium text-[var(--k-label-primary)] outline-none"
            />
            <Pill onClick={() => setAddOpen(true)}>Add recurring</Pill>
          </>
        }
      />

      <StatStrip
        stats={[
          { label: 'MONTHLY COMMITMENT', value: formatINR(total) },
          { label: `PAID · ${monthLabel.toUpperCase()}`, value: formatINR(paid), tone: 'green' },
          { label: `PENDING · ${monthLabel.toUpperCase()}`, value: formatINR(Math.max(0, total - paid)), tone: total - paid > 0 ? 'gold' : 'ink' },
        ]}
      />

      <section className="pt-10">
        <div className="f-kicker grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-5 border-b border-[var(--f-hairline)] py-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_110px_150px_36px]">
          <span>SCHEDULE</span>
          <span className="hidden sm:block">CENTRE</span>
          <span className="text-right">AMOUNT</span>
          <span className="text-right">STATUS</span>
          <span className="hidden sm:block" />
        </div>
        {templates.length === 0 ? (
          <p className="k-b2-secondary py-10 text-center">No recurring expenses yet — add rent, salaries, utilities…</p>
        ) : (
          status.map(({ t, idx, match }) => (
            <div
              key={idx}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-5 border-b border-[var(--f-hairline-soft)] py-5 transition-colors hover:bg-[rgba(17,23,19,0.035)] sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_110px_150px_36px]"
            >
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium">{t.name}</p>
                <p className="k-c1 mt-0.5">
                  {t.category}
                  {match && ` · paid ${new Date(match.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                </p>
              </div>
              <M className="hidden text-[11px] tracking-[0.10em] text-[var(--k-label-secondary)] sm:block">
                {t.centre ? (t.centre === 'cochin' ? 'COCHIN' : 'CALICUT') : 'COMPANY-WIDE'}
              </M>
              <M className="text-right text-[13px]">{formatINR(parseFloat(t.amount) || 0)}</M>
              <span className="text-right">
                {match ? (
                  <StatusText tone="green">PAID</StatusText>
                ) : (
                  <Pill small outline onClick={() => record(t)}>Record payment</Pill>
                )}
              </span>
              <button
                type="button"
                title="Remove template"
                onClick={() => saveSettings({ recurring: templates.filter((_, i) => i !== idx) })}
                className="hidden h-7 w-7 items-center justify-center justify-self-end rounded-lg text-[var(--k-label-tertiary)] hover:bg-[var(--k-fill-f2)] hover:text-[var(--k-danger)] sm:flex"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))
        )}
        <p className={cn('f-mono py-4 text-[11px] tracking-[0.08em] text-[var(--k-label-tertiary)]')}>
          PAID = MATCHING BANK EXPENSE (SAME CATEGORY &amp; AMOUNT) IN {monthLabel.toUpperCase()}
        </p>
      </section>

      {addOpen && <AddTemplateDialog onClose={() => setAddOpen(false)} />}
    </>
  )
}
