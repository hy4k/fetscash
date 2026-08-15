export type Country = 'India' | 'USA' | 'UK' | 'Canada' | 'Other';
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'CAD';
export type CustomerStatus = 'active' | 'inactive';

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  contact_person?: string;
  email: string;
  phone?: string;
  address?: string;
  country: Country;
  payment_terms: number;
  currency: Currency;
  gst_number?: string;
  tan_number?: string;
  status: CustomerStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExamType {
  id: string;
  user_id: string;
  code: string;
  name: string;
  description?: string;
  duration_minutes?: number;
  default_rate_inr: number;
  default_rate_usd: number;
  status: 'active' | 'inactive';
}

export interface ServiceLine {
  id?: string;
  exam_type_id?: string;
  exam_type?: ExamType;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  currency: Currency;
}
