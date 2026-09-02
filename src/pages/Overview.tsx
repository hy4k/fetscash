import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAccount } from '@/lib/AccountContext'
import { PageSkeleton } from '@/components/kimi/PageHeader'
import { Kicker, StatStrip, StatusText, M } from '@/components/ledger'
import { formatINR } from '@/lib/data'
import { invoiceIsOverdue } from '@/sections/OutstandingInvoices'

const NAV_ROWS = [
  { to: '/invoices', index: '02', label: 'Mint', blurb: 'Raise, print and track invoices — INR and foreign currency, with the A4 sheet and payment history behind each one.' },
  { to: '/ledger', index: '03', label: 'Vault', blurb: 'The bank ledger. Every credit and debit imported from statements, categorised, with a running balance.' },
  { to: '/cash', index: '04', label: 'FETS Cash', blurb: 'Petty cash at both centres — replenishments in, day-to-day spends out, reconciled per location.' },
  { to: '/recurring', index: '05', label: 'Recurring', blurb: 'Rent, salaries, subscriptions and retainers that repeat — what is due next and what already posted.' },
  { to: '/reimburse', index: '06', label: 'Reimburse', blurb: 'Partner claims from receipt to payout, grouped by person with a settlement trail.' },
  { to: '/reports', index: '07', label: 'Reports', blurb: 'Where the money went and who it came from — category and client breakdowns over any period.' },
  { to: '/gst', index: '08', label: 'GST', blurb: 'Output and input tax per month, export invoices at zero rate, and the net payable before filing.' },
  { to: '/settings', index: '09', label: 'Settings', blurb: 'Clients, products, categories, centres, invoice numbering and the data backend, all in one place.' },
]

export default function Overview() {
  const { data, loading } = useAccount()
  const navigate = useNavigate()

  const outstandingByClient = useMemo(() => {
    if (!data) return []
    const map = new Map<string, { name: string; total: number; count: number; overdue: boolean; due?: string }>()
    for (const inv of data.unpaidInvoices) {
      const name = inv.customer_name ?? 'Unknown'
      const e = map.get(name) ?? { name, total: 0, count: 0, overdue: false, due: inv.due_date }
      e.total += inv.total_amount - inv.paid_amount
      e.count += 1
      if (invoiceIsOverdue(inv)) e.overdue = true
      if (inv.due_date && (!e.due || inv.due_date < e.due)) e.due = inv.due_date
      map.set(name, e)
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 6)
  }, [data])

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  const netPositive = data.monthNet >= 0
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
  const rowStats: Record<string, string> = {
    Mint: `${data.outstandingCount} UNPAID`,
    Vault: `${data.expenses.length + data.payments.length} LINES`,
    'FETS Cash': formatINR(data.cashBalance),
    Reports: '6 MONTHS',
  }

  return (
    <>
      {/* Hero */}
      <div className="border-b border-[var(--f-hairline)] pb-12 pt-8 sm:pb-16 sm:pt-12">
        <Kicker green className="mb-6 !text-[12px] !tracking-[0.22em]">01 · DAYBOOK · {today}</Kicker>
        <h1 className="m-0 max-w-[20ch] text-[clamp(44px,6.5vw,96px)] font-semibold leading-[0.94] tracking-[-0.045em]">
          The money picture
        </h1>
        <p className="f-lede m-0 mt-8 max-w-[58ch]">
          Everything the accounts of Forum Testing &amp; Educational Services holds {data.periodLabel.toLowerCase()},
          in the order you usually want it.
        </p>
      </div>

      {/* KPI strip */}
      <StatStrip
        stats={[
          {
            label: 'CASH IN HAND',
            value: formatINR(data.cashBalance),
            sub: (
              <span className="flex gap-4">
                <span>COCHIN {formatINR(data.cashByLocation.cochin).replace('₹', '')}</span>
                <span>CALICUT {formatINR(data.cashByLocation.calicut).replace('₹', '')}</span>
              </span>
            ),
          },
          { label: `${data.incomeLabel.toUpperCase()} · ${data.periodLabel.toUpperCase()}`, value: formatINR(data.monthIncome), tone: 'green' },
          {
            label: `EXPENSES · ${data.periodLabel.toUpperCase()}`,
            value: formatINR(data.monthExpenses),
            sub: <span className={netPositive ? 'text-[var(--f-green)]' : 'text-[var(--f-red)]'}>NET {formatINR(Math.abs(data.monthNet)).toUpperCase()} {netPositive ? 'SURPLUS' : 'DEFICIT'}</span>,
          },
          { label: 'OUTSTANDING', value: formatINR(data.outstandingTotal), tone: 'gold', sub: `${data.outstandingCount} UNPAID INVOICES` },
        ]}
      />

      {/* Chart + outstanding */}
      <section className="mt-9 grid items-start gap-7 lg:grid-cols-2">
        <div className="k-card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="m-0 text-[17px] font-semibold tracking-[-0.01em]">{data.incomeLabel} vs expenses</h2>
            <div className="f-mono flex gap-4 text-[10.5px] tracking-[0.10em] text-[var(--k-label-secondary)]">
              <span className="flex items-center gap-1.5"><span className="h-[9px] w-[9px] bg-[var(--f-green)]" />{data.incomeLabel.toUpperCase()}</span>
              <span className="flex items-center gap-1.5"><span className="h-[9px] w-[9px] bg-[var(--f-gold)]" />EXPENSES</span>
            </div>
          </div>
          <div className="mt-6 h-[236px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barGap={5}>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'rgba(17,23,19,0.5)', fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={{ stroke: 'rgba(17,23,19,0.18)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgba(17,23,19,0.4)', fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                  width={40}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [formatINR(value), name === 'income' ? data.incomeLabel : 'Expenses']}
                  cursor={{ fill: 'rgba(17,23,19,0.04)' }}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid rgba(17,23,19,0.14)',
                    background: '#FCFBF7',
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, monospace',
                    boxShadow: '0 4px 16px rgba(17,23,19,0.10)',
                  }}
                />
                <Bar dataKey="income" fill="#0B5C43" radius={[3, 3, 0, 0]} maxBarSize={26} />
                <Bar dataKey="expenses" fill="#C9A227" radius={[3, 3, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="k-card p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="m-0 text-[17px] font-semibold tracking-[-0.01em]">Outstanding</h2>
            <button type="button" onClick={() => navigate('/invoices')} className="text-[13px] font-medium text-[var(--f-green)] hover:text-[var(--f-green-deep)]">
              All {data.outstandingCount}
            </button>
          </div>
          {outstandingByClient.length === 0 ? (
            <p className="k-b2-secondary py-10 text-center">Nothing pending — all invoices settled.</p>
          ) : (
            <div className="mt-4 grid">
              {outstandingByClient.map((c) => (
                <div key={c.name} className="flex items-center justify-between gap-4 border-t border-[var(--f-hairline-soft)] py-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium">{c.name}</div>
                    <div className="mt-1">
                      <StatusText tone={c.overdue ? 'red' : 'muted'}>
                        {c.due
                          ? `${c.overdue ? 'WAS DUE' : 'DUE'} ${new Date(c.due).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}`
                          : 'NO DUE DATE'}
                        {` · ${c.count} INV`}
                      </StatusText>
                    </div>
                  </div>
                  <M className="shrink-0 text-[14px]">{formatINR(c.total)}</M>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Activity */}
      <section className="k-card mt-7 p-6 pb-2">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 text-[17px] font-semibold tracking-[-0.01em]">Recent activity</h2>
          <Kicker>{data.periodLabel}</Kicker>
        </div>
        {data.activity.length === 0 ? (
          <p className="k-b2-secondary py-10 text-center">No activity yet.</p>
        ) : (
          <div className="mt-3 grid">
            {data.activity.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 border-t border-[var(--f-hairline-soft)] py-3.5 sm:grid-cols-[76px_minmax(0,1fr)_minmax(0,140px)_auto]"
              >
                <M className="text-[11.5px] text-[var(--k-label-tertiary)]">
                  {new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}
                </M>
                <span className="truncate text-[14px] font-medium">{a.label}</span>
                <span className="f-mono hidden text-[10.5px] uppercase tracking-[0.10em] text-[var(--k-label-tertiary)] sm:block">
                  {a.kind}{a.detail ? ` · ${a.detail}` : ''}
                </span>
                <M className={`text-right text-[14px] ${a.amount >= 0 ? 'text-[var(--f-green)]' : ''}`}>
                  {a.amount >= 0 ? '+' : '−'}{formatINR(Math.abs(a.amount))}
                </M>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* What each ledger holds */}
      <section className="pt-14">
        <Kicker className="mb-3 !text-[12px] !tracking-[0.22em]">WHAT EACH LEDGER HOLDS</Kicker>
        <div className="grid">
          {NAV_ROWS.map((r, i) => (
            <button
              key={r.to}
              type="button"
              onClick={() => navigate(r.to)}
              className={`group grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-4 border-t border-[var(--f-hairline)] py-7 text-left transition-colors hover:bg-[rgba(17,23,19,0.035)] sm:grid-cols-[44px_minmax(0,0.9fr)_minmax(0,1.4fr)_auto] sm:gap-7 ${
                i === NAV_ROWS.length - 1 ? 'border-b' : ''
              }`}
            >
              <span className="f-mono text-[13px] text-[var(--f-gold-deep)]">{r.index}</span>
              <span className="text-[clamp(24px,3vw,40px)] font-medium leading-none tracking-[-0.03em]">{r.label}</span>
              <span className="hidden text-[15px] leading-[1.5] text-[var(--k-label-secondary)] sm:block">{r.blurb}</span>
              <M className="whitespace-nowrap text-[13px] text-[var(--k-label-secondary)]">{rowStats[r.label] ?? ''}</M>
            </button>
          ))}
        </div>
      </section>
    </>
  )
}
