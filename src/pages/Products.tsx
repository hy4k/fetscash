import { useState } from 'react'
import { Package } from 'lucide-react'
import { useAccount } from '@/lib/AccountContext'
import { PageHeader, PageSkeleton } from '@/components/kimi/PageHeader'
import { KimiCard } from '@/components/kimi/Card'
import { KimiBadge } from '@/components/kimi/Badge'
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
      <PageHeader
        title="Products & Services"
        description={`${products.length} billable items in the catalog`}
        actions={<AddProductDialog />}
      />

      <KimiCard pad={false}>
        {products.length === 0 ? (
          <p className="k-b2-secondary px-5 py-12 text-center">No products imported yet.</p>
        ) : (
          <table className="mt-1 w-full text-left">
            <thead>
              <tr className="border-b-[0.5px] border-[var(--k-separator)]">
                <th className="k-c1-em px-5 py-2 pt-4 font-medium">Item</th>
                <th className="k-c1-em hidden px-3 py-2 pt-4 font-medium md:table-cell">HSN / SAC</th>
                <th className="k-c1-em hidden px-3 py-2 pt-4 font-medium lg:table-cell">Description</th>
                <th className="k-c1-em px-3 py-2 pt-4 text-right font-medium">Rate</th>
                <th className="k-c1-em px-3 py-2 pt-4 font-medium">Tax</th>
                <th className="k-c1-em px-5 py-2 pt-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
              {products.map((p) => {
                const gst = p.tax_list?.match(/IGST : (\d+)%/)
                const gstRate = gst ? parseInt(gst[1], 10) : 0
                return (
                  <tr key={p.id} className="transition-colors duration-150 hover:bg-[var(--k-fill-f1)]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--f-gold-50)] text-[var(--f-gold-600)]">
                          <Package className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="k-b2-em">{p.name}</span>
                      </div>
                    </td>
                    <td className="k-b2-secondary hidden whitespace-nowrap px-3 py-3 md:table-cell">{p.hsn || '—'}</td>
                    <td className="k-b2-secondary hidden max-w-[280px] truncate px-3 py-3 lg:table-cell">{p.description || '—'}</td>
                    <td className="k-b2-em whitespace-nowrap px-3 py-3 text-right">{formatINR(p.sale_rate)}</td>
                    <td className="px-3 py-3">
                      {gstRate > 0
                        ? <KimiBadge tone="blue">IGST {gstRate}%</KimiBadge>
                        : <KimiBadge tone="neutral">No tax</KimiBadge>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <RowActions
                        onEdit={() => setEditing(p)}
                        onDelete={() => deleteProduct(p.id)}
                        deleteTitle={`Delete "${p.name}"?`}
                        deleteDescription="Existing invoices keep their own line items — only the catalog entry is removed."
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <p className="k-c1 px-5 py-3">{products.length} item{products.length === 1 ? '' : 's'}</p>
      </KimiCard>
      {editing && <EditProductDialog product={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
