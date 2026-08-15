import { supabase } from './supabase';
import { BankAccount, BankTransaction } from '@/types';

export const bankApi = {
  async fetchAccounts(userId: string): Promise<BankAccount[]> {
    const { data, error } = await supabase.from('bank_accounts').select('*').eq('user_id', userId).eq('is_active', true);
    if (error) throw new Error(error.message);
    return data || [];
  },
  async fetchTransactions(userId: string): Promise<BankTransaction[]> {
    const { data, error } = await supabase.from('bank_transactions').select('*').eq('user_id', userId).order('transaction_date', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },
};