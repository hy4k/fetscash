import { createClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

const url = rawUrl ? rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '') : ''

export const isSupabaseConfigured = Boolean(url && key)

export const supabase = createClient(
  isSupabaseConfigured ? url : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? key! : 'placeholder-anon-key'
)
