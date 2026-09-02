import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { uid } from '@/lib/localStore'

export interface ReimbEntry {
  id: string
  person: string
  date: string
  amount: number
  description?: string
  category?: string
  receipt_name?: string
  receipt_data?: string // data URL
  settled_on?: string
}

const TABLE = 'acc_reimbursements'
const LOCAL_KEY = 'fets-reimbursements-v1'

function loadLocalEntries(): ReimbEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as ReimbEntry[]
  } catch {
    return []
  }
}

/**
 * Reimbursement store — Supabase-first, browser fallback if the
 * acc_reimbursements table doesn't exist yet (run supabase-reimbursements.sql).
 */
export function useReimbursements() {
  const [entries, setEntries] = useState<ReimbEntry[]>([])
  const [cloud, setCloud] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setEntries(loadLocalEntries()); setCloud(false); setLoaded(true); return
    }
    const { data, error } = await supabase.from(TABLE).select('*').order('date', { ascending: false })
    if (error) {
      // table missing → browser mode
      setEntries(loadLocalEntries()); setCloud(false); setLoaded(true)
      return
    }
    setEntries((data ?? []) as ReimbEntry[])
    setCloud(true)
    setLoaded(true)
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const saveLocal = (next: ReimbEntry[]) => {
    setEntries(next)
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)) } catch { /* full */ }
  }

  const add = useCallback(async (e: Omit<ReimbEntry, 'id'>) => {
    const row: ReimbEntry = { ...e, id: uid('rmb') }
    if (cloud) {
      const { error } = await supabase.from(TABLE).insert(row)
      if (error) { toast.error(`Could not save: ${error.message}`); return false }
      await refresh()
    } else {
      saveLocal([row, ...loadLocalEntries()])
    }
    return true
  }, [cloud, refresh])

  const remove = useCallback(async (id: string) => {
    if (cloud) {
      const { error } = await supabase.from(TABLE).delete().eq('id', id)
      if (error) { toast.error(`Could not delete: ${error.message}`); return }
      await refresh()
    } else {
      saveLocal(loadLocalEntries().filter((r) => r.id !== id))
    }
  }, [cloud, refresh])

  /** Mark all unsettled entries of a person as settled today. Returns the settled total. */
  const settle = useCallback(async (person: string) => {
    const pending = entries.filter((e) => e.person === person && !e.settled_on)
    if (pending.length === 0) return 0
    const today = new Date().toISOString().slice(0, 10)
    const total = pending.reduce((s, e) => s + e.amount, 0)
    if (cloud) {
      const { error } = await supabase.from(TABLE).update({ settled_on: today })
        .eq('person', person).is('settled_on', null)
      if (error) { toast.error(`Could not settle: ${error.message}`); return 0 }
      await refresh()
    } else {
      saveLocal(loadLocalEntries().map((r) => (r.person === person && !r.settled_on ? { ...r, settled_on: today } : r)))
    }
    return total
  }, [cloud, entries, refresh])

  return { entries, cloud, loaded, refresh, add, remove, settle }
}
