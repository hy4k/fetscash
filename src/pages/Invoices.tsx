import { useState } from 'react'
import { ArrowLeftRight, ChevronRight, IndianRupee } from 'lucide-react'
import { useAccount } from '@/lib/AccountContext'
import { PageSkeleton } from '@/components/kimi/PageHeader'
import { KimiButton } from '@/components/kimi/Button'
import { PageHero, StatStrip, Pill, Kicker, StatusText, M } from '@/components/ledger'
import { EditInvoiceDialog, RowActions } from '@/components/edit/EditDialogs'
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
              = <span className="font-semibold text-[var(--f-green)]">{formatINR(amountInr)}</span> in the books
            </p>
          )}
          {overpay && (
            <p className="text-[13px] leading-5 text-[var(--f-gold-dark)]">
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

function InvoiceDetail({ invoice, onEdit, onDelete, onRecordPayment, onClose }: {
  invoice: InvoiceRow | null
  onEdit: (inv: InvoiceRow) => void
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
                  <tr className="border-b border-[var(--f-hairline)]">
                    <th className="f-kicker py-2 font-medium">Item</th>
                    <th className="f-kicker py-2 text-right font-medium">Qty</th>
                    <th className="f-kicker py-2 text-right font-medium">Rate</th>
                    <th className="f-kicker py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(17,23,19,0.09)]">
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

            <div className="space-y-1.5 border-t border-[var(--f-hairline)] pt-3">
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
                <span className="font-medium text-[var(--f-green)]">{formatINR(invoice.paid_amount)}</span>
              </div>
              <div className="flex justify-between text-[14px] leading-5">
                <span className="text-[var(--k-label-secondary)]">Balance due</span>
                <span className="font-semibold text-[var(--f-gold-dark)]">{formatINR(invoice.total_amount - invoice.paid_amount)}</span>
              </div>
            </div>

            {invoice.status !== 'cancelled' && (
              <div className="flex items-center justify-between gap-2 border-t border-[var(--f-hairline)] pt-3">
                <RowActions
                  onEdit={() => { onEdit(invoice); onClose() }}
                  onDelete={() => { onDelete(invoice.id); onClose() }}
                  deleteTitle={`Delete invoice ${invoice.invoice_number}?`}
                  deleteDescription="Payments already recorded against it will remain as unmatched receipts."
                />
                {invoice.total_amount - invoice.paid_amount > 0.005 && (
                  <KimiButton
                    size={26}
                    leftIcon={<IndianRupee />}
                    onClick={() => { onRecordPayment(invoice); onClose() }}
                  >
                    Record payment
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
    <div className="border-b border-[var(--f-hairline-soft)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-[rgba(17,23,19,0.03)]"
      >
        <ChevronRight className={cn('h-4 w-4 shrink-0 text-[var(--k-label-tertiary)] transition-transform duration-150', open && 'rotate-90')} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[16px] font-medium">{client}</span>
        <M className="text-[11px] tracking-[0.10em] text-[var(--k-label-tertiary)]">{invoices.length} INV</M>
        <M className="w-32 text-right text-[15px]">{formatINR(total)}</M>
      </button>
      {open && (
        <div className="mb-2">
          {invoices.map((inv) => {
            const balance = inv.total_amount - inv.paid_amount
            const overdue = inv.status === 'overdue'
            return (
              <div
                key={inv.id}
                onClick={() => onSelect(inv)}
                className="grid cursor-pointer grid-cols-[minmax(0,1.1fr)_auto_auto] items-center gap-x-5 border-t border-[var(--f-hairline-soft)] py-3 pl-9 transition-colors hover:bg-[rgba(11,92,67,0.04)] sm:grid-cols-[minmax(0,1fr)_90px_110px_110px_90px_36px]"
              >
                <M className="truncate text-[13px] font-medium">{inv.invoice_number}</M>
                <M className="hidden text-[12px] text-[var(--k-label-secondary)] sm:block">
                  {new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()}
                </M>
                <M className="hidden text-right text-[13px] sm:block">
                  {formatINR(inv.total_amount)}
                  {inv.original_currency === 'USD' && <span className="block text-[10px] text-[var(--k-label-tertiary)]">USD</span>}
                </M>
                <M className={cn('text-right text-[13px]', balance > 0 ? 'text-[var(--f-gold-dark)]' : 'text-[var(--k-label-quaternary)]')}>
                  {balance > 0 ? formatINR(balance) : '—'}
                </M>
                <span className="text-right">
                  <StatusText tone={inv.status === 'paid' ? 'green' : overdue ? 'red' : inv.status === 'partially_paid' ? 'gold' : 'muted'}>
                    {inv.status === 'partially_paid' ? 'PARTIAL' : inv.status.toUpperCase()}
                  </StatusText>
                </span>
                <button
                  type="button"
                  title={`Move to ${centreOf(inv, [], {}) === 'cochin' ? 'Calicut' : 'Cochin'}`}
                  onClick={(e) => { e.stopPropagation(); onToggleCentre(inv) }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--k-label-tertiary)] transition-colors hover:bg-[var(--k-fill-f2)] hover:text-[var(--f-green)]"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const CENTRES: LocationType[] = ['calicut', 'cochin']

export default function Invoices() {
  const { data, loading, invoiceCentres, setInvoiceCentre, removeInvoice } = useAccount()
  const [selected, setSelected] = useState<InvoiceRow | null>(null)
  const [payFor, setPayFor] = useState<InvoiceRow | null>(null)
  const [editing, setEditing] = useState<InvoiceRow | null>(null)
  const [collapsed, setCollapsed] = useState<Partial<Record<LocationType, boolean>>>({})

  if (loading && !data) return <PageSkeleton />
  if (!data) return null

  const invoices = [...data.invoices].sort((a, b) => b.invoice_date.localeCompare(a.invoice_date))
  const totals = invoices.reduce(
    (acc, i) => { acc.billed += i.total_amount; acc.collected += i.paid_amount; return acc },
    { billed: 0, collected: 0 }
  )
  const overdueTotal = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((s, i) => s + (i.total_amount - i.paid_amount), 0)

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
      <PageHero
        index="02"
        section="MINT"
        title="Invoices"
        lede={`${data.outstandingCount} invoices are open across ${data.customers.length} clients — ${formatINR(data.outstandingTotal)} still to come in.`}
        actions={
          <Pill onClick={() => document.getElementById('invoice-generator')?.scrollIntoView({ behavior: 'smooth' })}>
            Raise an invoice
          </Pill>
        }
      />

      <StatStrip
        stats={[
          { label: 'OUTSTANDING', value: formatINR(data.outstandingTotal), tone: 'gold' },
          { label: 'OVERDUE', value: formatINR(overdueTotal), tone: overdueTotal > 0 ? 'red' : 'ink' },
          { label: 'COLLECTED', value: formatINR(totals.collected), tone: 'green' },
          { label: 'TOTAL BILLED', value: formatINR(totals.billed), sub: `${invoices.length} INVOICES` },
        ]}
      />

      {/* Invoice Generator */}
      <section id="invoice-generator" className="scroll-mt-24 pt-12">
        <Kicker green className="mb-4">INVOICE GENERATOR</Kicker>
        <InvoiceGenerator />
      </section>

      {/* Register by centre → client */}
      <div className="pt-14">
        {CENTRES.map((loc) => {
          const groups = byCentre.get(loc)!
          const count = [...groups.values()].reduce((s, list) => s + list.length, 0)
          const billed = [...groups.values()].flat().reduce((s, i) => s + i.total_amount, 0)
          const sortedClients = [...groups.entries()].sort(
            (a, b) => b[1].reduce((s, i) => s + i.total_amount, 0) - a[1].reduce((s, i) => s + i.total_amount, 0)
          )
          return (
            <section key={loc} className="mb-12">
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [loc]: !c[loc] }))}
                className="flex w-full flex-wrap items-baseline gap-x-5 gap-y-1 border-b border-[var(--f-hairline)] pb-4 text-left"
              >
                <ChevronRight
                  className={cn('h-4 w-4 self-center text-[var(--k-label-tertiary)] transition-transform duration-150', !collapsed[loc] && 'rotate-90')}
                  aria-hidden
                />
                <span className="text-[clamp(24px,2.6vw,34px)] font-medium tracking-[-0.02em]">{centreLabel(loc)}</span>
                <M className="text-[12px] tracking-[0.10em] text-[var(--k-label-tertiary)]">{count} INVOICES</M>
                <span className="flex-1" />
                <M className="text-[15px] text-[var(--f-green)]">{formatINR(billed)}</M>
              </button>
              {collapsed[loc] ? null : count === 0 ? (
                <p className="k-b2-secondary py-8 text-center">No invoices under {centreLabel(loc)} yet.</p>
              ) : (
                <div>
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
            </section>
          )
        })}
      </div>

      <InvoiceDetail
        invoice={selected}
        onEdit={setEditing}
        onDelete={removeInvoice}
        onRecordPayment={setPayFor}
        onClose={() => setSelected(null)}
      />
      {payFor && <RecordPaymentDialog key={payFor.id} invoice={payFor} onClose={() => setPayFor(null)} />}
      {editing && <EditInvoiceDialog invoice={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
