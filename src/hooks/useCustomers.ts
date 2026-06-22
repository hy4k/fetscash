import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/services';
import { useAuthStore } from '@/stores/useAuthStore';
import { Customer } from '@/types';
import { toast } from 'sonner';

export function useCustomers() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['customers', userId],
    queryFn: () => (userId ? customersApi.fetchAll(userId) : []),
    enabled: !!userId,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) =>
      customersApi.create({ ...customer, user_id: userId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Customer> }) => customersApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useInitializeCustomers() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: () => (userId ? customersApi.initializeDefaults(userId) : Promise.resolve()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Default customers initialized');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
