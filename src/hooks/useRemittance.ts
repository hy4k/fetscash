import { useQuery } from '@tanstack/react-query';
import { remittanceApi } from '@/services';
import { useAuthStore } from '@/stores/useAuthStore';

export function useForeignRemittances() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['foreignRemittances', userId],
    queryFn: () => (userId ? remittanceApi.fetchAll(userId) : []),
    enabled: !!userId,
  });
}
