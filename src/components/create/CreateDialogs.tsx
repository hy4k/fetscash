import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { KimiButton } from '@/components/kimi/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

/** Emerald "+" create button used in every page header. */
export function CreateButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <KimiButton leftIcon={<Plus />} onClick={onClick}>
      {children}
    </KimiButton>
  )
}

export function AddClientDialog() {
  const { addCustomer } = useAccount()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', contact_person: '', email: '', phone: '', tax_id: '', address: '' })

  const save = () => {
    if (!form.name.trim()) { toast.error('Client name is required'); return }
    addCustomer({
      name: form.name.trim(),
      contact_person: form.contact_person || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      tax_id: form.tax_id || undefined,
      address: form.address || undefined,
    })
    toast.success(`Client "${form.name.trim()}" added`)
    setOpen(false)
    setForm({ name: '', contact_person: '', email: '', phone: '', tax_id: '', address: '' })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <CreateButton>Add client</CreateButton>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add client</DialogTitle>
          <DialogDescription>The client becomes billable in the Invoice Generator immediately.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="cl-name">Organization name *</Label>
            <Input id="cl-name" placeholder="e.g. PROMETRIC B.V" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cl-contact">Contact person</Label>
              <Input id="cl-contact" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cl-tax">GSTIN / Tax ID</Label>
              <Input id="cl-tax" value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cl-email">Email</Label>
              <Input id="cl-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cl-phone">Phone</Label>
              <Input id="cl-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cl-addr">Billing address</Label>
            <Textarea id="cl-addr" rows={3} placeholder="Printed in the Bill To block of invoices" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save client</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AddProductDialog() {
  const { addProduct } = useAccount()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', hsn: '', sale_rate: '', buy_rate: '', igst: '0', description: '' })

  const save = () => {
    const rate = parseFloat(form.sale_rate)
    if (!form.name.trim()) { toast.error('Item name is required'); return }
    if (!Number.isFinite(rate) || rate <= 0) { toast.error('Enter a valid sale rate'); return }
    const igst = parseFloat(form.igst) || 0
    addProduct({
      name: form.name.trim(),
      hsn: form.hsn || undefined,
      sale_rate: rate,
      buy_rate: parseFloat(form.buy_rate) || 0,
      description: form.description || undefined,
      tax_list: igst > 0 ? `[ IGST : ${igst}%, SGST : 0%, CGST : 0% ]` : undefined,
    })
    toast.success(`Item "${form.name.trim()}" added`)
    setOpen(false)
    setForm({ name: '', hsn: '', sale_rate: '', buy_rate: '', igst: '0', description: '' })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <CreateButton>Add item</CreateButton>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add product / service</DialogTitle>
          <DialogDescription>Appears in the catalog and in the Invoice Generator item picker.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="pr-name">Item name *</Label>
            <Input id="pr-name" placeholder="e.g. ICMA - Exam Registration Fees" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pr-rate">Sale rate (₹) *</Label>
              <Input id="pr-rate" type="number" min="0" value={form.sale_rate} onChange={(e) => setForm({ ...form, sale_rate: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pr-buy">Buy rate (₹)</Label>
              <Input id="pr-buy" type="number" min="0" value={form.buy_rate} onChange={(e) => setForm({ ...form, buy_rate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pr-hsn">HSN / SAC</Label>
              <Input id="pr-hsn" value={form.hsn} onChange={(e) => setForm({ ...form, hsn: e.target.value })} />
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
            <Label htmlFor="pr-desc">Description</Label>
            <Input id="pr-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save item</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
