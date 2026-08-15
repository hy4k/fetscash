import { supabase } from './supabase';
import { CurrencyRate } from '@/types';

export const currencyApi = {
  async fetchAll(userId: string): Promise<CurrencyRate[]> {
    const { data, error } = await supabase.from('currency_rates').select('*').eq('user_id', userId).order('effective_date', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },
};