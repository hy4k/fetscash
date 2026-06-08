import { supabase } from '../supabaseClient';

type IdRow = { user_id?: string | null };

/** Tally user_id occurrences; return the most common non-empty UUID. */
function bestUserIdFromRows(rows: IdRow[] | null): string | null {
  if (!rows?.length) return null;
  const counts = new Map<string, number>();
  for (const r of rows) {
    const id = typeof r.user_id === 'string' ? r.user_id.trim() : '';
    if (!id) continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  counts.forEach((n, id) => {
    if (n > bestN) {
      bestN = n;
      best = id;
    }
  });
  return best;
}

async function bestUserIdFromTable(table: string, limit = 8000): Promise<string | null> {
  const { data, error } = await supabase.from(table).select('user_id').limit(limit);
  if (error) {
    console.warn(`[workspace] ${table}:`, error.message);
    return null;
  }
  return bestUserIdFromRows(data as IdRow[]);
}

/**
 * Workspace rows are scoped by `user_id` without signing in.
 * Set `VITE_WORKSPACE_USER_ID` in `.env` to pin a tenant.
 *
 * Auto-pick: **never** trust a single arbitrary row (e.g. first `categories` row can be an
 * empty tenant). We choose the `user_id` with the most rows in `expenses`, then cash,
 * invoices, customers, then categories.
 */
export async function resolveWorkspaceUserId(): Promise<string | null> {
  const fromEnv = (import.meta.env.VITE_WORKSPACE_USER_ID as string | undefined)?.trim();
  if (fromEnv) return fromEnv;

  const tries = ['invoices', 'customers', 'expenses', 'fets_cash_transactions', 'categories'] as const;
  for (const table of tries) {
    const id = await bestUserIdFromTable(table);
    if (id) return id;
  }
  return null;
}
