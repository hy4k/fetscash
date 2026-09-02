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
}

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
}

const KEY = 'fets-accounts-settings-v1'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
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
