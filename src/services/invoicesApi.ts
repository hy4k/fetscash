import { supabase } from './supabase';
import { Invoice, ServiceLine, LocationType } from '@/types';

export const invoicesApi = {
  async fetchAll(userId: string): Promise<Invoice[]> {
    const { data: invs, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('invoice_date', { ascending: false });
    if (error) throw new Error(error.message);
    if (!invs) return [];

    const ids = invs.map((inv: any) => inv.id);
    if (ids.length === 0) return invs.map((inv: any) => ({ ...inv, service_lines: [] }));

    const { data: lines } = await supabase.from('service_lines').select('*').in('invoice_id', ids);
    const linesByInvoice: Record<string, any[]> = {};
    (lines || []).forEach((line: any) => {
      if (!linesByInvoice[line.invoice_id]) linesByInvoice[line.invoice_id] = [];
      linesByInvoice[line.invoice_id].push(line);
    });

    return invs.map((inv: any) => ({ ...inv, service_lines: linesByInvoice[inv.id] || [] }));
  },

  async create(invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>, serviceLines: ServiceLine[]): Promise<string> {
    const { service_lines: _, ...payload } = invoice as any;
    const { data, error } = await supabase.from('invoices').insert(payload).select('id').single();
    if (error) throw new Error(error.message);
    if (data?.id && serviceLines.length > 0) {
      const lines = serviceLines.map((line) => ({
        invoice_id: data.id,
        description: line.description,
        quantity: line.quantity ?? 1,
        rate: line.rate,
        amount: line.amount,
        currency: line.currency ?? invoice.currency,
      }));
      const { error: lineError } = await supabase.from('service_lines').insert(lines);
      if (lineError) throw new Error(lineError.message);
    }
    return data.id;
  },

  async update(id: string, updates: Partial<Invoice>, serviceLines?: ServiceLine[]): Promise<void> {
    const { service_lines: _, ...payload } = updates as any;
    const { error } = await supabase.from('invoices').update(payload).eq('id', id);
    if (error) throw new Error(error.message);

    if (serviceLines) {
      await supabase.from('service_lines').delete().eq('invoice_id', id);
      if (serviceLines.length > 0) {
        const lines = serviceLines.map((line) => ({
          invoice_id: id,
          description: line.description,
          quantity: line.quantity ?? 1,
          rate: line.rate,
          amount: line.amount,
          currency: line.currency ?? updates.currency,
        }));
        const { error: lineError } = await supabase.from('service_lines').insert(lines);
        if (lineError) throw new Error(lineError.message);
      }
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async generateInvoiceNumber(customerId: string, location: LocationType, customers: any[]): Promise<string> {
    const branchLetter = location === 'calicut' ? 'C' : 'K';
    const customer = customers.find((c: any) => c.id === customerId);
    if (!customer) return `${branchLetter}X`;
    const words = customer.name
      .replace(/\bpvt\b|\bltd\b|\bllc\b|\binc\b|\bservices\b|\btesting\b|\bvue\b/gi, '')
      .trim()
      .split(/\s+/)
      .filter((w: string) => w.length > 1);
    const code = words.slice(0, 2).map((w: string) => w[0].toUpperCase()).join('') || 'X';
    const prefix = `${branchLetter}${code}`;
    const { data, error } = await supabase.from('invoices').select('invoice_number').like('invoice_number', `${prefix}-%`);
    if (error) throw new Error(error.message);
    const maxSeq = (data || []).reduce((max: number, row: any) => {
      const parts = row.invoice_number?.split('-');
      const seq = parts ? parseInt(parts[parts.length - 1], 10) : 0;
      return !isNaN(seq) && seq > max ? seq : max;
    }, 0);
    return `${prefix}-${maxSeq + 1}`;
  },
};