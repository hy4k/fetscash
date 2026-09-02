import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { KimiButton } from '@/components/kimi/Button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import type { CashTxnRow, CustomerFull, ExpenseRow, InvoiceRow, PaymentRow, ProductRow } from '@/types'

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'NEFT', 'SWIFT', 'Cheque']
const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

const iconBtn =
  'flex h-7 w-7 items-center justify-center rounded-lg text-[var(--k-label-tertiary)] transition-colors hover:bg-[var(--k-fill-f2)]'

/** Pencil + trash icon pair with a confirm dialog on delete. */
export function RowActions({ onEdit, onDelete, deleteTitle, deleteDescription, stopPropagation }: {
  onEdit: () => void
  onDelete: () => void
  deleteTitle: string
  deleteDescription?: string
  stopPropagation?: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        title="Edit"
        onClick={(e) => { if (stopPropagation) e.stopPropagation(); onEdit() }}
        className={`${iconBtn} hover:text-[var(--f-emerald-700)]`}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        title="Delete"
        onClick={(e) => { if (stopPropagation) e.stopPropagation(); setConfirming(true) }}
        className={`${iconBtn} hover:text-[var(--k-danger)]`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription ?? 'This cannot be undone.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--k-danger)] text-white hover:bg-[var(--k-danger)]/90"
              onClick={() => { onDelete(); setConfirming(false) }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </span>
  )
}

export function EditClientDialog({ client, onClose }: { client: CustomerFull; onClose: () => void }) {
  const { updateCustomer } = useAccount()
  const [form, setForm] = useState({
    name: client.name,
    contact_person: client.contact_person ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    tax_id: client.tax_id ?? '',
    address: client.address ?? '',
  })
  const save = () => {
    if (!form.name.trim()) { toast.error('Client name is required'); return }
    updateCustomer(client.id, {
      name: form.name.trim(),
      contact_person: form.contact_person || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      tax_id: form.tax_id || undefined,
      address: form.address || undefined,
    })
    toast.success(`Client "${form.name.trim()}" updated`)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit client</DialogTitle>
          <DialogDescription>Changes apply everywhere the client appears.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ec-name">Organization name *</Label>
            <Input id="ec-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ec-contact">Contact person</Label>
              <Input id="ec-contact" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ec-tax">GSTIN / Tax ID</Label>
              <Input id="ec-tax" value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ec-email">Email</Label>
              <Input id="ec-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ec-phone">Phone</Label>
              <Input id="ec-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ec-addr">Billing address</Label>
            <Textarea id="ec-addr" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save changes</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EditProductDialog({ product, onClose }: { product: ProductRow; onClose: () => void }) {
  const { updateProduct } = useAccount()
  const igstNow = product.tax_list?.match(/IGST : (\d+)%/)?.[1] ?? '0'
  const [form, setForm] = useState({
    name: product.name,
    hsn: product.hsn ?? '',
    sale_rate: String(product.sale_rate),
    buy_rate: String(product.buy_rate ?? 0),
    igst: igstNow,
    description: product.description ?? '',
  })
  const save = () => {
    const rate = num(form.sale_rate)
    if (!form.name.trim()) { toast.error('Item name is required'); return }
    if (rate == null || rate < 0) { toast.error('Enter a valid sale rate'); return }
    const igst = parseFloat(form.igst) || 0
    updateProduct(product.id, {
      name: form.name.trim(),
      hsn: form.hsn || undefined,
      sale_rate: rate,
      buy_rate: parseFloat(form.buy_rate) || 0,
      description: form.description || undefined,
      tax_list: igst > 0 ? `[ IGST : ${igst}%, SGST : 0%, CGST : 0% ]` : undefined,
    })
    toast.success(`Item "${form.name.trim()}" updated`)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit product / service</DialogTitle>
          <DialogDescription>New invoices will use the updated rate and tax.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ep-name">Item name *</Label>
            <Input id="ep-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ep-rate">Sale rate (₹) *</Label>
              <Input id="ep-rate" type="number" min="0" value={form.sale_rate} onChange={(e) => setForm({ ...form, sale_rate: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ep-buy">Buy rate (₹)</Label>
              <Input id="ep-buy" type="number" min="0" value={form.buy_rate} onChange={(e) => setForm({ ...form, buy_rate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ep-hsn">HSN / SAC</Label>
              <Input id="ep-hsn" value={form.hsn} onChange={(e) => setForm({ ...form, hsn: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Tax (IGST %)</Label>
              <Select value={form.igst} onValueChange={(v) => setForm({ ...form, igst: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['0', '5', '12', '18', '28'].map((r) => <SelectItem key={r} value={r}>{r === '0' ? 'No tax' : `${r}%`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ep-desc">Description</Label>
            <Input id="ep-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save changes</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EditExpenseDialog({ expense, onClose }: { expense: ExpenseRow; onClose: () => void }) {
  const { updateExpense } = useAccount()
  const [settings] = useSettings()
  const categories = settings.categories.includes(expense.category)
    ? settings.categories
    : [...settings.categories, expense.category]
  const [form, setForm] = useState({
    date: expense.date,
    amount: String(expense.amount),
    category: expense.category || 'Misc',
    location: expense.location ?? 'none',
    payment_mode: expense.payment_mode && PAYMENT_MODES.includes(expense.payment_mode) ? expense.payment_mode : 'Bank Transfer',
    description: expense.description ?? '',
  })
  const save = () => {
    const amount = num(form.amount)
    if (amount == null || amount <= 0) { toast.error('Enter a valid amount'); return }
    updateExpense(expense.id, {
      date: form.date,
      amount,
      category: form.category,
      payment_mode: form.payment_mode,
      location: form.location === 'none' ? undefined : (form.location as 'calicut' | 'cochin'),
      description: form.description || form.category,
    })
    toast.success('Expense updated')
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit expense</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ee-date">Date</Label>
              <Input id="ee-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ee-amount">Amount (₹)</Label>
              <Input id="ee-amount" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Centre</Label>
              <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Company-wide</SelectItem>
                  <SelectItem value="calicut">Calicut</SelectItem>
                  <SelectItem value="cochin">Cochin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Payment mode</Label>
            <Select value={form.payment_mode} onValueChange={(v) => setForm({ ...form, payment_mode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ee-desc">Description</Label>
            <Input id="ee-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save changes</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EditPaymentDialog({ payment, onClose }: { payment: PaymentRow; onClose: () => void }) {
  const { updatePayment } = useAccount()
  const [form, setForm] = useState({
    payment_date: payment.payment_date,
    amount: String(payment.amount_inr || payment.amount),
    payment_method: payment.payment_method && PAYMENT_MODES.includes(payment.payment_method) ? payment.payment_method : 'Bank Transfer',
    reference_number: payment.reference_number ?? '',
  })
  const save = () => {
    const amount = num(form.amount)
    if (amount == null || amount <= 0) { toast.error('Enter a valid amount'); return }
    updatePayment(payment.id, {
      payment_date: form.payment_date,
      amount,
      amount_inr: amount,
      payment_method: form.payment_method,
      reference_number: form.reference_number || undefined,
    })
    toast.success('Receipt updated')
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit receipt</DialogTitle>
          {payment.invoice_id && (
            <DialogDescription>
              Linked to invoice {payment.invoice_id} — changing the amount here does not change the invoice's received total.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="epay-date">Date</Label>
              <Input id="epay-date" type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="epay-amount">Amount (₹)</Label>
              <Input id="epay-amount" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Received via</Label>
            <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="epay-ref">Reference / from</Label>
            <Input id="epay-ref" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save changes</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EditCashDialog({ txn, onClose }: { txn: CashTxnRow; onClose: () => void }) {
  const { updateCashTxn } = useAccount()
  const [form, setForm] = useState({
    date: txn.date,
    amount: String(txn.amount),
    type: txn.type,
    location: txn.location ?? 'calicut',
    description: txn.description ?? '',
  })
  const save = () => {
    const amount = num(form.amount)
    if (amount == null || amount <= 0) { toast.error('Enter a valid amount'); return }
    updateCashTxn(txn.id, {
      date: form.date,
      amount,
      type: form.type,
      location: form.location as 'calicut' | 'cochin',
      description: form.description || undefined,
    })
    toast.success('Cash entry updated')
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit cash entry</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ecash-date">Date</Label>
              <Input id="ecash-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ecash-amount">Amount (₹)</Label>
              <Input id="ecash-amount" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as CashTxnRow['type'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="replenishment">Replenishment (cash in)</SelectItem>
                  <SelectItem value="expense">Cash expense (cash out)</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Centre</Label>
              <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v as 'calicut' | 'cochin' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="calicut">Calicut</SelectItem>
                  <SelectItem value="cochin">Cochin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ecash-desc">Description</Label>
            <Input id="ecash-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save changes</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EditInvoiceDialog({ invoice, onClose }: { invoice: InvoiceRow; onClose: () => void }) {
  const { updateInvoice } = useAccount()
  const [form, setForm] = useState({
    invoice_number: invoice.invoice_number,
    customer_name: invoice.customer_name ?? '',
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date ?? '',
    status: invoice.status,
    location: invoice.location ?? 'none',
  })
  const save = () => {
    if (!form.invoice_number.trim()) { toast.error('Invoice number is required'); return }
    updateInvoice(invoice.id, {
      invoice_number: form.invoice_number.trim(),
      customer_name: form.customer_name.trim() || undefined,
      invoice_date: form.invoice_date,
      due_date: form.due_date || undefined,
      status: form.status,
      location: form.location === 'none' ? undefined : (form.location as 'calicut' | 'cochin'),
    })
    toast.success(`Invoice ${form.invoice_number.trim()} updated`)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit invoice {invoice.invoice_number}</DialogTitle>
          <DialogDescription>Amounts are fixed once billed — to change items, delete and regenerate the invoice.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ei-no">Invoice number</Label>
              <Input id="ei-no" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ei-client">Client</Label>
              <Input id="ei-client" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ei-date">Invoice date</Label>
              <Input id="ei-date" type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ei-due">Due date</Label>
              <Input id="ei-due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as InvoiceRow['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'] as const).map((s) => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Centre</Label>
              <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  <SelectItem value="calicut">Calicut</SelectItem>
                  <SelectItem value="cochin">Cochin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save changes</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
