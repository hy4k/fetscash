import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useAccount } from '@/lib/AccountContext'
import { PageHeader, PageSkeleton } from '@/components/kimi/PageHeader'
import { KimiCard } from '@/components/kimi/Card'
import { KimiBadge } from '@/components/kimi/Badge'
import { KimiSegmentedControl } from '@/components/kimi/SegmentedControl'
import { QuickAdd } from '@/sections/QuickAdd'
import { EditExpenseDialog, EditPaymentDialog, RowActions } from '@/components/edit/EditDialogs'
import { formatINR } from '@/lib/data'
import type { ExpenseRow, PaymentRow } from '@/types'

type Row = {
  id: string
  date: string
  kind: 'income' | 'expense'
  label: string
  detail: string
  amount: number
  expense?: ExpenseRow
  payment?: PaymentRow
}

export default function Transactions() {
  const { data, loading, deleteExpense, deletePayment } = useAccount()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'all' | 'income' | 'expense'>('all')
  const [editExpense, setEditExpense] = useState<ExpenseRow | null>(null)
  const [editPayment, setEditPayment] = useState<PaymentRow | null>(null)

  const rows = useMemo<Row[]>(() => {
    if (!data) return []
    const all: Row[] = [
      ...data.expenses.map((e): Row => ({
        id: `e-${e.id}`,
        date: e.date,
        kind: 'expense',
        label: e.description || e.category,
        detail: [e.category, e.payment_mode, e.location ? (e.location === 'cochin' ? 'Cochin' : 'Calicut') : 'Company-wide'].filter(Boolean).join(' · '),
        amount: -e.amount,
        expense: e,
      })),
      ...data.payments.map((p): Row => ({
        id: `p-${p.id}`,
        date: p.payment_date,
        kind: 'income',
        label: p.invoice_id ? `Payment received — ${p.invoice_id}` : 'Receipt (unmatched)',
        detail: [p.payment_method, p.reference_number, p.exchange_rate ? `@ ₹${p.exchange_rate}/$` : undefined].filter(Boolean).join(' · '),
        amount: p.amount_inr || p.amount,
        payment: p,
      })),
    ]
    return all
      .filter((r) => kind === 'all' || r.kind === kind)
      .filter((r) => !query || `${r.label} ${r.detail}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data, query, kind])

  if (loading && !data) return <PageSkeleton />

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every expense and payment, in one register"
        actions={<QuickAdd />}
      />
      <KimiCard pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <KimiSegmentedControl
            ariaLabel="Transaction type"
            size="sm"
            value={kind}
            onChange={(v) => setKind(v as typeof kind)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Expenses' },
            ]}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--k-label-quaternary)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transactions"
              className="h-8 w-56 rounded-[10px] border-[0.5px] border-[var(--k-separator)] bg-[var(--k-bg-primary)] pl-8 pr-3 text-[14px] leading-5 text-[var(--k-label-primary)] placeholder:text-[var(--k-label-quaternary)] focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--k-blue)]"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="k-b2-secondary px-5 py-12 text-center">
            {query ? `No transactions match “${query}”.` : 'No transactions yet.'}
          </p>
        ) : (
          <table className="mt-3 w-full text-left">
            <thead>
              <tr className="border-b-[0.5px] border-[var(--k-separator)]">
                <th className="k-c1-em px-5 py-2 font-medium">Date</th>
                <th className="k-c1-em px-3 py-2 font-medium">Description</th>
                <th className="k-c1-em hidden px-3 py-2 font-medium md:table-cell">Details</th>
                <th className="k-c1-em px-3 py-2 font-medium">Type</th>
                <th className="k-c1-em px-3 py-2 text-right font-medium">Amount</th>
                <th className="k-c1-em px-5 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors duration-150 hover:bg-[var(--k-fill-f1)]">
                  <td className="k-b2-secondary whitespace-nowrap px-5 py-3">
                    {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="k-b2-em max-w-[280px] truncate px-3 py-3">{r.label}</td>
                  <td className="k-b2-secondary hidden max-w-[220px] truncate px-3 py-3 md:table-cell">{r.detail}</td>
                  <td className="px-3 py-3">
                    <KimiBadge tone={r.kind === 'income' ? 'green' : 'red'}>
                      {r.kind === 'income' ? 'Income' : 'Expense'}
                    </KimiBadge>
                  </td>
                  <td className={`k-b2-em whitespace-nowrap px-3 py-3 text-right ${r.amount >= 0 ? 'text-[var(--f-emerald-600)]' : 'text-[var(--k-danger)]'}`}>
                    {r.amount >= 0 ? '+' : '−'}{formatINR(Math.abs(r.amount))}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    {r.expense && (
                      <RowActions
                        onEdit={() => setEditExpense(r.expense!)}
                        onDelete={() => deleteExpense(r.expense!.id)}
                        deleteTitle="Delete this expense?"
                      />
                    )}
                    {r.payment && (
                      <RowActions
                        onEdit={() => setEditPayment(r.payment!)}
                        onDelete={() => deletePayment(r.payment!.id)}
                        deleteTitle="Delete this receipt?"
                        deleteDescription={r.payment!.invoice_id
                          ? `Linked to invoice ${r.payment!.invoice_id} — the invoice's received total will not change automatically.`
                          : 'This cannot be undone.'}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="k-c1 px-5 py-3">{rows.length} record{rows.length === 1 ? '' : 's'}</p>
      </KimiCard>
      {editExpense && <EditExpenseDialog expense={editExpense} onClose={() => setEditExpense(null)} />}
      {editPayment && <EditPaymentDialog payment={editPayment} onClose={() => setEditPayment(null)} />}
    </>
  )
}
