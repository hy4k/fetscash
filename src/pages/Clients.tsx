import { useState } from 'react'
import { Search, Building2, Mail, Phone, ReceiptText } from 'lucide-react'
import { useAccount } from '@/lib/AccountContext'
import { PageHeader, PageSkeleton } from '@/components/kimi/PageHeader'
import { KimiCard } from '@/components/kimi/Card'
import { KimiBadge } from '@/components/kimi/Badge'
import { AddClientDialog } from '@/components/create/CreateDialogs'
import { formatINR } from '@/lib/data'

export default function Clients() {
  const { data, loading } = useAccount()
  const [query, setQuery] = useState('')

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  const customers = data.customers.filter(
    (c) => !query || c.name.toLowerCase().includes(query.toLowerCase())
  )
  const totalReceivable = data.customers.reduce((s, c) => s + c.balance, 0)

  return (
    <>
      <PageHeader
        title="Clients"
        description={`${data.customers.length} organizations · ${formatINR(totalReceivable)} total receivable`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--k-label-quaternary)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients"
                className="h-8 w-56 rounded-[10px] border-[0.5px] border-[var(--k-separator)] bg-[var(--k-bg-primary)] pl-8 pr-3 text-[14px] leading-5 text-[var(--k-label-primary)] placeholder:text-[var(--k-label-quaternary)] focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--k-blue)]"
              />
            </div>
            <AddClientDialog />
          </div>
        }
      />

      {customers.length === 0 ? (
        <KimiCard><p className="k-b2-secondary py-8 text-center">No clients match “{query}”.</p></KimiCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {customers.map((c) => (
            <div key={c.id} className="k-card flex flex-col p-5 transition-shadow duration-150 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--f-emerald-50)] text-[var(--f-emerald-700)]">
                    <Building2 className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="k-b2-em truncate">{c.name}</p>
                    {c.tax_id && <p className="k-c1">GST {c.tax_id}</p>}
                  </div>
                </div>
                {c.balance > 0
                  ? <KimiBadge tone="orange">{formatINR(c.balance)} due</KimiBadge>
                  : <KimiBadge tone="green">Settled</KimiBadge>}
              </div>

              {c.address && (
                <p className="k-c1 mt-3 line-clamp-2 whitespace-pre-line">{c.address}</p>
              )}

              <div className="mt-auto flex items-center justify-between border-t-[0.5px] border-[var(--k-separator)] pt-3 text-[12px] leading-[18px] text-[var(--k-label-tertiary)] [&_svg]:h-3.5 [&_svg]:w-3.5">
                <span className="flex items-center gap-1.5">
                  <ReceiptText aria-hidden /> {c.total_invoices} invoice{c.total_invoices === 1 ? '' : 's'}
                </span>
                {c.email && <span className="flex items-center gap-1.5 truncate"><Mail aria-hidden /> {c.email}</span>}
                {c.phone && <span className="flex items-center gap-1.5"><Phone aria-hidden /> {c.phone}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
