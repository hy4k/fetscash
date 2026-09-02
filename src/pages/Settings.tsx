import { useState } from 'react'
import { Building2, Landmark, SlidersHorizontal, Database, Download, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from '@/lib/AccountContext'
import { DEFAULT_SETTINGS, useSettings, type Settings } from '@/lib/settings'
import { PageHeader } from '@/components/kimi/PageHeader'
import { KimiCard } from '@/components/kimi/Card'
import { KimiButton } from '@/components/kimi/Button'
import { KimiBadge } from '@/components/kimi/Badge'
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

function Field({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { data, backend, refresh } = useAccount()
  const [settings, saveSettings] = useSettings()
  const [form, setForm] = useState<Settings>(settings)
  const [confirmClear, setConfirmClear] = useState(false)

  const set = (patch: Partial<Settings>) => setForm((f) => ({ ...f, ...patch }))
  const dirty = JSON.stringify(form) !== JSON.stringify(settings)

  const save = () => {
    saveSettings(form)
    toast.success('Settings saved', { description: 'Invoice template and preferences updated.' })
  }

  const exportData = () => {
    if (!data) return
    const payload = {
      exported_at: new Date().toISOString(),
      settings: form,
      customers: data.customers,
      products: data.products,
      invoices: data.invoices,
      payments: data.payments,
      expenses: data.expenses,
      cash_transactions: data.cashTxns,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fets-accounts-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup downloaded')
  }

  const clearLocal = async () => {
    localStorage.removeItem('fets-accounts-local-v1')
    setConfirmClear(false)
    toast.success('Browser-only copies cleared — reloading from Supabase')
    await refresh()
    window.location.reload()
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Business profile, invoice banking, and preferences"
        actions={
          <KimiButton leftIcon={<Save />} onClick={save} disabled={!dirty}>
            {dirty ? 'Save changes' : 'Saved'}
          </KimiButton>
        }
      />

      <div className="space-y-6">
        {/* Business profile */}
        <KimiCard title={
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[var(--f-emerald-600)]" aria-hidden /> Business profile
          </span>
        }>
          <p className="k-c1 mb-4">Printed on the invoice letterhead and used across the app.</p>
          <div className="grid gap-4">
            <Field label="Business name" htmlFor="s-name">
              <Input id="s-name" value={form.businessName} onChange={(e) => set({ businessName: e.target.value })} />
            </Field>
            <Field label="Address" htmlFor="s-addr">
              <Textarea id="s-addr" rows={2} value={form.businessAddress} onChange={(e) => set({ businessAddress: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" htmlFor="s-phone">
                <Input id="s-phone" value={form.businessPhone} onChange={(e) => set({ businessPhone: e.target.value })} />
              </Field>
              <Field label="Email" htmlFor="s-email">
                <Input id="s-email" type="email" value={form.businessEmail} onChange={(e) => set({ businessEmail: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Website" htmlFor="s-web">
                <Input id="s-web" value={form.businessWebsite} onChange={(e) => set({ businessWebsite: e.target.value })} />
              </Field>
              <Field label="GSTIN" htmlFor="s-gstin">
                <Input id="s-gstin" value={form.gstin} onChange={(e) => set({ gstin: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="PAN" htmlFor="s-pan">
                <Input id="s-pan" value={form.pan} onChange={(e) => set({ pan: e.target.value })} />
              </Field>
            </div>
          </div>
        </KimiCard>

        {/* Banking & invoice defaults */}
        <KimiCard title={
          <span className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-[var(--f-gold-600)]" aria-hidden /> Invoice & banking
          </span>
        }>
          <p className="k-c1 mb-4">Banking details printed in the footer of every generated invoice.</p>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bank name" htmlFor="s-bank">
                <Input id="s-bank" value={form.bankName} onChange={(e) => set({ bankName: e.target.value })} />
              </Field>
              <Field label="Account number" htmlFor="s-acct">
                <Input id="s-acct" value={form.bankAccount} onChange={(e) => set({ bankAccount: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Branch" htmlFor="s-branch">
                <Input id="s-branch" value={form.bankBranch} onChange={(e) => set({ bankBranch: e.target.value })} />
              </Field>
              <Field label="IFSC" htmlFor="s-ifsc">
                <Input id="s-ifsc" value={form.bankIfsc} onChange={(e) => set({ bankIfsc: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Default currency">
                <Select value={form.defaultCurrency} onValueChange={(v) => set({ defaultCurrency: v as Settings['defaultCurrency'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">₹ Rupees (INR)</SelectItem>
                    <SelectItem value="USD">$ Dollars (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Default tax (IGST %)">
                <Select value={form.defaultTaxRate} onValueChange={(v) => set({ defaultTaxRate: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['0', '5', '12', '18', '28'].map((r) => <SelectItem key={r} value={r}>{r === '0' ? 'No tax' : `${r}%`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        </KimiCard>

        {/* Preferences */}
        <KimiCard title={
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[var(--k-blue)]" aria-hidden /> Preferences
          </span>
        }>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Default centre for new invoices">
                <Select value={form.defaultCentre} onValueChange={(v) => set({ defaultCentre: v as Settings['defaultCentre'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calicut">Calicut</SelectItem>
                    <SelectItem value="cochin">Cochin</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Financial year starts">
                <Select value={form.fyStartMonth} onValueChange={(v) => set({ fyStartMonth: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="04">April (India)</SelectItem>
                    <SelectItem value="01">January</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        </KimiCard>

        {/* Data */}
        <KimiCard title={
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[var(--f-emerald-700)]" aria-hidden /> Data & backup
          </span>
        }>
          <div className="flex flex-wrap items-center gap-3">
            <KimiButton variant="outline" leftIcon={<Download />} onClick={exportData}>
              Download full backup (JSON)
            </KimiButton>
            <KimiButton variant="outline" danger leftIcon={<RotateCcw />} onClick={() => setConfirmClear(true)}>
              Clear browser-only copies
            </KimiButton>
            <KimiBadge tone={backend === 'supabase' ? 'green' : 'orange'}>
              {backend === 'supabase' ? 'Supabase connected' : 'Browser storage mode'}
            </KimiBadge>
          </div>
          <p className="k-c1 mt-3">
            Settings live in this browser. All records (clients, invoices, expenses…) live in Supabase and are shared across devices.
          </p>
        </KimiCard>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setForm(DEFAULT_SETTINGS); toast.info('Defaults restored — press Save to apply') }}
            className="text-[13px] font-medium text-[var(--k-label-tertiary)] underline-offset-2 hover:text-[var(--k-label-secondary)] hover:underline"
          >
            Restore factory defaults
          </button>
        </div>
      </div>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear browser-only copies?</AlertDialogTitle>
            <AlertDialogDescription>
              Entries created in this browser before Supabase was connected are already migrated. Clearing removes any leftover local copies and reloads from Supabase. Cloud data is not touched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-[var(--k-danger)] text-white hover:bg-[var(--k-danger)]/90" onClick={() => void clearLocal()}>
              Clear local copies
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
