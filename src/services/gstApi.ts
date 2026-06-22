import { supabase } from './supabase';
import { GSTReturn } from '@/types';

export const gstApi = {
  async fetchAll(userId: string): Promise<GSTReturn[]> {
    const { data, error } = await supabase.from('gst_returns').select('*').eq('user_id', userId).order('return_period', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },
};