import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Kicker, M, Pill } from '@/components/ledger'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAccount } from '@/lib/AccountContext'
import { useSettings } from '@/lib/settings'
import { amountInWords } from '@/lib/words'
import type { InvoiceRow, LocationType } from '@/types'

const BLUE = '#4472C4'
const FONT = "'Calibri', 'Carlito', 'Segoe UI', Arial, sans-serif"

interface GenItem { name: string; qty: string; rate: string; tax: string }

interface Draft {
  clientKey: string // customer name or '__new__'
  newClientName: string
  newClientAddress: string
  invoiceNo: string
  date: string
  currency: 'INR' | 'USD'
  inrEquivalent: string
  centre: LocationType
  items: GenItem[]
}

const today = () => new Date().toISOString().slice(0, 10)

function suggestNumber(clientName: string, existing: InvoiceRow[]): string {
  const pfx = (clientName.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'INV').toUpperCase()
  let max = 0
  const re = new RegExp(`^${pfx}-(\\d+)$`, 'i')
  for (const i of existing) {
    const m = i.invoice_number.match(re)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${pfx}-${String(max + 1).padStart(2, '0')}`
}

function fmtMoney(n: number, currency: 'INR' | 'USD') {
  if (currency === 'USD')
    return `$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/** Exact replica of the FETS invoice template (sample: INVOICE PRM-02). */
export function InvoicePreview({ draft, clientAddress }: { draft: Draft; clientAddress: string }) {
  const [settings] = useSettings()
  const clientName = draft.clientKey === '__new__' ? draft.newClientName : draft.clientKey
  const address = draft.clientKey === '__new__' ? draft.newClientAddress : clientAddress
  const items = draft.items.filter((it) => it.name.trim())
  const computed = items.map((it) => {
    const amount = num(it.qty) * num(it.rate)
    return { ...it, amount, taxAmt: (amount * num(it.tax)) / 100 }
  })
  const sub = computed.reduce((s, it) => s + it.amount, 0)
  const taxTotal = computed.reduce((s, it) => s + it.taxAmt, 0)
  const grand = sub + taxTotal
  const cur = draft.currency
  const dateStr = draft.date
    ? new Date(draft.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    : ''

  return (
    <div
      id="invoice-print-area"
      className="mx-auto w-full max-w-[720px] bg-white text-black shadow-[0_2px_18px_rgba(0,0,0,0.12)]"
      style={{ fontFamily: FONT, fontSize: 12, lineHeight: 1.45 }}
    >
      <div className="px-10 pb-10 pt-8">
        {/* Letterhead */}
        <div className="flex items-start gap-6">
          <img src="/assets/fets-logo.png" alt={settings.businessName} className="w-[190px] shrink-0" />
          <div className="border-l border-gray-200 pl-6 pt-1">
            <p className="text-[16px] font-bold">{settings.businessName}</p>
            <p className="mt-0.5 text-[11px] text-gray-700">{settings.businessAddress}</p>
            {settings.businessPhone && <p className="text-[11px] text-gray-700">{settings.businessPhone}</p>}
            {settings.businessWebsite && <p className="text-[11px] text-gray-700">{settings.businessWebsite}</p>}
            {settings.gstin && <p className="text-[11px] text-gray-700">GSTIN : {settings.gstin}</p>}
          </div>
        </div>

        {/* Title */}
        <div className="mt-4 border-t" style={{ borderColor: BLUE }} />
        <p className="py-1 text-center text-[20px]" style={{ color: BLUE }}>INVOICE</p>
        <div className="border-t" style={{ borderColor: BLUE }} />

        {/* Bill To + number/date */}
        <div className="mt-4 flex items-start justify-between">
          <div>
            <p className="text-[12px] font-bold">Bill To</p>
            <p className="mt-1 text-[12px] font-bold uppercase">{clientName || '—'}</p>
            {address.split('\n').filter(Boolean).map((line, i) => (
              <p key={i} className="text-[11px] uppercase leading-[1.35] text-gray-800">{line}</p>
            ))}
          </div>
          <div className="text-right">
            <p className="text-[12px] font-bold">{draft.invoiceNo || '—'}</p>
            <p className="mt-1 text-[11px]">{dateStr}</p>
          </div>
        </div>

        {/* Items */}
        <table className="mt-5 w-full border-collapse">
          <thead>
            <tr style={{ background: BLUE }} className="text-white">
              <th className="w-[8%] px-2 py-1.5 text-center text-[11px] font-bold">Sr No.</th>
              <th className="px-3 py-1.5 text-left text-[11px] font-bold">Product</th>
              <th className="w-[15%] px-2 py-1.5 text-center text-[11px] font-bold">Quantity</th>
              <th className="w-[17%] px-3 py-1.5 text-right text-[11px] font-bold">Rate</th>
              <th className="w-[17%] px-3 py-1.5 text-right text-[11px] font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {computed.map((it, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-2 py-1.5 text-center text-[11px]">{i + 1}</td>
                <td className="px-3 py-1.5 text-[11px]">
                  {it.name}
                  {num(it.tax) > 0 && <span className="block text-[10px] text-gray-500">+ IGST {num(it.tax)}%</span>}
                </td>
                <td className="px-2 py-1.5 text-center text-[11px]">{num(it.qty).toFixed(2)}</td>
                <td className="px-3 py-1.5 text-right text-[11px]">{fmtMoney(num(it.rate), cur)}</td>
                <td className="px-3 py-1.5 text-right text-[11px]">{fmtMoney(it.amount, cur)}</td>
              </tr>
            ))}
            {computed.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-[11px] text-gray-400">Add items to build the invoice</td></tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex">
          <div className="w-[55%] border-r border-gray-200 py-2 pr-4">
            <p className="text-[11px] font-bold">Please Note</p>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-[11px] font-bold">SubTotal</span>
              <span className="text-[11px] font-bold">{fmtMoney(sub, cur)}</span>
            </div>
            {taxTotal > 0 && (
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-[11px]">Tax (IGST)</span>
                <span className="text-[11px]">{fmtMoney(taxTotal, cur)}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-3 py-1.5 text-white" style={{ background: BLUE }}>
              <span className="text-[11px] font-bold">Grand Total</span>
              <span className="text-[11px] font-bold">{fmtMoney(grand, cur)}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-[11px]">Balance</span>
              <span className="text-[11px]">{fmtMoney(grand, cur)}</span>
            </div>
          </div>
        </div>

        {/* Amount in words */}
        <p className="mt-4 text-[11px]">
          <span className="font-bold">Amount In Words : </span>
          {grand > 0 ? amountInWords(grand, cur) : '—'}
        </p>

        {/* Signature */}
        <div className="mt-2 flex justify-end">
          <div className="text-center">
            <img src="/assets/fets-stamp.png" alt="Forun Managing Partner stamp" className="h-[86px] w-[86px] object-contain" />
            <p className="mt-1 text-[12px] font-bold">Signature</p>
          </div>
        </div>

        {/* Banking */}
        <div className="mt-4">
          <p className="text-[12px] font-bold">Banking Details</p>
          <p className="mt-1 text-[11px]">BANK: {settings.bankName}</p>
          <p className="text-[11px]">A/C NO: {settings.bankAccount}</p>
          <p className="text-[11px]">BRANCH: {settings.bankBranch}</p>
          <p className="text-[11px]">IFSC : {settings.bankIfsc}</p>
        </div>
      </div>
    </div>
  )
}

export default function InvoiceGenerator() {
  const { data, addInvoice, addCustomer } = useAccount()
  const [settings] = useSettings()
  const customers = data?.customers ?? []
  const products = data?.products ?? []
  const allInvoices = data?.invoices ?? []

  const [draft, setDraft] = useState<Draft>({
    clientKey: '',
    newClientName: '',
    newClientAddress: '',
    invoiceNo: '',
    date: today(),
    currency: settings.defaultCurrency,
    inrEquivalent: '',
    centre: settings.defaultCentre,
    items: [{ name: '', qty: '1', rate: '', tax: settings.defaultTaxRate }],
  })

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const pickClient = (name: string) => {
    set({ clientKey: name, invoiceNo: name === '__new__' ? draft.invoiceNo : suggestNumber(name, allInvoices) })
  }

  const setItem = (idx: number, patch: Partial<GenItem>) =>
    set({ items: draft.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) })

  const pickProduct = (idx: number, name: string) => {
    const prod = products.find((p) => p.name === name)
    setItem(idx, {
      name,
      rate: prod ? String(prod.sale_rate) : draft.items[idx].rate,
      tax: prod?.tax_list?.match(/IGST : (\d+)%/)?.[1] ?? draft.items[idx].tax,
    })
  }

  const clientName = draft.clientKey === '__new__' ? draft.newClientName : draft.clientKey
  const selectedCustomer = customers.find((c) => c.name === draft.clientKey)

  const sub = draft.items.reduce((s, it) => s + num(it.qty) * num(it.rate), 0)
  const taxTotal = draft.items.reduce((s, it) => s + (num(it.qty) * num(it.rate) * num(it.tax)) / 100, 0)
  const grand = sub + taxTotal

  const validItems = draft.items.filter((it) => it.name.trim() && num(it.qty) > 0 && num(it.rate) > 0)

  const save = () => {
    if (!clientName.trim()) { toast.error('Choose or enter a client'); return }
    if (!draft.invoiceNo.trim()) { toast.error('Invoice number is required'); return }
    if (allInvoices.some((i) => i.invoice_number.toLowerCase() === draft.invoiceNo.trim().toLowerCase())) {
      toast.error(`Invoice ${draft.invoiceNo} already exists — pick another number`); return
    }
    if (validItems.length === 0) { toast.error('Add at least one item with qty and rate'); return }

    if (draft.clientKey === '__new__') {
      addCustomer({ name: draft.newClientName.trim(), address: draft.newClientAddress || undefined })
    }
    const inrEq = draft.currency === 'USD' ? num(draft.inrEquivalent) : grand
    addInvoice({
      invoice_number: draft.invoiceNo.trim(),
      customer_name: clientName.trim(),
      invoice_date: draft.date,
      currency: draft.currency,
      total_amount: draft.currency === 'USD' ? (inrEq || grand) : grand,
      original_amount: grand,
      original_currency: draft.currency,
      exchange_rate: draft.currency === 'USD' && inrEq ? Math.round((inrEq / grand) * 100) / 100 : undefined,
      paid_amount: 0,
      status: 'sent',
      location: draft.centre,
      items: validItems.map((it) => ({
        invoice_number: draft.invoiceNo.trim(),
        item: it.name.trim(),
        qty: num(it.qty),
        rate: num(it.rate),
        amount: num(it.qty) * num(it.rate),
        description: num(it.tax) > 0 ? `+ IGST ${num(it.tax)}%` : undefined,
      })),
    })
    toast.success(`Invoice ${draft.invoiceNo} saved to the register`, {
      description: `${clientName} · ${fmtMoney(grand, draft.currency)}`,
    })
    set({
      clientKey: '', newClientName: '', newClientAddress: '', invoiceNo: '',
      inrEquivalent: '', items: [{ name: '', qty: '1', rate: '', tax: '0' }],
    })
  }

  const formFields = useMemo(() => (
    <div className="grid gap-4">
      {/* Client */}
      <div className="grid gap-1.5">
        <Label>Client</Label>
        <Select value={draft.clientKey} onValueChange={pickClient}>
          <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
          <SelectContent>
            {customers.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            <SelectItem value="__new__">+ New client…</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {draft.clientKey === '__new__' && (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="nc-name">New client name *</Label>
            <Input id="nc-name" value={draft.newClientName} onChange={(e) => set({ newClientName: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nc-addr">Billing address</Label>
            <Textarea id="nc-addr" rows={2} value={draft.newClientAddress} onChange={(e) => set({ newClientAddress: e.target.value })} />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="inv-no">Invoice number</Label>
          <Input id="inv-no" value={draft.invoiceNo} onChange={(e) => set({ invoiceNo: e.target.value })} placeholder="PRM-03" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="inv-date">Invoice date</Label>
          <Input id="inv-date" type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>Currency</Label>
          <Select value={draft.currency} onValueChange={(v) => set({ currency: v as 'INR' | 'USD' })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">₹ Rupees (INR)</SelectItem>
              <SelectItem value="USD">$ Dollars (USD)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Centre</Label>
          <Select value={draft.centre} onValueChange={(v) => set({ centre: v as LocationType })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="calicut">Calicut</SelectItem>
              <SelectItem value="cochin">Cochin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {draft.currency === 'USD' && (
        <div className="grid gap-1.5">
          <Label htmlFor="inv-inr">INR equivalent (optional — used for the books)</Label>
          <Input id="inv-inr" type="number" min="0" placeholder="e.g. 213700" value={draft.inrEquivalent} onChange={(e) => set({ inrEquivalent: e.target.value })} />
        </div>
      )}

      {/* Items */}
      <div className="grid gap-2">
        <Label>Items</Label>
        <datalist id="gen-products">
          {products.map((p) => <option key={p.id} value={p.name} />)}
        </datalist>
        <div className="f-kicker grid grid-cols-[1fr_64px_90px_64px_90px_28px] gap-2">
          <span>PRODUCT</span><span>QTY</span><span>RATE</span><span>TAX %</span><span className="text-right">AMOUNT</span><span />
        </div>
        {draft.items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_64px_90px_64px_90px_28px] items-center gap-2">
            <Input
              list="gen-products"
              placeholder="Item name"
              value={it.name}
              onChange={(e) => pickProduct(idx, e.target.value)}
            />
            <Input type="number" min="0" step="any" value={it.qty} onChange={(e) => setItem(idx, { qty: e.target.value })} />
            <Input type="number" min="0" step="any" value={it.rate} onChange={(e) => setItem(idx, { rate: e.target.value })} />
            <Input type="number" min="0" step="any" value={it.tax} onChange={(e) => setItem(idx, { tax: e.target.value })} />
            <span className="text-right text-[13px] font-medium text-[var(--k-label-primary)]">
              {(num(it.qty) * num(it.rate)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            <button
              type="button"
              aria-label="Remove item"
              onClick={() => set({ items: draft.items.filter((_, i) => i !== idx) })}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--k-label-tertiary)] hover:bg-[var(--k-fill-f1)] hover:text-[var(--k-danger)]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Pill
          small
          outline
          onClick={() => set({ items: [...draft.items, { name: '', qty: '1', rate: '', tax: '0' }] })}
        >
          + Add item
        </Pill>
      </div>

      {/* Totals */}
      <div className="space-y-1.5 border-t border-[var(--f-hairline)] pt-3">
        <div className="flex items-baseline justify-between">
          <span className="f-kicker">SUBTOTAL</span>
          <M className="text-[13px]">{fmtMoney(sub, draft.currency)}</M>
        </div>
        {taxTotal > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="f-kicker">TAX</span>
            <M className="text-[13px]">{fmtMoney(taxTotal, draft.currency)}</M>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-[var(--f-hairline)] pt-2">
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Grand Total</span>
          <M className="text-[15px] font-semibold text-[var(--f-green)]">{fmtMoney(grand, draft.currency)}</M>
        </div>
      </div>

      <div className="flex items-center gap-2.5 pt-1">
        <Pill onClick={save}>Save invoice</Pill>
        <Pill outline onClick={() => window.print()}>Print / PDF</Pill>
      </div>
    </div>
  ), [draft, customers, products, allInvoices, sub, taxTotal, grand, validItems, clientName]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
      <div className="k-card self-start p-6">
        <Kicker className="border-b border-[var(--f-hairline)] pb-4">NEW INVOICE</Kicker>
        <div className="pt-5">{formFields}</div>
      </div>
      <div className="overflow-x-auto">
        <InvoicePreview draft={draft} clientAddress={selectedCustomer?.address ?? ''} />
      </div>
    </div>
  )
}
