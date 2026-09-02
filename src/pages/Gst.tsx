import gstJson from '@/data/gst.json'
import { PageHero, StatStrip, Kicker, M, StatusText } from '@/components/ledger'
import { AddExpenseDialog } from '@/sections/QuickAdd'
import { formatINR } from '@/lib/data'
import { cn } from '@/lib/utils'

interface PeriodSlot {
  status: 'filed' | 'filed_late' | 'pending' | 'overdue'
  arn?: string
  filed_on?: string
  due_date: string
  days_late?: number
  days_overdue?: number
}
interface PeriodRow {
  fy: string
  period: string
  period_start: string
  gstr1: PeriodSlot
  gstr3b: PeriodSlot
}
interface GstDoc {
  gstin: string
  legal_name: string
  filing_frequency: string
  registered_since: string
  scraped_at: string
  itc_balance: { igst: number; cgst: number; sgst: number; cess: number; total: number; as_of: string }
  cash_ledger_balance: number
  open_liabilities: number
  turnover: { fy: string; system_calculated: number; estimated: number | null }[]
  annual_returns: { fy: string; gstr9: string; gstr9c: string; note: string }[]
  periods: PeriodRow[]
}

const gst = gstJson as GstDoc

const fmtDate = (iso?: string) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const fmtPeriod = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

function daysUntil(iso: string) {
  const ms = new Date(iso + 'T00:00:00').getTime() - new Date(gst.scraped_at + 'T00:00:00').getTime()
  return Math.round(ms / 86400000)
}

function dueLabel(iso: string) {
  const d = daysUntil(iso)
  if (d < 0) return `${-d}d overdue`
  if (d === 0) return 'due today'
  if (d === 1) return 'due tomorrow'
  return `due in ${d}d`
}

function SlotCell({ slot }: { slot: PeriodSlot }) {
  if (slot.status === 'filed')
    return (
      <div className="flex flex-col gap-1">
        <StatusText tone="green">FILED {fmtDate(slot.filed_on).toUpperCase()}</StatusText>
        <span className="f-mono text-[10.5px] text-[var(--k-label-tertiary)]">ARN {slot.arn}</span>
      </div>
    )
  if (slot.status === 'filed_late')
    return (
      <div className="flex flex-col gap-1">
        <StatusText tone="gold">{slot.days_late}D LATE · {fmtDate(slot.filed_on).toUpperCase()}</StatusText>
        <span className="f-mono text-[10.5px] text-[var(--k-label-tertiary)]">DUE {fmtDate(slot.due_date).toUpperCase()} · ARN {slot.arn}</span>
      </div>
    )
  if (slot.status === 'overdue')
    return <StatusText tone="red">OVERDUE {slot.days_overdue}D</StatusText>
  return <StatusText tone="muted">{fmtDate(slot.due_date).toUpperCase()} · {dueLabel(slot.due_date).toUpperCase()}</StatusText>
}

export default function Gst() {
  const pending = gst.periods.flatMap((p) =>
    (['gstr1', 'gstr3b'] as const)
      .filter((k) => p[k].status === 'pending' || p[k].status === 'overdue')
      .map((k) => ({ period: fmtPeriod(p.period_start), rtn: k === 'gstr1' ? 'GSTR-1' : 'GSTR-3B', ...p[k] }))
  )
  const fy2526 = gst.turnover.find((t) => t.fy === '2025-26')
  const filedLate = gst.periods.reduce(
    (s, p) => s + (p.gstr1.status === 'filed_late' ? 1 : 0) + (p.gstr3b.status === 'filed_late' ? 1 : 0), 0)
  const filedTotal = gst.periods.reduce(
    (s, p) => s + (p.gstr1.status.startsWith('filed') ? 1 : 0) + (p.gstr3b.status.startsWith('filed') ? 1 : 0), 0)

  return (
    <>
      <PageHero
        index="08"
        section={`GST · ${gst.gstin}`}
        title="GST desk"
        lede={
          pending.length > 0
            ? `${pending.map((p) => `${p.rtn} for ${p.period} is ${dueLabel(p.due_date)}`).join('. ')}.`
            : 'All returns filed on schedule.'
        }
        actions={<AddExpenseDialog defaultCategory="GST Payment" buttonLabel="Record GST payment" />}
      />

      {pending.length > 0 && (
        <div className="mb-8 border-b border-t border-[rgba(201,162,39,0.45)] bg-[var(--f-gold-50)] px-5 py-4">
          {pending.map((p, i) => (
            <p key={i} className="text-[13px] leading-6 text-[var(--f-gold-dark)]">
              <span className="f-mono text-[11px] tracking-[0.10em]">{p.rtn} · {p.period.toUpperCase()}</span>
              {' — '}due {fmtDate(p.due_date)} ({dueLabel(p.due_date)})
            </p>
          ))}
        </div>
      )}

      <StatStrip
        stats={[
          { label: 'ITC AVAILABLE', value: formatINR(gst.itc_balance.total), tone: 'green', sub: `CGST ${formatINR(gst.itc_balance.cgst)} · SGST ${formatINR(gst.itc_balance.sgst)}` },
          { label: 'CASH LEDGER', value: formatINR(gst.cash_ledger_balance) },
          { label: 'OPEN LIABILITIES', value: formatINR(gst.open_liabilities), tone: gst.open_liabilities > 0 ? 'gold' : 'green', sub: gst.open_liabilities > 0 ? 'DUES ON PORTAL' : 'NOTHING DUE' },
          { label: 'TURNOVER · FY 2025-26', value: formatINR(fy2526?.system_calculated ?? 0), sub: 'SYSTEM-CALCULATED' },
        ]}
      />

      {/* Filing register */}
      <section className="pt-12">
        <Kicker className="mb-2 !text-[12px]">MONTHLY FILING REGISTER</Kicker>
        <div className="f-kicker grid grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)] gap-x-6 border-b border-[var(--f-hairline)] py-4">
          <span>PERIOD</span>
          <span>GSTR-1 · DUE 11TH</span>
          <span>GSTR-3B · DUE 20TH</span>
        </div>
        {[...gst.periods].reverse().map((p) => (
          <div
            key={p.period_start}
            className="grid grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-6 border-b border-[var(--f-hairline-soft)] py-4 transition-colors hover:bg-[rgba(17,23,19,0.035)]"
          >
            <M className="text-[13px] font-medium">
              {fmtPeriod(p.period_start).toUpperCase()}
              <span className="block text-[10px] font-normal text-[var(--k-label-tertiary)]">FY {p.fy}</span>
            </M>
            <SlotCell slot={p.gstr1} />
            <SlotCell slot={p.gstr3b} />
          </div>
        ))}
      </section>

      {/* Discipline + annual + turnover */}
      <section className="grid border-b border-[var(--f-hairline)] lg:grid-cols-3">
        <div className="min-w-0 py-10 lg:pr-10">
          <Kicker className="mb-6">FILING DISCIPLINE</Kicker>
          <div className="flex items-baseline justify-between">
            <span className="text-[15px]">Returns filed</span>
            <M className="text-[15px] font-medium">{filedTotal} / {gst.periods.length * 2}</M>
          </div>
          <div className="mt-3 h-[10px] bg-[rgba(17,23,19,0.08)]">
            <div className="h-full bg-[var(--f-green)]" style={{ width: `${(filedTotal / (gst.periods.length * 2)) * 100}%` }} />
          </div>
          <p className="k-c1 mt-4">
            {filedLate} were filed after the due date. Late fees accrue ₹200/day (₹100 CGST + ₹100 SGST) capped per return.
          </p>
        </div>
        <div className="min-w-0 border-t border-[var(--f-hairline-soft)] py-10 lg:border-l lg:border-t-0 lg:px-10">
          <Kicker className="mb-6">ANNUAL RETURNS</Kicker>
          <div className="grid gap-5">
            {gst.annual_returns.map((a) => (
              <div key={a.fy} className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-[15px] font-medium">FY {a.fy}</p>
                  <p className="k-c1 mt-1">{a.note}</p>
                </div>
                <StatusText tone={a.gstr9 === 'not_filed' ? 'muted' : 'muted'}>
                  {a.gstr9 === 'not_filed' ? 'GSTR-9 NOT FILED' : 'NOT DUE'}
                </StatusText>
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 border-t border-[var(--f-hairline-soft)] py-10 lg:border-l lg:border-t-0 lg:pl-10">
          <Kicker className="mb-6">TURNOVER PER PORTAL</Kicker>
          <div className="grid gap-4">
            {gst.turnover.map((t) => (
              <div key={t.fy} className="flex items-baseline justify-between gap-4">
                <span className="text-[15px] font-medium">FY {t.fy}</span>
                <M className="text-[13px]">
                  {formatINR(t.system_calculated)}
                  {t.estimated != null && <span className="block text-right text-[10px] text-[var(--k-label-tertiary)]">EST {formatINR(t.estimated)}</span>}
                </M>
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className={cn('f-mono pt-6 text-[11px] tracking-[0.10em] text-[var(--k-label-tertiary)]')}>
        GSTIN {gst.gstin} · {gst.filing_frequency.toUpperCase()} FILING · SYNCED {fmtDate(gst.scraped_at).toUpperCase()} FROM GST.GOV.IN
      </p>
    </>
  )
}
