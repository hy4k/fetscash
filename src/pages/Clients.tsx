import { useState } from 'react'
import { Search } from 'lucide-react'
import { useAccount } from '@/lib/AccountContext'
import { PageSkeleton } from '@/components/kimi/PageHeader'
import { PageHero, M, StatusText } from '@/components/ledger'
import { AddClientDialog } from '@/components/create/CreateDialogs'
import { EditClientDialog, RowActions } from '@/components/edit/EditDialogs'
import { formatINR } from '@/lib/data'
import type { CustomerFull } from '@/types'

export default function Clients() {
  const { data, loading, deleteCustomer } = useAccount()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<CustomerFull | null>(null)

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  const customers = data.customers.filter(
    (c) => !query || c.name.toLowerCase().includes(query.toLowerCase())
  )
  const totalReceivable = data.customers.reduce((s, c) => s + c.balance, 0)

  return (
    <>
      <PageHero
        index="09"
        section="SETTINGS · CLIENTS"
        title="Clients"
        lede={`${data.customers.length} organizations · ${formatINR(totalReceivable)} total receivable.`}
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--k-label-quaternary)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients"
                className="h-12 w-56 rounded-full border border-[rgba(17,23,19,0.22)] bg-[var(--f-card)] pl-9 pr-4 text-[14px] text-[var(--k-label-primary)] placeholder:text-[var(--k-label-quaternary)] focus:outline-none"
              />
            </div>
            <AddClientDialog />
          </>
        }
      />

      <div className="f-kicker grid grid-cols-[minmax(0,1.6fr)_auto] gap-x-6 border-b border-[var(--f-hairline)] py-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_90px_130px_60px]">
        <span>CLIENT</span>
        <span className="hidden sm:block">GSTIN</span>
        <span className="hidden text-right sm:block">INVOICES</span>
        <span className="text-right">BALANCE</span>
        <span className="hidden text-right sm:block">EDIT</span>
      </div>

      {customers.length === 0 ? (
        <p className="k-b2-secondary py-10 text-center">No clients match “{query}”.</p>
      ) : (
        customers.map((c) => (
          <div
            key={c.id}
            className="grid grid-cols-[minmax(0,1.6fr)_auto] items-center gap-x-6 border-b border-[var(--f-hairline-soft)] py-5 transition-colors hover:bg-[rgba(17,23,19,0.035)] sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_90px_130px_60px]"
          >
            <div className="min-w-0">
              <p className="truncate text-[16px] font-medium">{c.name}</p>
              {(c.email || c.phone) && (
                <p className="k-c1 mt-1 truncate">{[c.email, c.phone].filter(Boolean).join(' · ')}</p>
              )}
            </div>
            <M className="hidden text-[12px] text-[var(--k-label-secondary)] sm:block">{c.tax_id ?? '—'}</M>
            <M className="hidden text-right text-[12px] sm:block">{c.total_invoices} INV</M>
            <span className="text-right">
              {c.balance > 0 ? (
                <M className="text-[13px] text-[var(--f-gold-dark)]">{formatINR(c.balance)}</M>
              ) : (
                <StatusText tone="green">SETTLED</StatusText>
              )}
            </span>
            <span className="hidden justify-end sm:flex">
              <RowActions
                onEdit={() => setEditing(c)}
                onDelete={() => deleteCustomer(c.id)}
                deleteTitle={`Delete ${c.name}?`}
                deleteDescription={c.total_invoices > 0
                  ? `This client has ${c.total_invoices} invoice(s) on record — those invoices will stay, but the client card is removed.`
                  : 'This cannot be undone.'}
              />
            </span>
          </div>
        ))
      )}
      {editing && <EditClientDialog client={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
