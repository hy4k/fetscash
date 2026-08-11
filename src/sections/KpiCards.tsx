import { Wallet, ArrowUpRight, ArrowDownRight, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { formatINR } from '@/lib/data'
import type { AccountData } from '@/types'

/**
 * KPI cards — soft tinted surfaces in the emerald + gold finance theme.
 */
type Tone = 'emerald' | 'gold' | 'sky' | 'rose'

const toneCard: Record<Tone, string> = {
  emerald: 'bg-[var(--f-emerald-50)] border-[rgba(5,150,105,0.25)]',
  gold: 'bg-[var(--f-gold-50)] border-[rgba(184,134,11,0.28)]',
  sky: 'bg-[#f0f7ff] border-[rgba(23,131,255,0.22)]',
  rose: 'bg-[#fff3f4] border-[rgba(255,56,73,0.22)]',
}
const toneChip: Record<Tone, string> = {
  emerald: 'bg-[var(--f-emerald-100)] text-[var(--f-emerald-700)]',
  gold: 'bg-[var(--f-gold-100)] text-[var(--f-gold-600)]',
  sky: 'bg-[#dbeafe] text-[#1d4ed8]',
  rose: 'bg-[#ffe0e3] text-[#e11d48]',
}
const toneValue: Record<Tone, string> = {
  emerald: 'text-[var(--f-emerald-800)]',
  gold: 'text-[#8a6508]',
  sky: 'text-[#1e40af]',
  rose: 'text-[#be123c]',
}

function Kpi({ title, value, meta, icon, tone }: {
  title: string
  value: string
  meta?: React.ReactNode
  icon: React.ReactNode
  tone: Tone
}) {
  return (
    <div className={`rounded-xl border-[0.5px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${toneCard[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-[14px] leading-5 text-[var(--k-label-secondary)]">{title}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4 ${toneChip[tone]}`}>
          {icon}
        </span>
      </div>
      <p className={`mt-2 text-[24px] font-semibold leading-[32px] ${toneValue[tone]}`}>{value}</p>
      {meta && <div className="k-c1 mt-1">{meta}</div>}
    </div>
  )
}

export function KpiCards({ data }: { data: AccountData }) {
  const netPositive = data.monthNet >= 0
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi
        title="Cash in hand"
        value={formatINR(data.cashBalance)}
        icon={<Wallet />}
        tone="emerald"
        meta="Current balance"
      />
      <Kpi
        title={data.incomeLabel}
        value={formatINR(data.monthIncome)}
        icon={<ArrowUpRight />}
        tone="sky"
        meta={data.periodLabel}
      />
      <Kpi
        title="Expenses"
        value={formatINR(data.monthExpenses)}
        icon={<ArrowDownRight />}
        tone="rose"
        meta={
          <span className={netPositive ? 'text-[var(--f-emerald-600)]' : 'text-[var(--k-danger)]'}>
            {netPositive
              ? <TrendingUp className="mr-1 inline h-3 w-3" aria-hidden />
              : <TrendingDown className="mr-1 inline h-3 w-3" aria-hidden />}
            Net {formatINR(Math.abs(data.monthNet))} {netPositive ? 'surplus' : 'deficit'} · {data.periodLabel}
          </span>
        }
      />
      <Kpi
        title="Outstanding"
        value={formatINR(data.outstandingTotal)}
        icon={<Clock />}
        tone="gold"
        meta={`${data.outstandingCount} unpaid invoice${data.outstandingCount === 1 ? '' : 's'}`}
      />
    </div>
  )
}
