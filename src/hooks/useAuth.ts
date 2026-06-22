import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { resolveWorkspaceUserId } from '@/utils/workspaceUser';

export function useAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  return useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return null;
      }
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      const userId = await resolveWorkspaceUserId();
      if (!userId) {
        setLoading(false);
        return null;
      }
      const user = { id: userId };
      setUser(user);
      return user;
    },
    staleTime: Infinity,
  });
}
