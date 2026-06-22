import { supabase } from './supabase';
import { Customer } from '@/types';

export const customersApi = {
  async fetchAll(userId: string): Promise<Customer[]> {
    const { data, error } = await supabase.from('customers').select('*').eq('user_id', userId).order('name');
    if (error) throw new Error(error.message);
    return data || [];
  },

  async fetchByIds(ids: string[]): Promise<Customer[]> {
    if (ids.length === 0) return [];
    const { data, error } = await supabase.from('customers').select('*').in('id', ids);
    if (error) throw new Error(error.message);
    return data || [];
  },

  async create(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    const { error } = await supabase.from('customers').insert(customer);
    if (error) throw new Error(error.message);
  },

  async update(id: string, updates: Partial<Customer>): Promise<void> {
    const { error } = await supabase.from('customers').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async initializeDefaults(userId: string): Promise<void> {
    const { data: existing } = await supabase.from('customers').select('id').eq('user_id', userId);
    if (existing && existing.length > 0) return;
    const defaults = [
      { name: 'Prometric Testing Services', country: 'USA', currency: 'USD', email: 'accounts@prometric.com', payment_terms: 30, status: 'active' },
      { name: 'Pearson VUE', country: 'USA', currency: 'USD', email: 'ap@pearsonvue.com', payment_terms: 45, status: 'active' },
      { name: 'PSI Services LLC', country: 'USA', currency: 'USD', email: 'invoices@psiexams.com', payment_terms: 30, status: 'active' },
      { name: 'CELPIP', country: 'Canada', currency: 'CAD', email: 'admin@celpip.ca', payment_terms: 30, status: 'active' },
      { name: 'ITTS India Pvt Ltd', country: 'India', currency: 'INR', email: 'info@itts.in', payment_terms: 30, gst_number: '27AABCI1234C1Z5', status: 'active' },
    ];
    const { error } = await supabase.from('customers').insert(defaults.map(c => ({ ...c, user_id: userId })));
    if (error) throw new Error(error.message);
  },
};