import { useQuery } from '@tanstack/react-query';
import { currencyApi } from '@/services';
import { useAuthStore } from '@/stores/useAuthStore';

export function useCurrencyRates() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['currencyRates', userId],
    queryFn: () => (userId ? currencyApi.fetchAll(userId) : []),
    enabled: !!userId,
  });
}
