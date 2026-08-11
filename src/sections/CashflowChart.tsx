import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { KimiCard } from '@/components/kimi/Card'
import { formatINR } from '@/lib/data'
import type { MonthlyPoint } from '@/types'

/**
 * Income (or Invoiced) vs expenses bar chart.
 */
export function CashflowChart({ monthly, incomeLabel = 'Income' }: { monthly: MonthlyPoint[]; incomeLabel?: string }) {
  return (
    <KimiCard title={`${incomeLabel} vs expenses`} actions={<span className="k-c1">Last 6 months</span>} pad={false}>
      <div className="h-[264px] px-3 pb-4 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthly} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.3)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
              width={44}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatINR(value), name === 'income' ? incomeLabel : 'Expenses']}
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              contentStyle={{
                borderRadius: 8,
                border: '0.5px solid rgba(0,0,0,0.13)',
                fontSize: 13,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              }}
            />
            <Legend formatter={(v: string) => (v === 'income' ? incomeLabel : 'Expenses')} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </KimiCard>
  )
}
