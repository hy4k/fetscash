export type GSTReturnType = 'GSTR1' | 'GSTR3B';
export type GSTReturnStatus = 'draft' | 'ready' | 'filed' | 'pending';

export interface GSTReturn {
  id: string;
  user_id: string;
  return_period: string;
  return_type: GSTReturnType;
  filing_due_date?: string;
  filed_date?: string;
  filed_reference?: string;
  status: GSTReturnStatus;
  taxable_value_igst: number;
  taxable_value_cgst: number;
  taxable_value_sgst: number;
  tax_igst: number;
  tax_cgst: number;
  tax_sgst: number;
  total_tax: number;
  total_invoices: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GSTReturnItem {
  id: string;
  gst_return_id: string;
  invoice_id?: string;
  invoice_number?: string;
  customer_name?: string;
  taxable_value: number;
  igst: number;
  cgst: number;
  sgst: number;
  total_tax: number;
  total_amount: number;
  created_at?: string;
}
