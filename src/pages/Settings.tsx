import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Building2, Landmark, SlidersHorizontal, Database, Download, RotateCcw,
  Tags, X, Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from '@/lib/AccountContext'
import { DEFAULT_SETTINGS, useSettings, type Settings } from '@/lib/settings'
import { PageSkeleton } from '@/components/kimi/PageHeader'
import { KimiCard } from '@/components/kimi/Card'
import { KimiButton } from '@/components/kimi/Button'
import { KimiBadge } from '@/components/kimi/Badge'
import { PageHero, Pill } from '@/components/ledger'
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

type SectionKey = 'business' | 'banking' | 'preferences' | 'categories' | 'data'

export default function SettingsPage() {
  const { data, loading, backend, refresh } = useAccount()
  const [settings, saveSettings] = useSettings()
  const [form, setForm] = useState<Settings>(settings)
  const [section, setSection] = useState<SectionKey>('business')
  const [confirmClear, setConfirmClear] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const navigate = useNavigate()

  if (loading && !data) return <PageSkeleton />

  const set = (patch: Partial<Settings>) => setForm((f) => ({ ...f, ...patch }))
  const dirty = JSON.stringify(form) !== JSON.stringify(settings)

  const save = () => {
    saveSettings(form)
    toast.success('Settings saved', { description: 'Invoice template and preferences updated.' })
  }

  const addCategory = () => {
    const name = newCategory.trim()
    if (!name) return
    if (form.categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      toast.error(`"${name}" already exists`); return
    }
    set({ categories: [...form.categories, name] })
    setNewCategory('')
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

  const tiles: {
    key: SectionKey | 'clients' | 'products'
    label: string
    detail: string
  }[] = [
    { key: 'business', label: 'Business Profile', detail: 'Name, GSTIN, letterhead' },
    { key: 'banking', label: 'Invoice & Banking', detail: 'Bank footer, currency, tax' },
    { key: 'clients', label: 'Clients', detail: `${data?.customers.length ?? 0} organizations` },
    { key: 'products', label: 'Products', detail: `${data?.products.length ?? 0} billable items` },
    { key: 'categories', label: 'Categories', detail: `${form.categories.length} expense categories` },
    { key: 'preferences', label: 'Preferences', detail: 'Centre, FY, cash openings' },
    { key: 'data', label: 'Data & Backup', detail: 'Export, storage mode' },
  ]

  const pick = (key: (typeof tiles)[number]['key']) => {
    if (key === 'clients') navigate('/clients')
    else if (key === 'products') navigate('/products')
    else setSection(key)
  }

  return (
    <>
      <PageHero
        index="09"
        section="SETTINGS"
        title="The set-up"
        lede="Clients, products, categories, centres, invoice numbering and the data backend, all in one place."
        actions={
          <Pill onClick={save} disabled={!dirty}>
            {dirty ? 'Save changes' : 'Saved'}
          </Pill>
        }
      />

      {/* Section picker — numbered hairline tiles */}
      <div className="mb-10 grid grid-cols-2 border-b border-t border-l border-[var(--f-hairline)] sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t, i) => {
          const active = section === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => pick(t.key)}
              className={`flex flex-col items-start gap-1.5 border-b border-r border-[var(--f-hairline-soft)] p-5 text-left transition-colors hover:bg-[rgba(17,23,19,0.035)] ${
                active ? 'bg-[var(--f-card)] shadow-[inset_0_0_0_1.5px_var(--f-ink)]' : ''
              }`}
            >
              <span className="f-mono text-[11px] tracking-[0.14em] text-[var(--f-gold-deep)]">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-[15px] font-medium leading-5 text-[var(--k-label-primary)]">{t.label}</span>
              <span className="text-[12px] leading-4 text-[var(--k-label-tertiary)]">{t.detail}</span>
            </button>
          )
        })}
      </div>

      {/* Business profile */}
      {section === 'business' && (
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
      )}

      {/* Banking & invoice defaults */}
      {section === 'banking' && (
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
      )}

      {/* Categories */}
      {section === 'categories' && (
        <KimiCard title={
          <span className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-rose-600" aria-hidden /> Expense categories
          </span>
        }>
          <p className="k-c1 mb-4">Used in every expense form — Bank Ledger, FETS Cash, and Quick Add.</p>
          <div className="flex flex-wrap gap-2">
            {form.categories.map((c) => (
              <span key={c} className="flex items-center gap-1.5 rounded-xl bg-[var(--k-fill-f1)] py-1.5 pl-3 pr-2 text-[13px] font-medium text-[var(--k-label-primary)]">
                {c}
                <button
                  type="button"
                  aria-label={`Remove ${c}`}
                  onClick={() => set({ categories: form.categories.filter((x) => x !== c) })}
                  className="flex h-5 w-5 items-center justify-center rounded-md text-[var(--k-label-tertiary)] hover:bg-[var(--k-fill-f2)] hover:text-[var(--k-danger)]"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              className="max-w-xs"
            />
            <KimiButton variant="outline" size={26} leftIcon={<Plus />} onClick={addCategory}>
              Add category
            </KimiButton>
          </div>
        </KimiCard>
      )}

      {/* Preferences */}
      {section === 'preferences' && (
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="FETS Cash opening balance — Calicut (₹)" htmlFor="s-obc">
                <Input id="s-obc" type="number" min="0" value={form.openingCalicut} onChange={(e) => set({ openingCalicut: e.target.value })} />
              </Field>
              <Field label="FETS Cash opening balance — Cochin (₹)" htmlFor="s-obk">
                <Input id="s-obk" type="number" min="0" value={form.openingCochin} onChange={(e) => set({ openingCochin: e.target.value })} />
              </Field>
            </div>
            <p className="k-c1">Opening balances set the starting cash-in-hand for each FETS Cash division in Treasury.</p>
          </div>
        </KimiCard>
      )}

      {/* Data */}
      {section === 'data' && (
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
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => { setForm(DEFAULT_SETTINGS); toast.info('Defaults restored — press Save to apply') }}
          className="text-[13px] font-medium text-[var(--k-label-tertiary)] underline-offset-2 hover:text-[var(--k-label-secondary)] hover:underline"
        >
          Restore factory defaults
        </button>
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
