import { supabase } from './supabase';
import { FetsTransaction, LocationType } from '@/types';

export const cashApi = {
  async fetchAll(userId: string, location: LocationType): Promise<FetsTransaction[]> {
    const { data, error } = await supabase
      .from('fets_cash_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('location', location)
      .order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(tx => {
      const parts = tx.description.split(' ||| ');
      if (parts.length >= 3) {
        return { ...tx, custom_id: parts[0], category: parts[1], clean_description: parts.slice(2).join(' ||| ') };
      }
      return { ...tx, clean_description: tx.description, custom_id: 'N/A', category: 'Uncategorized' };
    });
  },

  async create(tx: Omit<FetsTransaction, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase.from('fets_cash_transactions').insert(tx);
    if (error) throw new Error(error.message);
  },

  async update(id: string, updates: Partial<FetsTransaction>): Promise<void> {
    const { error } = await supabase.from('fets_cash_transactions').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('fets_cash_transactions').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async deleteBySourceExpenseId(sourceId: string): Promise<void> {
    const { error } = await supabase.from('fets_cash_transactions').delete().eq('source_expense_id', sourceId);
    if (error) throw new Error(error.message);
  },

  async fetchGlobalCounts(userId: string): Promise<{ cochin: number; calicut: number }> {
    const [cochin, calicut] = await Promise.all([
      supabase.from('fets_cash_transactions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('location', 'cochin'),
      supabase.from('fets_cash_transactions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('location', 'calicut'),
    ]);
    return { cochin: cochin.count || 0, calicut: calicut.count || 0 };
  },
};