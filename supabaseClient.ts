import { createClient, SupabaseClient } from '@supabase/supabase-js';

/** Supabase project URL only (e.g. https://xxxx.supabase.co). Do not append /rest/v1. */
export function normalizeSupabaseUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, '');
  if (/\/rest\/v1$/i.test(u)) u = u.replace(/\/rest\/v1$/i, '');
  return u.replace(/\/+$/, '');
}

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : '';

/** False when .env is missing — avoids crashing the app on import (blank screen). */
export const isSupabaseConfigured = Boolean(url && key);

// createClient throws if the URL string is empty; use harmless placeholders only so modules load.
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? url : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? key! : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-placeholder'
);
