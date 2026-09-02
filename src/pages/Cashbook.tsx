import { useState } from 'react'
import { useAccount } from '@/lib/AccountContext'
import { PageHeader, PageSkeleton } from '@/components/kimi/PageHeader'
import { KimiCard } from '@/components/kimi/Card'
import { KimiBadge } from '@/components/kimi/Badge'
import { AddCashDialog } from '@/sections/QuickAdd'
import { EditCashDialog, RowActions } from '@/components/edit/EditDialogs'
import { formatINR } from '@/lib/data'
import type { CashTxnRow } from '@/types'

const typeLabel: Record<string, { label: string; tone: 'green' | 'red' | 'neutral' }> = {
  replenishment: { label: 'Top-up', tone: 'green' },
  expense: { label: 'Cash spend', tone: 'red' },
  adjustment: { label: 'Adjustment', tone: 'neutral' },
}

export default function Cashbook() {
  const { data, loading, deleteCashTxn } = useAccount()
  const [editing, setEditing] = useState<CashTxnRow | null>(null)

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  const txns = [...data.cashTxns].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <PageHeader
        title="Cashbook"
        description="Petty cash movement across both centres"
        actions={<AddCashDialog />}
      />
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="k-card p-5">
            <p className="k-b2-secondary">Cochin balance</p>
            <p className="mt-1 text-[20px] font-semibold leading-[30px] text-[var(--k-label-primary)]">{formatINR(data.cashByLocation.cochin)}</p>
          </div>
          <div className="k-card p-5">
            <p className="k-b2-secondary">Calicut balance</p>
            <p className="mt-1 text-[20px] font-semibold leading-[30px] text-[var(--k-label-primary)]">{formatINR(data.cashByLocation.calicut)}</p>
          </div>
          <div className="k-card p-5">
            <p className="k-b2-secondary">Total cash in hand</p>
            <p className="mt-1 text-[20px] font-semibold leading-[30px] text-[var(--k-label-primary)]">{formatINR(data.cashBalance)}</p>
          </div>
        </div>

        <KimiCard title="Cash entries" pad={false}>
          {txns.length === 0 ? (
            <p className="k-b2-secondary px-5 py-12 text-center">No cash entries yet.</p>
          ) : (
            <ul className="divide-y divide-[rgba(0,0,0,0.06)] px-5 pb-3">
              {txns.map((t) => {
                const signed = t.type === 'replenishment' ? t.amount : t.type === 'expense' ? -t.amount : t.amount
                const meta = typeLabel[t.type] ?? typeLabel.adjustment
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="k-b2-em truncate">{t.description || meta.label}</p>
                      <p className="k-c1">
                        {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {t.location ? ` · ${t.location === 'cochin' ? 'Cochin' : 'Calicut'}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`k-b2-em ${signed >= 0 ? 'text-[var(--f-emerald-600)]' : 'text-[var(--k-danger)]'}`}>
                        {signed >= 0 ? '+' : '−'}{formatINR(Math.abs(signed))}
                      </span>
                      <KimiBadge tone={meta.tone}>{meta.label}</KimiBadge>
                      <RowActions
                        onEdit={() => setEditing(t)}
                        onDelete={() => deleteCashTxn(t.id)}
                        deleteTitle="Delete this cash entry?"
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </KimiCard>
      </div>
      {editing && <EditCashDialog txn={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
