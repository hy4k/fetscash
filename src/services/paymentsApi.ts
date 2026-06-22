import { supabase } from './supabase';
import { Payment } from '@/types';

export const paymentsApi = {
  async fetchAll(userId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async create(payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
    const { data, error } = await supabase.from('payments').insert(payment).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateInvoicePaymentStatus(invoiceId: string, paidAmount: number, paymentDate: string, reference: string, totalAmount: number): Promise<void> {
    const newStatus = paidAmount >= totalAmount ? 'paid' : 'partially_paid';
    const { error } = await supabase.from('invoices').update({
      paid_amount: paidAmount,
      paid_date: paymentDate,
      payment_reference: reference,
      status: newStatus,
    }).eq('id', invoiceId);
    if (error) throw new Error(error.message);
  },
};