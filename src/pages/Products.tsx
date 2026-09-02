import { useState } from 'react'
import { useAccount } from '@/lib/AccountContext'
import { PageSkeleton } from '@/components/kimi/PageHeader'
import { PageHero, M, StatusText } from '@/components/ledger'
import { AddProductDialog } from '@/components/create/CreateDialogs'
import { EditProductDialog, RowActions } from '@/components/edit/EditDialogs'
import { formatINR } from '@/lib/data'
import type { ProductRow } from '@/types'

export default function Products() {
  const { data, loading, deleteProduct } = useAccount()
  const [editing, setEditing] = useState<ProductRow | null>(null)

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  const products = data.products

  return (
    <>
      <PageHero
        index="09"
        section="SETTINGS · PRODUCTS"
        title="Products"
        lede={`${products.length} billable items in the catalog — rates, HSN codes and tax as printed on invoices.`}
        actions={<AddProductDialog />}
      />

      <div className="f-kicker grid grid-cols-[minmax(0,1.6fr)_auto] gap-x-6 border-b border-[var(--f-hairline)] py-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_110px_100px_60px]">
        <span>ITEM</span>
        <span className="hidden sm:block">HSN / SAC</span>
        <span className="text-right">RATE</span>
        <span className="hidden text-right sm:block">TAX</span>
        <span className="hidden text-right sm:block">EDIT</span>
      </div>

      {products.length === 0 ? (
        <p className="k-b2-secondary py-12 text-center">No products imported yet.</p>
      ) : (
        products.map((p) => {
          const gst = p.tax_list?.match(/IGST : (\d+)%/)
          const gstRate = gst ? parseInt(gst[1], 10) : 0
          return (
            <div
              key={p.id}
              className="grid grid-cols-[minmax(0,1.6fr)_auto] items-center gap-x-6 border-b border-[var(--f-hairline-soft)] py-5 transition-colors hover:bg-[rgba(17,23,19,0.035)] sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_110px_100px_60px]"
            >
              <div className="min-w-0">
                <p className="truncate text-[16px] font-medium">{p.name}</p>
                {p.description && <p className="k-c1 mt-1 truncate">{p.description}</p>}
              </div>
              <M className="hidden text-[12px] text-[var(--k-label-secondary)] sm:block">{p.hsn || '—'}</M>
              <M className="text-right text-[13px]">{formatINR(p.sale_rate)}</M>
              <span className="hidden text-right sm:block">
                <StatusText tone={gstRate > 0 ? 'muted' : 'muted'}>{gstRate > 0 ? `IGST ${gstRate}%` : 'NO TAX'}</StatusText>
              </span>
              <span className="hidden justify-end sm:flex">
                <RowActions
                  onEdit={() => setEditing(p)}
                  onDelete={() => deleteProduct(p.id)}
                  deleteTitle={`Delete "${p.name}"?`}
                  deleteDescription="Existing invoices keep their own line items — only the catalog entry is removed."
                />
              </span>
            </div>
          )
        })
      )}
      <p className="f-mono py-4 text-[11px] tracking-[0.10em] text-[var(--k-label-tertiary)]">
        {products.length} ITEM{products.length === 1 ? '' : 'S'}
      </p>
      {editing && <EditProductDialog product={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
