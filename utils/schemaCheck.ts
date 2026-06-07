// Lightweight schema-missing detector for graceful UI fallbacks.
// The new Bank Reconciliation / GST Returns / Multi-Currency tables and RPCs
// require migration 002 to be applied via Supabase SQL Editor.

import { supabase } from '../supabaseClient';

let cached: boolean | null = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

/** Returns true if the bank_accounts table exists (migration 002 applied). */
export async function isMigration002Applied(): Promise<boolean> {
  const now = Date.now();
  if (cached !== null && now - cachedAt < CACHE_MS) return cached;
  try {
    const { error } = await supabase
      .from('bank_accounts')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    cached = !error || !error.message.includes('does not exist');
  } catch {
    cached = false;
  }
  cachedAt = now;
  return cached;
}

export function clearSchemaCache() {
  cached = null;
  cachedAt = 0;
}
