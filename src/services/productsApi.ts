import { supabase } from './supabase';
import { ProductRow } from '@/types';

export const productsApi = {
  async fetchAll(): Promise<ProductRow[]> {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) throw new Error(error.message);
    return data || [];
  },

  async create(product: Omit<ProductRow, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase.from('products').insert(product);
    if (error) throw new Error(error.message);
  },

  async update(id: string, updates: Partial<ProductRow>): Promise<void> {
    const { error } = await supabase.from('products').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};