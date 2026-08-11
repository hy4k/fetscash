import { useState } from 'react'
import { ArrowLeftRight, ChevronRight, FilePlus2, IndianRupee, Trash2 } from 'lucide-react'
import { useAccount } from '@/lib/AccountContext'
import { PageHeader, PageSkeleton } from '@/components/kimi/PageHeader'
import { KimiCard } from '@/components/kimi/Card'
import { KimiBadge } from '@/components/kimi/Badge'
import { KimiButton } from '@/components/kimi/Button'
import { CreateButton } from '@/components/create/CreateDialogs'
import InvoiceGenerator from '@/sections/InvoiceGenerator'
import { InvoiceStatusBadge } from '@/sections/OutstandingInvoices'
import { centreLabel, centreOf } from '@/lib/centre'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatINR } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { InvoiceRow, LocationType } from '@/types'

const today = () => new Date().toISOString().slice(0, 10)

/** Record a payment against an invoice (INR, or USD with exchange rate). */
function RecordPaymentDialog({ invoice, onClose }: { invoice: InvoiceRow; onClose: () => void }) {
  const { recordPayment } = useAccount()
  const isUsd = invoice.original_currency === 'USD'
  const remaining = Math.max(0, invoice.total_amount - invoice.paid_amount)
  const defaultRate = invoice.exchange_rate && invoice.exchange_rate > 0 ? invoice.exchange_rate : 0
  const [form, setForm] = useState({
    date: today(),
    currency: (isUsd ? 'USD' : 'INR') as 'INR' | 'USD',
    amount: isUsd && defaultRate
      ? (remaining / defaultRate).toFixed(2)
      : String(Math.round(remaining * 100) / 100),
    rate: defaultRate ? String(defaultRate) : '',
    method: 'Bank Transfer',
    reference: '',
  })
  const [saving, setSaving] = useState(false)

  const amount = parseFloat(form.amount) || 0
  const rate = parseFloat(form.rate) || 0
  const amountInr = form.currency === 'USD' ? Math.round(amount * rate * 100) / 100 : amount
  const overpay = amountInr - remaining > 0.01

  const save = async () => {
    if (amount <= 0) return
    if (form.currency === 'USD' && rate <= 0) return
    setSaving(true)
    const ok = await recordPayment(invoice, {
      date: form.date,
      amount,
      amount_inr: amountInr,
      payment_method: form.method,
      reference_number: form.reference || undefined,
      exchange_rate: form.currency === 'USD' ? rate : undefined,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment — {invoice.invoice_number}</DialogTitle>
          <DialogDescription>
            {invoice.customer_name} · balance {formatINR(remaining)}
            {isUsd && invoice.original_amount != null && ` ($ ${invoice.original_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })})`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pay-date">Date received</Label>
              <Input id="pay-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v as 'INR' | 'USD' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ INR</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pay-amount">Amount ({form.currency === 'USD' ? '$' : '₹'})</Label>
              <Input id="pay-amount" type="number" min="0" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            {form.currency === 'USD' && (
              <div className="grid gap-1.5">
                <Label htmlFor="pay-rate">Rate (₹ / $)</Label>
                <Input id="pay-rate" type="number" min="0" step="any" placeholder="e.g. 86.40" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
              </div>
            )}
          </div>
          {form.currency === 'USD' && rate > 0 && amount > 0 && (
            <p className="text-[13px] leading-5 text-[var(--k-label-secondary)]">
              = <span className="font-semibold text-[var(--f-emerald-700)]">{formatINR(amountInr)}</span> in the books
            </p>
          )}
          {overpay && (
            <p className="text-[13px] leading-5 text-[var(--f-gold-600)]">
              More than the remaining balance — invoice will be marked fully paid.
            </p>
          )}
          <div className="grid gap-1.5">
            <Label>Received via</Label>
            <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Bank Transfer', 'NEFT', 'SWIFT', 'UPI', 'Cash', 'Cheque'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pay-ref">Reference (UTR / sender)</Label>
            <Input id="pay-ref" placeholder="Optional" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save} loading={saving} disabled={amount <= 0 || (form.currency === 'USD' && rate <= 0)}>
            Save payment
          </KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InvoiceDetail({ invoice, isLocal, onDelete, onRecordPayment, onClose }: {
  invoice: InvoiceRow | null
  isLocal: boolean
  onDelete: (id: string) => void
  onRecordPayment: (inv: InvoiceRow) => void
  onClose: () => void
}) {
  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        {invoice && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                Invoice {invoice.invoice_number}
                <InvoiceStatusBadge inv={invoice} />
              </DialogTitle>
              <DialogDescription>
                {invoice.customer_name}
                {invoice.invoice_date && ` · ${new Date(invoice.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              </DialogDescription>
            </DialogHeader>

            {invoice.items && invoice.items.length > 0 ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-[0.5px] border-[var(--k-separator)]">
                    <th className="k-c1-em py-2 font-medium">Item</th>
                    <th className="k-c1-em py-2 text-right font-medium">Qty</th>
                    <th className="k-c1-em py-2 text-right font-medium">Rate</th>
                    <th className="k-c1-em py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
                  {invoice.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="k-b2 py-2.5">
                        {it.item}
                        {it.description && <span className="k-c1 block">{it.description}</span>}
                      </td>
                      <td className="k-b2-secondary py-2.5 text-right">{it.qty}</td>
                      <td className="k-b2-secondary py-2.5 text-right">{formatINR(it.rate)}</td>
                      <td className="k-b2-em py-2.5 text-right">{formatINR(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="k-b2-secondary py-2">No line items on record.</p>
            )}

            <div className="space-y-1.5 border-t-[0.5px] border-[var(--k-separator)] pt-3">
              <div className="flex justify-between text-[14px] leading-5">
                <span className="text-[var(--k-label-secondary)]">Total</span>
                <span className="font-medium text-[var(--k-label-primary)]">{formatINR(invoice.total_amount)}</span>
              </div>
              {invoice.original_currency === 'USD' && invoice.original_amount != null && (
                <div className="flex justify-between text-[14px] leading-5">
                  <span className="text-[var(--k-label-secondary)]">Original</span>
                  <span className="font-medium text-[var(--k-label-primary)]">
                    $ {invoice.original_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    {invoice.exchange_rate ? ` @ ₹${invoice.exchange_rate}` : ''}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[14px] leading-5">
                <span className="text-[var(--k-label-secondary)]">Received</span>
                <span className="font-medium text-[var(--f-emerald-600)]">{formatINR(invoice.paid_amount)}</span>
              </div>
              <div className="flex justify-between text-[14px] leading-5">
                <span className="text-[var(--k-label-secondary)]">Balance due</span>
                <span className="font-semibold text-[var(--f-gold-600)]">{formatINR(invoice.total_amount - invoice.paid_amount)}</span>
              </div>
            </div>

            {(invoice.total_amount - invoice.paid_amount > 0.005 || isLocal) && invoice.status !== 'cancelled' && (
              <div className="flex items-center justify-end gap-2 border-t-[0.5px] border-[var(--k-separator)] pt-3">
                {invoice.total_amount - invoice.paid_amount > 0.005 && (
                  <KimiButton
                    size={26}
                    leftIcon={<IndianRupee />}
                    onClick={() => { onRecordPayment(invoice); onClose() }}
                  >
                    Record payment
                  </KimiButton>
                )}
                {isLocal && (
                  <KimiButton
                    variant="outline"
                    danger
                    size={26}
                    leftIcon={<Trash2 />}
                    onClick={() => { onDelete(invoice.id); onClose() }}
                  >
                    Delete
                  </KimiButton>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Collapsible per-client invoice group inside a centre section. */
function ClientGroup({ client, invoices, onSelect, onToggleCentre }: {
  client: string
  invoices: InvoiceRow[]
  onSelect: (inv: InvoiceRow) => void
  onToggleCentre: (inv: InvoiceRow) => void
}) {
  const [open, setOpen] = useState(false)
  const total = invoices.reduce((s, i) => s + i.total_amount, 0)
  return (
    <div className="border-b-[0.5px] border-[var(--k-separator)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-150 hover:bg-[var(--k-fill-f1)]"
      >
        <ChevronRight className={cn('h-4 w-4 shrink-0 text-[var(--k-label-tertiary)] transition-transform duration-150', open && 'rotate-90')} aria-hidden />
        <span className="k-b2-em min-w-0 flex-1 truncate">{client}</span>
        <KimiBadge tone="neutral">{invoices.length} invoice{invoices.length === 1 ? '' : 's'}</KimiBadge>
        <span className="k-b2-em w-28 text-right">{formatINR(total)}</span>
      </button>
      {open && (
        <table className="w-full text-left">
          <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
            {invoices.map((inv) => {
              const balance = inv.total_amount - inv.paid_amount
              return (
                <tr
                  key={inv.id}
                  onClick={() => onSelect(inv)}
                  className="cursor-pointer transition-colors duration-150 hover:bg-[var(--f-emerald-50)]"
                >
                  <td className="k-b2-em whitespace-nowrap py-2.5 pl-12 pr-3">{inv.invoice_number}</td>
                  <td className="k-b2-secondary hidden whitespace-nowrap px-3 py-2.5 md:table-cell">
                    {new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="k-b2 whitespace-nowrap px-3 py-2.5 text-right">
                    {formatINR(inv.total_amount)}
                    {inv.original_currency === 'USD' && <span className="k-c1 block">USD</span>}
                  </td>
                  <td className={cn('k-b2-em whitespace-nowrap px-3 py-2.5 text-right', balance > 0 ? 'text-[var(--f-gold-600)]' : 'text-[var(--k-label-tertiary)]')}>
                    {balance > 0 ? formatINR(balance) : '—'}
                  </td>
                  <td className="px-3 py-2.5"><InvoiceStatusBadge inv={inv} /></td>
                  <td className="py-2.5 pl-3 pr-5">
                    <button
                      type="button"
                      title={`Move to ${centreOf(inv, [], {}) === 'cochin' ? 'Calicut' : 'Cochin'}`}
                      onClick={(e) => { e.stopPropagation(); onToggleCentre(inv) }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--k-label-tertiary)] transition-colors hover:bg-[var(--k-fill-f2)] hover:text-[var(--f-emerald-700)]"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

const CENTRES: LocationType[] = ['calicut', 'cochin']

export default function Invoices() {
  const { data, loading, invoiceCentres, setInvoiceCentre, localInvoiceIds, removeInvoice } = useAccount()
  const [selected, setSelected] = useState<InvoiceRow | null>(null)
  const [payFor, setPayFor] = useState<InvoiceRow | null>(null)

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  const invoices = [...data.invoices].sort((a, b) => b.invoice_date.localeCompare(a.invoice_date))
  const totals = invoices.reduce(
    (acc, i) => { acc.billed += i.total_amount; acc.collected += i.paid_amount; return acc },
    { billed: 0, collected: 0 }
  )

  const byCentre = new Map<LocationType, Map<string, InvoiceRow[]>>()
  for (const loc of CENTRES) byCentre.set(loc, new Map())
  for (const inv of invoices) {
    const loc = centreOf(inv, data.customers, invoiceCentres)
    const groups = byCentre.get(loc)!
    const key = inv.customer_name || 'Unknown'
    groups.set(key, [...(groups.get(key) ?? []), inv])
  }

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Billing register by centre and client, plus the invoice generator"
        actions={
          <CreateButton onClick={() => document.getElementById('invoice-generator')?.scrollIntoView({ behavior: 'smooth' })}>
            New invoice
          </CreateButton>
        }
      />
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="k-card p-5">
            <p className="k-b2-secondary">Total billed</p>
            <p className="mt-1 text-[20px] font-semibold leading-[30px] text-[var(--k-label-primary)]">{formatINR(totals.billed)}</p>
          </div>
          <div className="k-card p-5">
            <p className="k-b2-secondary">Collected</p>
            <p className="mt-1 text-[20px] font-semibold leading-[30px] text-[var(--f-emerald-700)]">{formatINR(totals.collected)}</p>
          </div>
          <div className="k-card p-5">
            <p className="k-b2-secondary">Outstanding</p>
            <p className="mt-1 text-[20px] font-semibold leading-[30px] text-[var(--f-gold-600)]">{formatINR(data.outstandingTotal)}</p>
          </div>
        </div>

        {/* Invoice Generator */}
        <section id="invoice-generator" className="scroll-mt-24">
          <div className="mb-4 flex items-center gap-2">
            <FilePlus2 className="h-5 w-5 text-[var(--f-emerald-600)]" aria-hidden />
            <h2 className="k-t2-em">Invoice Generator</h2>
          </div>
          <InvoiceGenerator />
        </section>

        {/* Register by centre → client */}
        {CENTRES.map((loc) => {
          const groups = byCentre.get(loc)!
          const count = [...groups.values()].reduce((s, list) => s + list.length, 0)
          const billed = [...groups.values()].flat().reduce((s, i) => s + i.total_amount, 0)
          const sortedClients = [...groups.entries()].sort(
            (a, b) => b[1].reduce((s, i) => s + i.total_amount, 0) - a[1].reduce((s, i) => s + i.total_amount, 0)
          )
          return (
            <KimiCard
              key={loc}
              pad={false}
              title={
                <span className="flex items-center gap-2.5">
                  {centreLabel(loc)}
                  <KimiBadge tone="neutral">{count} invoice{count === 1 ? '' : 's'}</KimiBadge>
                  <span className="text-[13px] font-medium text-[var(--f-emerald-700)]">{formatINR(billed)}</span>
                </span>
              }
            >
              {count === 0 ? (
                <p className="k-b2-secondary px-5 py-8 text-center">No invoices under {centreLabel(loc)} yet.</p>
              ) : (
                <div className="pt-1">
                  {sortedClients.map(([client, list]) => (
                    <ClientGroup
                      key={client}
                      client={client}
                      invoices={list}
                      onSelect={setSelected}
                      onToggleCentre={(inv) =>
                        setInvoiceCentre(inv.id, centreOf(inv, data.customers, invoiceCentres) === 'cochin' ? 'calicut' : 'cochin')
                      }
                    />
                  ))}
                </div>
              )}
            </KimiCard>
          )
        })}
      </div>

      <InvoiceDetail
        invoice={selected}
        isLocal={!!selected && localInvoiceIds.has(selected.id)}
        onDelete={removeInvoice}
        onRecordPayment={setPayFor}
        onClose={() => setSelected(null)}
      />
      {payFor && <RecordPaymentDialog key={payFor.id} invoice={payFor} onClose={() => setPayFor(null)} />}
    </>
  )
}
