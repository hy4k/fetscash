import { ArrowDownLeft, ArrowUpRight, Wallet, FileText } from 'lucide-react'
import { KimiCard } from '@/components/kimi/Card'
import { formatINR } from '@/lib/data'
import type { ActivityItem } from '@/types'

const kindIcon: Record<ActivityItem['kind'], React.ReactNode> = {
  income: <ArrowUpRight />,
  expense: <ArrowDownLeft />,
  cash: <Wallet />,
  invoice: <FileText />,
}

const kindChip: Record<ActivityItem['kind'], string> = {
  income: 'bg-[var(--k-bg-green-light)] text-[var(--k-positive)]',
  expense: 'bg-[var(--k-bg-red-light)] text-[var(--k-danger)]',
  cash: 'bg-[var(--k-fill-f2)] text-[var(--k-label-secondary)]',
  invoice: 'bg-[var(--k-bg-blue-light)] text-[var(--k-blue)]',
}

export function ActivityFeed({ activity }: { activity: ActivityItem[] }) {
  return (
    <KimiCard title="Recent activity" pad={false}>
      {activity.length === 0 ? (
        <p className="k-b2-secondary px-5 py-10 text-center">No activity yet.</p>
      ) : (
        <ul className="divide-y divide-[rgba(0,0,0,0.06)] px-5 pb-3">
          {activity.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4 ${kindChip[a.kind]}`}>
                {kindIcon[a.kind]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="k-b2-em truncate">{a.label}</p>
                <p className="k-c1 truncate">
                  {new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {a.detail ? ` · ${a.detail}` : ''}
                </p>
              </div>
              <span className={`k-b2-em shrink-0 ${a.amount >= 0 ? 'text-[var(--f-emerald-600)]' : 'text-[var(--k-danger)]'}`}>
                {a.amount >= 0 ? '+' : '−'}{formatINR(Math.abs(a.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </KimiCard>
  )
}
