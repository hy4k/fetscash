import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAccount } from '@/lib/AccountContext'
import { PageSkeleton } from '@/components/kimi/PageHeader'
import { PageHero, Kicker, M } from '@/components/ledger'
import { AddExpenseDialog, AddIncomeDialog } from '@/sections/QuickAdd'
import { formatINR } from '@/lib/data'
import { cn } from '@/lib/utils'

export default function Reports() {
  const { data, loading } = useAccount()

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  const totalExpenses = data.monthly.reduce((s, m) => s + m.expenses, 0)
  const totalIncome = data.monthly.reduce((s, m) => s + m.income, 0)
  const net = totalIncome - totalExpenses

  const byCategory = [...data.categoryBreakdown].sort((a, b) => b.amount - a.amount).slice(0, 6)
  const maxCat = byCategory[0]?.amount || 1
  const byClient = [...data.clientBreakdown].sort((a, b) => b.amount - a.amount).slice(0, 6)
  const maxClient = byClient[0]?.amount || 1

  return (
    <>
      <PageHero
        index="07"
        section="REPORTS"
        title={<>Six months,<br />plainly.</>}
        lede="Where the money went and who it came from. Add a manual entry any time with the buttons."
        actions={
          <>
            <AddExpenseDialog />
            <AddIncomeDialog />
          </>
        }
      />

      {/* Invoiced against expenses */}
      <section className="border-t border-[var(--f-hairline)] py-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="m-0 text-[clamp(22px,2.4vw,30px)] font-medium tracking-[-0.02em]">{data.incomeLabel} against expenses</h2>
          <div className="f-mono flex gap-6 text-[11px] tracking-[0.12em] text-[var(--k-label-secondary)]">
            <span className="flex items-center gap-2"><span className="h-[11px] w-[11px] bg-[var(--f-green)]" />{data.incomeLabel.toUpperCase()}</span>
            <span className="flex items-center gap-2"><span className="h-[11px] w-[11px] bg-[var(--f-gold)]" />EXPENSES</span>
          </div>
        </div>
        <div className="mt-10 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barGap={8}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: 'rgba(17,23,19,0.5)', fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={{ stroke: 'rgba(17,23,19,0.18)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'rgba(17,23,19,0.4)', fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                width={44}
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
              <Bar dataKey="income" fill="#0B5C43" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="expenses" fill="#C9A227" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Where it went / who it came from */}
      <section className="grid border-t border-[var(--f-hairline)] lg:grid-cols-2">
        <div className="min-w-0 py-12 lg:pr-10">
          <Kicker className="mb-8 !text-[12px]">WHERE IT WENT</Kicker>
          {byCategory.length === 0 ? (
            <p className="k-b2-secondary">No expenses in this period.</p>
          ) : (
            <div className="grid gap-6">
              {byCategory.map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between gap-4 text-[15px]">
                    <span>{c.category}</span>
                    <M>{formatINR(c.amount)}</M>
                  </div>
                  <div className="mt-2.5 h-[10px] bg-[rgba(17,23,19,0.08)]">
                    <div className="h-full bg-[var(--f-green)]" style={{ width: `${Math.max(2, (c.amount / maxCat) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="min-w-0 border-t border-[var(--f-hairline-soft)] py-12 lg:border-l lg:border-t-0 lg:pl-10">
          <Kicker className="mb-8 !text-[12px]">WHO IT CAME FROM</Kicker>
          {byClient.length === 0 ? (
            <p className="k-b2-secondary">No billing in this period.</p>
          ) : (
            <div className="grid gap-6">
              {byClient.map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between gap-4 text-[15px]">
                    <span className="min-w-0 truncate">{c.category}</span>
                    <M>{formatINR(c.amount)}</M>
                  </div>
                  <div className="mt-2.5 h-[10px] bg-[rgba(17,23,19,0.08)]">
                    <div className="h-full bg-[var(--f-gold)]" style={{ width: `${Math.max(2, (c.amount / maxClient) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Monthly summary */}
      <section className="border-t border-[var(--f-hairline)] pt-12">
        <Kicker className="mb-2 !text-[12px]">MONTHLY SUMMARY · INR</Kicker>
        <div className="f-kicker grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-6 border-b border-[var(--f-hairline)] py-4">
          <span>MONTH</span>
          <span className="text-right">{data.incomeLabel.toUpperCase()}</span>
          <span className="text-right">EXPENSES</span>
          <span className="text-right">NET</span>
        </div>
        {data.monthly.map((m) => {
          const mNet = m.income - m.expenses
          return (
            <div
              key={m.month}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-x-6 border-b border-[var(--f-hairline-soft)] py-4 transition-colors hover:bg-[rgba(17,23,19,0.035)]"
            >
              <M className="text-[13px] font-medium">{m.month.toUpperCase()}</M>
              <M className="text-right text-[13px] text-[var(--f-green)]">{formatINR(m.income)}</M>
              <M className="text-right text-[13px]">{formatINR(m.expenses)}</M>
              <M className={cn('text-right text-[13px] font-medium', mNet >= 0 ? '' : 'text-[var(--f-red)]')}>
                {mNet >= 0 ? '+' : '−'}{formatINR(Math.abs(mNet))}
              </M>
            </div>
          )
        })}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-x-6 border-b border-[var(--f-hairline)] bg-[rgba(17,23,19,0.035)] py-4">
          <M className="text-[13px] font-semibold">TOTAL</M>
          <M className="text-right text-[13px] font-semibold text-[var(--f-green)]">{formatINR(totalIncome)}</M>
          <M className="text-right text-[13px] font-semibold">{formatINR(totalExpenses)}</M>
          <M className={cn('text-right text-[13px] font-semibold', net >= 0 ? '' : 'text-[var(--f-red)]')}>
            {net >= 0 ? '+' : '−'}{formatINR(Math.abs(net))}
          </M>
        </div>
      </section>
    </>
  )
}
