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
      // table missing → browser mode — rename legacy 'Partner' rows locally too
      const local = loadLocalEntries()
      if (local.some((r) => r.person === 'Partner')) {
        saveLocal(local.map((r) => (r.person === 'Partner' ? { ...r, person: 'Niyas' } : r)))
      } else {
        setEntries(local)
      }
      setCloud(false); setLoaded(true)
      return
    }
    // one-time rename: the generic 'Partner' claimant is Niyas
    if ((data ?? []).some((r) => (r as ReimbEntry).person === 'Partner')) {
      await supabase.from(TABLE).update({ person: 'Niyas' }).eq('person', 'Partner')
    }
    // one-time migration: move browser-saved claims into the cloud
    const local = loadLocalEntries()
    if (local.length > 0) {
      const cloudIds = new Set(((data ?? []) as ReimbEntry[]).map((r) => r.id))
      const toMove = local
        .filter((r) => !cloudIds.has(r.id))
        .map((r) => (r.person === 'Partner' ? { ...r, person: 'Niyas' } : r))
      if (toMove.length > 0) {
        const { error: upErr } = await supabase.from(TABLE).upsert(toMove)
        if (upErr) {
          toast.error(`Could not move browser claims: ${upErr.message}`)
        } else {
          try { localStorage.removeItem(LOCAL_KEY) } catch { /* storage unavailable */ }
          toast.success(`Moved ${toMove.length} claim${toMove.length === 1 ? '' : 's'} from this browser to Supabase`)
        }
      } else {
        try { localStorage.removeItem(LOCAL_KEY) } catch { /* storage unavailable */ }
      }
    }
    const finalQ = await supabase.from(TABLE).select('*').order('date', { ascending: false })
    setEntries((finalQ.data ?? []) as ReimbEntry[])
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
