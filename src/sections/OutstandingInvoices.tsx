import { KimiCard } from '@/components/kimi/Card'
import { KimiBadge } from '@/components/kimi/Badge'
import { formatINR } from '@/lib/data'
import type { InvoiceRow } from '@/types'

export function invoiceIsOverdue(inv: InvoiceRow) {
  if (inv.status === 'overdue') return true
  if (!inv.due_date) return false
  return new Date(inv.due_date) < new Date() && inv.status !== 'paid' && inv.status !== 'cancelled'
}

export function InvoiceStatusBadge({ inv }: { inv: InvoiceRow }) {
  if (invoiceIsOverdue(inv)) return <KimiBadge tone="red">Overdue</KimiBadge>
  switch (inv.status) {
    case 'paid': return <KimiBadge tone="green">Paid</KimiBadge>
    case 'partially_paid': return <KimiBadge tone="orange">Partial</KimiBadge>
    case 'sent': return <KimiBadge tone="blue">Sent</KimiBadge>
    case 'cancelled': return <KimiBadge tone="neutral">Cancelled</KimiBadge>
    default: return <KimiBadge tone="neutral">Draft</KimiBadge>
  }
}

export function OutstandingInvoices({ invoices }: { invoices: InvoiceRow[] }) {
  return (
    <KimiCard title="Outstanding" pad={false}>
      {invoices.length === 0 ? (
        <p className="k-b2-secondary px-5 py-10 text-center">Nothing pending — all invoices settled.</p>
      ) : (
        <ul className="divide-y divide-[rgba(0,0,0,0.06)] px-5 pb-3">
          {invoices.map((inv) => {
            const due = inv.total_amount - inv.paid_amount
            const overdue = invoiceIsOverdue(inv)
            return (
              <li key={inv.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="k-b2-em truncate">
                    {inv.invoice_number}
                    <span className="k-b2-secondary ml-2 font-normal">{inv.customer_name ?? ''}</span>
                  </p>
                  <p className={`k-c1 ${overdue ? 'font-medium text-[var(--k-danger)]' : ''}`}>
                    {inv.due_date
                      ? `${overdue ? 'Was due' : 'Due'} ${new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                      : 'No due date'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="k-b2-em">{formatINR(due)}</span>
                  <InvoiceStatusBadge inv={inv} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </KimiCard>
  )
}
