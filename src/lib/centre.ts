import type { CustomerFull, InvoiceRow, LocationType } from '@/types'

export const centreLabel = (l: LocationType) => (l === 'cochin' ? 'Cochin' : 'Calicut')

/**
 * Resolve which centre an invoice belongs to.
 * Priority: manual override > location stored on the invoice > prefix convention
 * (PVCL* = Calicut, PVCH* = Cochin) > client address keywords > Calicut (HQ).
 */
export function centreOf(
  inv: InvoiceRow,
  customers: CustomerFull[],
  overrides: Record<string, LocationType>
): LocationType {
  if (overrides[inv.id]) return overrides[inv.id]
  if (inv.location) return inv.location
  const num = (inv.invoice_number || '').toUpperCase()
  if (num.startsWith('PVCL')) return 'calicut'
  if (num.startsWith('PVCH')) return 'cochin'
  const cust = customers.find((c) => c.name === inv.customer_name)
  const addr = (cust?.address || '').toLowerCase()
  if (/cochin|kochi|ernakulam|panampilly/.test(addr)) return 'cochin'
  return 'calicut'
}
