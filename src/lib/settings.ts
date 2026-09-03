import { useSyncExternalStore } from 'react'
import type { LocationType } from '@/types'

/** App-wide business & preference settings (persisted in localStorage). */
export interface Settings {
  // Business profile (printed on invoices)
  businessName: string
  businessAddress: string
  businessPhone: string
  businessEmail: string
  businessWebsite: string
  gstin: string
  pan: string
  // Banking (invoice footer)
  bankName: string
  bankAccount: string
  bankBranch: string
  bankIfsc: string
  // Preferences
  defaultCurrency: 'INR' | 'USD'
  defaultTaxRate: string
  defaultCentre: LocationType
  fyStartMonth: string // '04' = April (Indian FY)
  // Expense categories (editable, used in expense dialogs)
  categories: string[]
  // FETS Cash opening balances per division
  openingCalicut: string
  openingCochin: string
  // Monthly recurring expense templates
  recurring: { name: string; amount: string; category: string; centre: LocationType | '' }[]
  // People who can claim reimbursements
  reimbursePersons: string[]
}

export const DEFAULT_CATEGORIES = ['Rent', 'Salaries', 'Utilities', 'Supplies', 'Travel', 'Maintenance', 'Interior Works', 'Marketing', 'Courier', 'GST Payment', 'Cash Transfer', 'Reimbursement', 'Misc']

export const DEFAULT_SETTINGS: Settings = {
  businessName: 'Forun Testing & Educational Services',
  businessAddress: '4th Floor, Kadoali Tower, Vandipetta JN, West Nadakkavu, Calicut - 673011',
  businessPhone: '+91 8089393992',
  businessEmail: '',
  businessWebsite: 'www.fets.in',
  gstin: '32AAIFF5955B1ZO',
  pan: '',
  bankName: 'FEDERAL BANK',
  bankAccount: '13160200027156',
  bankBranch: 'PANAMPILLYNAGAR',
  bankIfsc: 'FDRL0001316',
  defaultCurrency: 'INR',
  defaultTaxRate: '0',
  defaultCentre: 'calicut',
  fyStartMonth: '04',
  categories: DEFAULT_CATEGORIES,
  openingCalicut: '0',
  openingCochin: '0',
  recurring: [
    { name: 'Office rent — Calicut (Mariyam)', amount: '110750', category: 'Rent', centre: 'calicut' },
    { name: 'Staff salary — 1', amount: '16800', category: 'Salaries', centre: '' },
    { name: 'Staff salary — 2', amount: '17700', category: 'Salaries', centre: '' },
    { name: 'Staff salary — 3', amount: '15600', category: 'Salaries', centre: '' },
    { name: 'Staff salary — 4', amount: '15600', category: 'Salaries', centre: '' },
    { name: 'Airtel — connection 1', amount: '9665.76', category: 'Utilities', centre: '' },
    { name: 'Airtel — connection 2', amount: '9665.76', category: 'Utilities', centre: '' },
  ],
  reimbursePersons: ['Mithun', 'Niyas'],
}

const KEY = 'fets-accounts-settings-v1'
/** One-time seed marker: default recurring templates merged into existing installs. */
const SEED_KEY = 'fets-accounts-recurring-seed-v2'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    const saved = JSON.parse(raw) as Partial<Settings>
    const merged = { ...DEFAULT_SETTINGS, ...saved }
    // rename the old generic claimant to the actual name, and persist it
    const renamed = [...new Set((merged.reimbursePersons ?? []).map((p) => (p === 'Partner' ? 'Niyas' : p)))]
    if (renamed.join() !== (merged.reimbursePersons ?? []).join()) {
      merged.reimbursePersons = renamed
      localStorage.setItem(KEY, JSON.stringify(merged))
    }
    if (!localStorage.getItem(SEED_KEY)) {
      const existing = (saved.recurring ?? []).map((t) => ({ ...t }))
      // keep the user's rent template but correct the amount to the actual bank figure
      for (const t of existing) if (/mariyam/i.test(t.name)) t.amount = '110750'
      const names = new Set(existing.map((t) => t.name))
      const missing = DEFAULT_SETTINGS.recurring.filter((t) => !names.has(t.name))
      merged.recurring = [...existing, ...missing]
      localStorage.setItem(SEED_KEY, '1')
      localStorage.setItem(KEY, JSON.stringify(merged))
    }
    return merged
  } catch {
    return DEFAULT_SETTINGS
  }
}

let current = load()
const listeners = new Set<() => void>()

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getSettings(): Settings {
  return current
}

export function saveSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // storage unavailable — keep in-memory
  }
  listeners.forEach((fn) => fn())
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const settings = useSyncExternalStore(subscribe, getSettings)
  return [settings, saveSettings]
}
