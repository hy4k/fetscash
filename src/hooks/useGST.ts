import { useQuery } from '@tanstack/react-query';
import { gstApi } from '@/services';
import { useAuthStore } from '@/stores/useAuthStore';

export function useGSTReturns() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['gstReturns', userId],
    queryFn: () => (userId ? gstApi.fetchAll(userId) : []),
    enabled: !!userId,
  });
}
