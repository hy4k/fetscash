import { AlertTriangle, BadgeCheck, CalendarClock, Landmark, PiggyBank, Receipt, ShieldCheck, TrendingUp } from 'lucide-react'
import gstJson from '@/data/gst.json'
import { PageHeader } from '@/components/kimi/PageHeader'
import { KimiCard } from '@/components/kimi/Card'
import { KimiBadge } from '@/components/kimi/Badge'
import { AddExpenseDialog } from '@/sections/QuickAdd'
import { formatINR } from '@/lib/data'

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
        <KimiBadge tone="green"><BadgeCheck className="h-3 w-3" aria-hidden />Filed {fmtDate(slot.filed_on)}</KimiBadge>
        <span className="text-[11px] leading-4 text-[var(--k-label-secondary)]">ARN {slot.arn}</span>
      </div>
    )
  if (slot.status === 'filed_late')
    return (
      <div className="flex flex-col gap-1">
        <KimiBadge tone="orange"><AlertTriangle className="h-3 w-3" aria-hidden />{slot.days_late}d late · {fmtDate(slot.filed_on)}</KimiBadge>
        <span className="text-[11px] leading-4 text-[var(--k-label-secondary)]">due {fmtDate(slot.due_date)} · ARN {slot.arn}</span>
      </div>
    )
  if (slot.status === 'overdue')
    return <KimiBadge tone="red"><AlertTriangle className="h-3 w-3" aria-hidden />Overdue {slot.days_overdue}d</KimiBadge>
  return (
    <KimiBadge tone="blue"><CalendarClock className="h-3 w-3" aria-hidden />{fmtDate(slot.due_date)} · {dueLabel(slot.due_date)}</KimiBadge>
  )
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
      <PageHeader
        title="GST Compliance"
        description={`GSTIN ${gst.gstin} · ${gst.filing_frequency} filing · synced ${fmtDate(gst.scraped_at)} from gst.gov.in`}
        actions={<AddExpenseDialog defaultCategory="GST Payment" buttonLabel="Record GST payment" />}
      />

      {/* Upcoming dues banner */}
      {pending.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[var(--f-gold-400)]/50 bg-[var(--f-gold-100)] px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--f-gold-600)]" aria-hidden />
          <div>
            <p className="text-[14px] font-semibold leading-5 text-[var(--k-label-primary)]">Upcoming filings</p>
            {pending.map((p, i) => (
              <p key={i} className="text-[13px] leading-5 text-[var(--k-label-secondary)]">
                {p.rtn} for {p.period} — due {fmtDate(p.due_date)} ({dueLabel(p.due_date)})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Ledger KPI cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KimiCard>
          <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--k-label-secondary)]">
            <Landmark className="h-4 w-4 text-[var(--f-emerald-600)]" aria-hidden />ITC available
          </div>
          <p className="mt-2 text-[24px] font-semibold leading-8 text-[var(--f-emerald-700)]">{formatINR(gst.itc_balance.total)}</p>
          <p className="mt-1 text-[12px] leading-4 text-[var(--k-label-secondary)]">
            IGST {formatINR(gst.itc_balance.igst)} · CGST {formatINR(gst.itc_balance.cgst)} · SGST {formatINR(gst.itc_balance.sgst)} · Cess {formatINR(gst.itc_balance.cess)}
          </p>
        </KimiCard>
        <KimiCard>
          <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--k-label-secondary)]">
            <PiggyBank className="h-4 w-4 text-[var(--f-gold-600)]" aria-hidden />Cash ledger
          </div>
          <p className="mt-2 text-[24px] font-semibold leading-8 text-[var(--k-label-primary)]">{formatINR(gst.cash_ledger_balance)}</p>
          <p className="mt-1 text-[12px] leading-4 text-[var(--k-label-secondary)]">Electronic cash ledger balance</p>
        </KimiCard>
        <KimiCard>
          <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--k-label-secondary)]">
            <ShieldCheck className="h-4 w-4 text-[var(--f-emerald-600)]" aria-hidden />Open liabilities
          </div>
          <p className="mt-2 text-[24px] font-semibold leading-8 text-[var(--f-emerald-700)]">{formatINR(gst.open_liabilities)}</p>
          <p className="mt-1 text-[12px] leading-4 text-[var(--k-label-secondary)]">No outstanding dues on the portal</p>
        </KimiCard>
        <KimiCard>
          <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--k-label-secondary)]">
            <TrendingUp className="h-4 w-4 text-[var(--f-emerald-600)]" aria-hidden />Turnover FY 2025-26
          </div>
          <p className="mt-2 text-[24px] font-semibold leading-8 text-[var(--k-label-primary)]">{formatINR(fy2526?.system_calculated ?? 0)}</p>
          <p className="mt-1 text-[12px] leading-4 text-[var(--k-label-secondary)]">System-calculated from filed returns</p>
        </KimiCard>
      </div>

      {/* Filing register */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <KimiCard title="Monthly filing register" pad={false} className="lg:col-span-2">
          <table className="mt-1 w-full text-left">
            <thead>
              <tr className="border-b-[0.5px] border-[var(--k-separator)]">
                <th className="k-c1-em px-5 py-2 pt-4 font-medium">Period</th>
                <th className="k-c1-em px-3 py-2 pt-4 font-medium">GSTR-1 <span className="font-normal text-[var(--k-label-secondary)]">(due 11th)</span></th>
                <th className="k-c1-em px-5 py-2 pt-4 font-medium">GSTR-3B <span className="font-normal text-[var(--k-label-secondary)]">(due 20th)</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
              {[...gst.periods].reverse().map((p) => (
                <tr key={p.period_start} className="transition-colors duration-150 hover:bg-[var(--k-fill-f1)]">
                  <td className="k-b2-em px-5 py-3 whitespace-nowrap">
                    {fmtPeriod(p.period_start)}
                    <span className="ml-2 text-[11px] text-[var(--k-label-secondary)]">FY {p.fy}</span>
                  </td>
                  <td className="px-3 py-3"><SlotCell slot={p.gstr1} /></td>
                  <td className="px-5 py-3"><SlotCell slot={p.gstr3b} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </KimiCard>

        <div className="space-y-6">
          {/* Filing discipline */}
          <KimiCard title="Filing discipline">
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="k-b2">Returns filed</span>
                <span className="k-b2-em">{filedTotal} / {gst.periods.length * 2}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--k-fill-f2)]">
                <div
                  className="h-full rounded-full bg-[var(--f-emerald-500)]"
                  style={{ width: `${(filedTotal / (gst.periods.length * 2)) * 100}%` }}
                />
              </div>
              <p className="text-[12px] leading-4 text-[var(--k-label-secondary)]">
                {filedLate} were filed after the due date. Late fees accrue ₹200/day (₹100 CGST + ₹100 SGST) capped per return.
              </p>
            </div>
          </KimiCard>

          {/* Annual returns */}
          <KimiCard title="Annual returns">
            <div className="mt-3 space-y-3">
              {gst.annual_returns.map((a) => (
                <div key={a.fy} className="rounded-xl bg-[var(--k-fill-f1)] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="k-b2-em">FY {a.fy}</span>
                    <KimiBadge tone={a.gstr9 === 'not_filed' ? 'neutral' : 'blue'}>
                      {a.gstr9 === 'not_filed' ? 'GSTR-9 not filed' : 'GSTR-9 not due'}
                    </KimiBadge>
                  </div>
                  <p className="mt-1 text-[12px] leading-4 text-[var(--k-label-secondary)]">{a.note}</p>
                </div>
              ))}
            </div>
          </KimiCard>

          {/* Turnover per FY */}
          <KimiCard title="Turnover per portal" pad={false}>
            <table className="mt-1 w-full text-left">
              <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
                {gst.turnover.map((t) => (
                  <tr key={t.fy} className="transition-colors duration-150 hover:bg-[var(--k-fill-f1)]">
                    <td className="k-b2-em px-5 py-3">FY {t.fy}</td>
                    <td className="k-b2 px-5 py-3 text-right">
                      {formatINR(t.system_calculated)}
                      {t.estimated != null && (
                        <span className="block text-[11px] text-[var(--k-label-secondary)]">est. {formatINR(t.estimated)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </KimiCard>

          <p className="flex items-center gap-1.5 px-1 text-[12px] leading-[18px] text-[var(--k-label-secondary)]">
            <Receipt className="h-3.5 w-3.5" aria-hidden />
            Registered since Sep 2024 · returns before that do not exist on the portal
          </p>
        </div>
      </div>
    </>
  )
}
