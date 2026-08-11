import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useAccount } from '@/lib/AccountContext'
import { PageHeader, PageSkeleton } from '@/components/kimi/PageHeader'
import { KimiCard } from '@/components/kimi/Card'
import { AddExpenseDialog, AddIncomeDialog } from '@/sections/QuickAdd'
import { formatINR } from '@/lib/data'

/** Vibrant finance palette — emerald, gold, teal, violet, sky, slate. */
const PIE_COLORS = ['#059669', '#d4a017', '#0d9488', '#8b5cf6', '#0ea5e9', '#94a3b8']

export default function Reports() {
  const { data, loading } = useAccount()

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  const totalExpenses = data.monthly.reduce((s, m) => s + m.expenses, 0)
  const totalIncome = data.monthly.reduce((s, m) => s + m.income, 0)
  const net = totalIncome - totalExpenses
  // Prefer expense categories; fall back to billing-by-client when no expense data exists.
  const byExpense = data.categoryBreakdown.length > 0
  const breakdown = byExpense ? data.categoryBreakdown : data.clientBreakdown
  const breakdownTitle = byExpense ? 'Spending by category' : 'Billing by client'
  const catTotal = breakdown.reduce((s, c) => s + c.amount, 0)

  return (
    <>
      <PageHeader
        title="Reports"
        description="Six-month summary and spending mix"
        actions={
          <div className="flex items-center gap-2">
            <AddExpenseDialog />
            <AddIncomeDialog />
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly summary table */}
        <KimiCard title="Monthly summary" pad={false} className="lg:col-span-2">
          <table className="mt-1 w-full text-left">
            <thead>
              <tr className="border-b-[0.5px] border-[var(--k-separator)]">
                <th className="k-c1-em px-5 py-2 pt-4 font-medium">Month</th>
                <th className="k-c1-em px-3 py-2 pt-4 text-right font-medium">{data.incomeLabel}</th>
                <th className="k-c1-em px-3 py-2 pt-4 text-right font-medium">Expenses</th>
                <th className="k-c1-em px-5 py-2 pt-4 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
              {data.monthly.map((m) => {
                const mNet = m.income - m.expenses
                return (
                  <tr key={m.month} className="transition-colors duration-150 hover:bg-[var(--k-fill-f1)]">
                    <td className="k-b2-em px-5 py-3">{m.month}</td>
                    <td className="k-b2 px-3 py-3 text-right text-[var(--f-emerald-600)]">{formatINR(m.income)}</td>
                    <td className="k-b2 px-3 py-3 text-right text-[var(--k-danger)]">{formatINR(m.expenses)}</td>
                    <td className={`k-b2-em px-5 py-3 text-right ${mNet >= 0 ? 'text-[var(--k-label-primary)]' : 'text-[var(--k-danger)]'}`}>
                      {mNet >= 0 ? '+' : '−'}{formatINR(Math.abs(mNet))}
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t-[0.5px] border-[var(--k-separator)] bg-[var(--k-fill-f1)]">
                <td className="k-b2-em px-5 py-3">Total</td>
                <td className="k-b2-em px-3 py-3 text-right text-[var(--f-emerald-600)]">{formatINR(totalIncome)}</td>
                <td className="k-b2-em px-3 py-3 text-right text-[var(--k-danger)]">{formatINR(totalExpenses)}</td>
                <td className={`k-b2-em px-5 py-3 text-right ${net >= 0 ? 'text-[var(--k-label-primary)]' : 'text-[var(--k-danger)]'}`}>
                  {net >= 0 ? '+' : '−'}{formatINR(Math.abs(net))}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="k-c1 px-5 py-3">Last 6 months · INR</p>
        </KimiCard>

        {/* Category breakdown donut */}
        <KimiCard title={breakdownTitle} actions={<span className="k-c1">{byExpense ? 'All time' : '6 months'}</span>} pad={false}>
          {breakdown.length === 0 ? (
            <p className="k-b2-secondary px-5 py-12 text-center">No expenses in this period.</p>
          ) : (
            <>
              <div className="h-[200px] px-5 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={56}
                      outerRadius={84}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {breakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [formatINR(value), name]}
                      contentStyle={{
                        borderRadius: 8,
                        border: '0.5px solid rgba(0,0,0,0.13)',
                        fontSize: 13,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2 px-5 pb-5 pt-2">
                {breakdown.map((c, i) => (
                  <li key={c.category} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="k-b2 flex-1 truncate">{c.category}</span>
                    <span className="k-c1">{catTotal > 0 ? Math.round((c.amount / catTotal) * 100) : 0}%</span>
                    <span className="k-b2-em w-20 text-right">{formatINR(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </KimiCard>
      </div>
    </>
  )
}
