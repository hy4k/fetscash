import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/services';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAppStore } from '@/stores/useAppStore';
import { Invoice, ServiceLine, LocationType } from '@/types';
import { toast } from 'sonner';

export function useInvoices() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['invoices', userId],
    queryFn: () => (userId ? invoicesApi.fetchAll(userId) : []),
    enabled: !!userId,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoice,
      serviceLines,
    }: {
      invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>;
      serviceLines: ServiceLine[];
    }) => invoicesApi.create(invoice, serviceLines),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
      serviceLines,
    }: {
      id: string;
      updates: Partial<Invoice>;
      serviceLines?: ServiceLine[];
    }) => invoicesApi.update(id, updates, serviceLines),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useGenerateInvoiceNumber() {
  const location = useAppStore((s) => s.location);
  return useMutation({
    mutationFn: ({
      customerId,
      customers,
    }: {
      customerId: string;
      customers: any[];
    }) => invoicesApi.generateInvoiceNumber(customerId, location, customers),
    onError: (err: Error) => toast.error(err.message),
  });
}
