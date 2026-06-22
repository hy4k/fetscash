import { useQuery } from '@tanstack/react-query';
import { expensesApi, cashApi } from '@/services';
import { useAuthStore } from '@/stores/useAuthStore';

export function useGlobalCounts() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['globalCounts', userId],
    queryFn: async () => {
      if (!userId) return { expenses: { cochin: 0, calicut: 0 }, cash: { cochin: 0, calicut: 0 } };
      const [expenses, cash] = await Promise.all([
        expensesApi.fetchGlobalCounts(userId),
        cashApi.fetchGlobalCounts(userId),
      ]);
      return { expenses, cash };
    },
    enabled: !!userId,
  });
}
