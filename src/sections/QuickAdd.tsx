import { useState } from 'react'
import { Wallet, ReceiptText, IndianRupee } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAccount } from '@/lib/AccountContext'
import { useSettings } from '@/lib/settings'

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'NEFT', 'Cheque']

function today() {
  return new Date().toISOString().slice(0, 10)
}

const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function AddExpenseDialog({ defaultCategory, buttonLabel = 'Add expense' }: { defaultCategory?: string; buttonLabel?: string }) {
  const { addExpense } = useAccount()
  const [settings] = useSettings()
  const categories = settings.categories
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    date: today(),
    amount: '',
    category: defaultCategory ?? 'Misc',
    location: 'none',
    payment_mode: 'Bank Transfer',
    description: '',
  })

  const save = () => {
    const amount = num(form.amount)
    if (!amount) { toast.error('Enter a valid amount'); return }
    addExpense({
      date: form.date,
      amount,
      category: form.category,
      payment_mode: form.payment_mode,
      location: form.location === 'none' ? undefined : (form.location as 'calicut' | 'cochin'),
      description: form.description || form.category,
    })
    toast.success('Expense added')
    setOpen(false)
    setForm({ ...form, amount: '', description: '' })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <KimiButton leftIcon={<ReceiptText />}>{buttonLabel}</KimiButton>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
          <DialogDescription>Record an expense — it flows into Transactions, Reports and the Overview.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="exp-date">Date</Label>
              <Input id="exp-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-amount">Amount (₹)</Label>
              <Input id="exp-amount" type="number" min="0" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
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
            <Label htmlFor="exp-desc">Description</Label>
            <Input id="exp-desc" placeholder="What was this for?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save expense</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AddIncomeDialog() {
  const { addPayment } = useAccount()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ date: today(), amount: '', payment_method: 'Bank Transfer', reference_number: '' })

  const save = () => {
    const amount = num(form.amount)
    if (!amount) { toast.error('Enter a valid amount'); return }
    addPayment({
      payment_date: form.date,
      amount,
      amount_inr: amount,
      payment_method: form.payment_method,
      reference_number: form.reference_number || undefined,
    })
    toast.success('Income recorded')
    setOpen(false)
    setForm({ ...form, amount: '', reference_number: '' })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <KimiButton variant="outline" leftIcon={<IndianRupee />}>Add income</KimiButton>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add income</DialogTitle>
          <DialogDescription>Record a receipt that is not linked to an invoice.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="inc-date">Date</Label>
              <Input id="inc-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inc-amount">Amount (₹)</Label>
              <Input id="inc-amount" type="number" min="0" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
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
            <Label htmlFor="inc-ref">Reference / from</Label>
            <Input id="inc-ref" placeholder="UTR, sender name…" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save income</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AddCashDialog() {
  const { addCashTxn } = useAccount()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    date: today(),
    amount: '',
    type: 'replenishment' as 'replenishment' | 'expense',
    location: 'calicut' as 'calicut' | 'cochin',
    description: '',
  })

  const save = () => {
    const amount = num(form.amount)
    if (!amount) { toast.error('Enter a valid amount'); return }
    addCashTxn({
      date: form.date,
      amount,
      type: form.type,
      location: form.location,
      description: form.description || (form.type === 'replenishment' ? 'Cash top-up' : 'Cash expense'),
    })
    toast.success('Cash entry added')
    setOpen(false)
    setForm({ ...form, amount: '', description: '' })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <KimiButton variant="outline" leftIcon={<Wallet />}>Add cash entry</KimiButton>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add cash entry</DialogTitle>
          <DialogDescription>Top up petty cash or record a cash spend.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cash-date">Date</Label>
              <Input id="cash-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cash-amount">Amount (₹)</Label>
              <Input id="cash-amount" type="number" min="0" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as 'replenishment' | 'expense' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="replenishment">Replenishment (cash in)</SelectItem>
                  <SelectItem value="expense">Cash expense (cash out)</SelectItem>
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
            <Label htmlFor="cash-desc">Description</Label>
            <Input id="cash-desc" placeholder="Optional note" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <KimiButton onClick={save}>Save entry</KimiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function QuickAdd() {
  return (
    <div className="flex items-center gap-2">
      <AddExpenseDialog />
      <AddIncomeDialog />
      <AddCashDialog />
    </div>
  )
}
