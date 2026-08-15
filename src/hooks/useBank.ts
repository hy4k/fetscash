import { useQuery } from '@tanstack/react-query';
import { bankApi } from '@/services';
import { useAuthStore } from '@/stores/useAuthStore';

export function useBankAccounts() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['bankAccounts', userId],
    queryFn: () => (userId ? bankApi.fetchAccounts(userId) : []),
    enabled: !!userId,
  });
}

export function useBankTransactions() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['bankTransactions', userId],
    queryFn: () => (userId ? bankApi.fetchTransactions(userId) : []),
    enabled: !!userId,
  });
}
