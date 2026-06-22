import { supabase } from './supabase';
import { ForeignRemittance } from '@/types';

export const remittanceApi = {
  async fetchAll(userId: string): Promise<ForeignRemittance[]> {
    const { data, error } = await supabase.from('foreign_remittances').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },
};