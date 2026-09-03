import { useNavigate } from 'react-router'
import { useAccount } from '@/lib/AccountContext'
import { useSettings } from '@/lib/settings'
import { useReimbursements } from '@/lib/reimburse'
import { PageSkeleton } from '@/components/kimi/PageHeader'
import { Kicker, M } from '@/components/ledger'
import { formatINR } from '@/lib/data'
import { cn } from '@/lib/utils'

const PAGES = [
  { to: '/invoices', index: '02', label: 'Mint' },
  { to: '/ledger', index: '03', label: 'Vault' },
  { to: '/cash', index: '04', label: 'FETS Cash' },
  { to: '/recurring', index: '05', label: 'Recurring' },
  { to: '/reimburse', index: '06', label: 'Alimony' },
  { to: '/reports', index: '07', label: 'Reports' },
  { to: '/gst', index: '08', label: 'GST' },
]

/* Neumorphic menu buttons (per supplied design) — paper pills with a soft raised
   shadow that press inward on :active. Settings uses the 50px icon variant. */
const menuBtnCls =
  'k-press rounded-[25px] border border-[rgb(36,41,46)] bg-[#e8e8e8] px-[1.7em] py-[0.7em] ' +
  'text-[16px] leading-none text-[rgb(36,41,46)] transition-all duration-300 ' +
  'shadow-[6px_6px_12px_#c5c5c5,-6px_-6px_12px_#ffffff] ' +
  'active:text-[#666666] active:shadow-[inset_4px_4px_12px_#c5c5c5,inset_-4px_-4px_12px_#ffffff]'

function HeroMenu() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-wrap content-start items-start justify-start gap-x-3 gap-y-4 p-6 sm:min-h-[250px] sm:flex-1 sm:justify-end sm:p-8">
      {PAGES.map((r) => (
        <button key={r.to} type="button" onClick={() => navigate(r.to)} className={menuBtnCls}>
          {r.label}
        </button>
      ))}
      <button
        type="button"
        title="Settings"
        aria-label="Settings"
        onClick={() => navigate('/settings')}
        className="group flex h-[50px] w-[50px] items-center justify-center rounded-2xl border border-[rgba(0,0,0,0.19)] bg-[#e8e8e8] shadow-[0_10px_10px_rgba(0,0,0,0.21)] transition-all duration-300 hover:bg-[rgb(59,59,59)] hover:shadow-[0_10px_10px_rgba(0,0,0,0.11)]"
      >
        <svg viewBox="0 0 512 512" className="h-4 w-4 fill-[rgb(77,77,77)] transition-all duration-300 group-hover:fill-white" aria-hidden>
          <path d="M0 416c0 17.7 14.3 32 32 32l54.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 448c17.7 0 32-14.3 32-32s-14.3-32-32-32l-246.7 0c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48L32 384c-17.7 0-32 14.3-32 32zm128 0a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zM320 256a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm32-80c-32.8 0-61 19.7-73.3 48L32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l246.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48l54.7 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-54.7 0c-12.3-28.3-40.5-48-73.3-48zM192 128a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm73.3-64C253 35.7 224.8 16 192 16s-61 19.7-73.3 48L32 64C14.3 64 0 78.3 0 96s14.3 32 32 32l86.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 128c17.7 0 32-14.3 32-32s-14.3-32-32-32L265.3 64z" />
        </svg>
      </button>
    </div>
  )
}

/* ---- live graphics for the page cards ---- */

function Sparkline({ points, color = '#0B5C43', height = 46 }: { points: number[]; color?: string; height?: number }) {
  if (points.length === 0) return <div style={{ height }} />
  const w = 100
  const max = Math.max(...points, 1)
  const step = points.length > 1 ? w / (points.length - 1) : w
  const coords = points
    .map((p, i) => `${(i * step).toFixed(1)},${(height - 4 - (p / max) * (height - 9)).toFixed(1)}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ height, width: '100%' }}>
      <polyline
        points={coords}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="f-mono w-[96px] shrink-0 truncate text-[10.5px] uppercase tracking-[0.10em] text-[var(--k-label-secondary)]">
        {label}
      </span>
      <span className="h-[5px] min-w-0 flex-1 rounded-full bg-[rgba(17,23,19,0.08)]">
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.max(3, Math.min(100, (value / (max || 1)) * 100))}%`, background: color }}
        />
      </span>
      <M className="w-[88px] shrink-0 text-right text-[11.5px]">{formatINR(value)}</M>
    </div>
  )
}

function PageCard({ to, index, label, blurb, metric, sub, graphic, className }: {
  to: string
  index: string
  label: string
  blurb: string
  metric: React.ReactNode
  sub?: React.ReactNode
  graphic?: React.ReactNode
  className?: string
}) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={cn(
        'k-card group flex flex-col p-6 text-left transition-all duration-300',
        'hover:-translate-y-1 hover:border-[var(--f-ink)] hover:shadow-[0_18px_44px_rgba(17,23,19,0.14)] sm:p-7',
        className
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <Kicker>{index} · {label.toUpperCase()}</Kicker>
        <span className="f-mono shrink-0 text-[11px] tracking-[0.14em] text-[var(--k-label-tertiary)] transition-colors group-hover:text-[var(--f-green)]">
          OPEN →
        </span>
      </div>
      <div className="mt-6 text-[clamp(26px,2.6vw,38px)] font-semibold leading-none tracking-[-0.025em]">{metric}</div>
      {sub && (
        <div className="f-mono mt-3 text-[10.5px] uppercase tracking-[0.12em] text-[var(--k-label-secondary)]">{sub}</div>
      )}
      {graphic && <div className="mt-6 flex flex-1 flex-col justify-end gap-2.5">{graphic}</div>}
      <p className="m-0 mt-6 border-t border-[var(--f-hairline-soft)] pt-4 text-[13.5px] leading-[1.55] text-[var(--k-label-secondary)]">
        {blurb}
      </p>
    </button>
  )
}

export default function Overview() {
  const { data, loading } = useAccount()
  const [settings] = useSettings()
  const { entries: claims } = useReimbursements()

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
  const monthKey = new Date().toISOString().slice(0, 7)

  // Mint
  const incomePts = data.monthly.map((m) => m.income)
  // Vault
  const expensePts = data.monthly.map((m) => m.expenses)
  const netPositive = data.monthNet >= 0
  // FETS Cash
  const cashMax = Math.max(data.cashByLocation.cochin, data.cashByLocation.calicut, 1)
  // Recurring
  const templates = settings.recurring
  const recTotal = templates.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
  const recPaid = templates.map((t) =>
    data.expenses.some(
      (e) => e.date.startsWith(monthKey) && e.category === t.category && Math.abs(e.amount - (parseFloat(t.amount) || 0)) <= 1
    )
  )
  const recPaidCount = recPaid.filter(Boolean).length
  // Reimburse
  const open = claims.filter((c) => !c.settled_on)
  const openTotal = open.reduce((s, c) => s + c.amount, 0)
  const byPerson = Object.entries(
    open.reduce<Record<string, number>>((m, c) => {
      m[c.person] = (m[c.person] ?? 0) + c.amount
      return m
    }, {})
  ).sort((a, b) => b[1] - a[1])
  const personMax = Math.max(...byPerson.map(([, v]) => v), 1)
  // Reports
  const cats = [...data.categoryBreakdown].sort((a, b) => b.amount - a.amount).slice(0, 3)
  const catMax = Math.max(...cats.map((c) => c.amount), 1)
  // GST
  const next = new Date()
  next.setMonth(next.getMonth() + 1)
  const due = `20 ${next.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}`
  const usdCount = data.invoices.filter((i) => i.currency === 'USD').length

  return (
    <>
      {/* Hero — date left, Daylight Robbery right, banknote banner below */}
      <div className="pb-12 pt-8 sm:pt-10">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <Kicker green className="!text-[12px] !tracking-[0.22em]">{today}</Kicker>
          <span className="dr-title">Daylight Robbery</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--f-hairline)] bg-[var(--f-card)] shadow-[0_14px_36px_rgba(17,23,19,0.10)]">
          <div className="flex flex-col sm:flex-row">
            <div className="relative h-48 shrink-0 sm:h-auto sm:min-h-[250px] sm:w-[52%]">
              <img
                src="/assets/hero-note.jpg"
                alt="FETS CASH banknote"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              {/* melt the note's right edge into the card */}
              <div className="absolute inset-0 hidden bg-gradient-to-r from-transparent via-transparent to-[var(--f-card)] sm:block" />
            </div>
            <HeroMenu />
          </div>
        </div>
      </div>

      {/* Live page overviews */}
      <section className="pb-4">
        <Kicker className="mb-6 !text-[12px] !tracking-[0.22em]">EVERY PAGE, LIVE</Kicker>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-12">

          <PageCard
            to="/invoices" index="02" label="Mint" className="lg:col-span-7"
            metric={formatINR(data.outstandingTotal)}
            sub={`${data.outstandingCount} unpaid of ${data.invoices.length} invoices · ${data.periodLabel}`}
            graphic={<Sparkline points={incomePts} color="#0B5C43" />}
            blurb="Raise, print and track invoices — INR and foreign currency, with the A4 sheet and payment history behind each one."
          />

          <PageCard
            to="/cash" index="04" label="FETS Cash" className="lg:col-span-5"
            metric={formatINR(data.cashBalance)}
            sub="Petty cash across both centres"
            graphic={
              <>
                <MiniBar label="Cochin" value={data.cashByLocation.cochin} max={cashMax} color="#0B5C43" />
                <MiniBar label="Calicut" value={data.cashByLocation.calicut} max={cashMax} color="#C9A227" />
              </>
            }
            blurb="Replenishments in, day-to-day spends out — reconciled per location by the centre staff."
          />

          <PageCard
            to="/ledger" index="03" label="Vault" className="lg:col-span-5"
            metric={
              <span className={netPositive ? 'text-[var(--f-green)]' : 'text-[var(--f-red)]'}>
                {netPositive ? '+' : '−'}{formatINR(Math.abs(data.monthNet))}
              </span>
            }
            sub={`In ${formatINR(data.monthIncome)} · out ${formatINR(data.monthExpenses)} · ${data.periodLabel}`}
            graphic={
              <>
                <Sparkline points={incomePts} color="#0B5C43" height={34} />
                <Sparkline points={expensePts} color="#C9A227" height={34} />
              </>
            }
            blurb="The bank ledger. Every credit and debit imported from statements, categorised, with a running balance."
          />

          <PageCard
            to="/recurring" index="05" label="Recurring" className="lg:col-span-7"
            metric={formatINR(recTotal)}
            sub={`${recPaidCount} of ${templates.length} schedules paid this month`}
            graphic={
              templates.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  {templates.map((t, i) => (
                    <span
                      key={i}
                      title={t.name}
                      className={cn(
                        'h-3.5 w-3.5 rounded-[4px]',
                        recPaid[i] ? 'bg-[var(--f-green)]' : 'border border-[var(--f-hairline)]'
                      )}
                    />
                  ))}
                  <span className="f-mono ml-2 text-[10px] uppercase tracking-[0.12em] text-[var(--k-label-tertiary)]">
                    one square per schedule
                  </span>
                </div>
              ) : undefined
            }
            blurb="Rent, salaries, utilities and retainers that repeat every month — what is due next and what already posted."
          />

          <PageCard
            to="/reimburse" index="06" label="Alimony" className="lg:col-span-4"
            metric={formatINR(openTotal)}
            sub={`${open.length} open claim${open.length === 1 ? '' : 's'}`}
            graphic={
              byPerson.length > 0 ? (
                <>
                  {byPerson.slice(0, 2).map(([person, amt]) => (
                    <MiniBar key={person} label={person} value={amt} max={personMax} color="#8A6508" />
                  ))}
                </>
              ) : (
                <span className="f-mono text-[11px] uppercase tracking-[0.12em] text-[var(--f-green)]">All settled</span>
              )
            }
            blurb="What you and Niyas spend out of pocket for the company — receipts in, one settlement out."
          />

          <PageCard
            to="/reports" index="07" label="Reports" className="lg:col-span-4"
            metric={cats[0]?.category ?? '—'}
            sub={cats[0] ? `${formatINR(cats[0].amount)} · top category · ${data.periodLabel}` : 'No expenses yet'}
            graphic={
              <>
                {cats.map((c, i) => (
                  <MiniBar
                    key={c.category}
                    label={c.category}
                    value={c.amount}
                    max={catMax}
                    color={['#0B5C43', '#C9A227', '#A83A2E'][i % 3]}
                  />
                ))}
              </>
            }
            blurb="Where the money went and who it came from — category and client breakdowns over any period."
          />

          <PageCard
            to="/gst" index="08" label="GST" className="lg:col-span-4"
            metric={<span className="f-mono tracking-[0.02em]">DUE {due}</span>}
            sub={`${data.invoices.length} invoices on file · ${usdCount} zero-rated export${usdCount === 1 ? '' : 's'}`}
            graphic={
              <div className="f-mono flex gap-2 text-[10.5px] uppercase tracking-[0.12em] text-[var(--k-label-secondary)]">
                <span className="rounded-md border border-[var(--f-hairline)] px-2.5 py-1.5">GSTR-1</span>
                <span className="rounded-md border border-[var(--f-hairline)] px-2.5 py-1.5">GSTR-3B</span>
                <span className="rounded-md border border-[var(--f-hairline)] px-2.5 py-1.5">File by the 20th</span>
              </div>
            }
            blurb="Output and input tax per month, export invoices at zero rate, and the net payable before filing."
          />

        </div>
      </section>
    </>
  )
}
