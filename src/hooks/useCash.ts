import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashApi } from '@/services';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAppStore } from '@/stores/useAppStore';
import { FetsTransaction } from '@/types';
import { toast } from 'sonner';

export function useCashTransactions() {
  const userId = useAuthStore((s) => s.user?.id);
  const location = useAppStore((s) => s.location);
  return useQuery({
    queryKey: ['cashTransactions', userId, location],
    queryFn: () => (userId ? cashApi.fetchAll(userId, location) : []),
    enabled: !!userId,
  });
}

export function useCreateCashTransaction() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (tx: Omit<FetsTransaction, 'id' | 'created_at'>) => cashApi.create({ ...tx, user_id: userId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashTransactions'] });
      toast.success('Cash transaction added');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateCashTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<FetsTransaction> }) => cashApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashTransactions'] });
      toast.success('Cash transaction updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteCashTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cashApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashTransactions'] });
      toast.success('Cash transaction deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
