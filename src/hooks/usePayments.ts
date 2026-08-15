import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/services';
import { useAuthStore } from '@/stores/useAuthStore';
import { Payment } from '@/types';
import { toast } from 'sonner';

export function usePayments() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['payments', userId],
    queryFn: () => (userId ? paymentsApi.fetchAll(userId) : []),
    enabled: !!userId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (payment: Omit<Payment, 'id' | 'created_at'>) =>
      paymentsApi.create({ ...payment, user_id: userId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Payment recorded');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      paidAmount,
      paymentDate,
      reference,
      totalAmount,
    }: {
      invoiceId: string;
      paidAmount: number;
      paymentDate: string;
      reference: string;
      totalAmount: number;
    }) => paymentsApi.updateInvoicePaymentStatus(invoiceId, paidAmount, paymentDate, reference, totalAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Invoice payment status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
