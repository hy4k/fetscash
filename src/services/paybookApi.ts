import { supabase } from './supabase';
import { FetsSalaryData, FetsExpensesData } from '@/types';

export const paybookApi = {
  async fetchSalaryData(location: string): Promise<FetsSalaryData[]> {
    const { data, error } = await supabase.from('fets_salary_data').select('*').eq('location', location);
    if (error) throw new Error(error.message);
    return data || [];
  },
  async fetchExpensesData(location: string): Promise<FetsExpensesData[]> {
    const { data, error } = await supabase.from('fets_expenses_data').select('*').eq('location', location);
    if (error) throw new Error(error.message);
    return data || [];
  },
};