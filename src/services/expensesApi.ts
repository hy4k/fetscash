import { supabase } from './supabase';
import { Expense, LocationType, Category } from '@/types';

export const expensesApi = {
  async fetchAll(userId: string, location: LocationType): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .eq('location', location)
      .order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async fetchCategories(userId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    if (error) throw new Error(error.message);
    return data || [];
  },

  async create(expense: Omit<Expense, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase.from('expenses').insert(expense);
    if (error) throw new Error(error.message);
  },

  async update(id: string, updates: Partial<Expense>): Promise<void> {
    const { error } = await supabase.from('expenses').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async createCategory(userId: string, name: string): Promise<void> {
    const { error } = await supabase.from('categories').insert({ user_id: userId, name });
    if (error) throw new Error(error.message);
  },

  async deleteCategory(id: number): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async fetchGlobalCounts(userId: string): Promise<{ cochin: number; calicut: number }> {
    const [cochin, calicut] = await Promise.all([
      supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('location', 'cochin'),
      supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('location', 'calicut'),
    ]);
    return { cochin: cochin.count || 0, calicut: calicut.count || 0 };
  },
};