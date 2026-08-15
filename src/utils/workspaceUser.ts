import { supabase } from '@/services/supabase';

export async function resolveWorkspaceUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  const { data } = await supabase.auth.signUp({ email: 'workspace@fets.cash', password: 'workspace123' });
  if (data.user) return data.user.id;
  const workspaceHash = window.location.hostname;
  const fallbackId = workspaceHash.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0).toString(16);
  return fallbackId;
}
