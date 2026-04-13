import React, { useState, useEffect } from 'react';
import { Invoice, Customer, ServiceLine, InvoiceStatus, LocationType } from '../types';
import { supabase } from '../supabaseClient';

interface InvoiceFormProps {
  invoice?: Invoice | null;
  customers: Customer[];
  userId: string;
  location: LocationType;
  onSave: (data: any) => void;
  onCancel: () => void;
  primaryColor: string;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoice,
  customers,
  userId,
  location,
  onSave,
  onCancel,
  primaryColor,
}) => {
  const [formData, setFormData] = useState<Partial<Invoice>>({
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    service_month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    currency: 'USD',
    subtotal: 0,
    gst_rate: 0,
    gst_amount: 0,
    total_amount: 0,
    status: 'draft' as InvoiceStatus,
    notes: '',
    service_lines: [],
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newServiceLine, setNewServiceLine] = useState<ServiceLine>({
    description: '',
    quantity: 1,
    rate: 0,
    amount: 0,
    currency: 'USD',
  });

  useEffect(() => {
    if (invoice) {
      setFormData({
        ...invoice,
        service_lines: invoice.service_lines || [],
      });
      const customer = customers.find((c) => c.id === invoice.customer_id);
      setSelectedCustomer(customer || null);
    } else {
      // Default values for new invoice
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + 30);
      
      setFormData((prev) => ({
        ...prev,
        invoice_date: today.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
      }));
    }
  }, [invoice, customers]);

  useEffect(() => {
    if (selectedCustomer) {
      const isIndian = selectedCustomer.country === 'India';
      const gstRate = isIndian ? 18 : 0;
      
      setFormData((prev) => ({
        ...prev,
        currency: selectedCustomer.currency,
        gst_rate: gstRate,
      }));
    }
  }, [selectedCustomer]);

  // Recalculate totals when service lines change
  useEffect(() => {
    const subtotal = formData.service_lines?.reduce((sum, line) => sum + (line.amount || 0), 0) || 0;
    const gstAmount = subtotal * (formData.gst_rate || 0) / 100;
    const total = subtotal + gstAmount;
    
    setFormData((prev) => ({
      ...prev,
      subtotal,
      gst_amount: gstAmount,
      total_amount: total,
    }));
  }, [formData.service_lines, formData.gst_rate]);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    const customer = customers.find((c) => c.id === customerId);
    setSelectedCustomer(customer || null);
    setFormData((prev) => ({
      ...prev,
      customer_id: customerId,
    }));
  };

  const addServiceLine = () => {
    if (!newServiceLine.description || !newServiceLine.rate) return;
    
    const amount = (newServiceLine.quantity || 1) * newServiceLine.rate;
    const line: ServiceLine = {
      ...newServiceLine,
      amount,
      currency: formData.currency || 'USD',
    };
    
    setFormData((prev) => ({
      ...prev,
      service_lines: [...(prev.service_lines || []), line],
    }));
    
    setNewServiceLine({
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0,
      currency: formData.currency || 'USD',
    });
  };

  const removeServiceLine = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      service_lines: prev.service_lines?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent, status: InvoiceStatus = 'draft') => {
    e.preventDefault();
    
    const invoiceData = {
      ...formData,
      status,
      user_id: userId,
    };
    
    onSave(invoiceData);
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      INR: '₹',
      EUR: '€',
      GBP: '£',
      CAD: 'C$',
    };
    return symbols[currency] || currency;
  };

  const inputClass =
    'w-full neo-input rounded-xl p-4 text-sm font-medium placeholder-text-tertiary focus:border-money-gold/30 transition-all';
  const labelClass =
    'block text-xs font-bold text-[#8ba696] mb-2 ml-1 uppercase tracking-wider';

  return (
    <form className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
      {/* Invoice Header */}
      <div className="grid grid-cols-2 gap-5">
        <div className="col-span-2">
          <label className={labelClass}>Select Client *</label>
          <div className="relative">
            <select
              name="customer_id"
              required
              value={formData.customer_id}
              onChange={handleCustomerChange}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              <option value="">Choose a client...</option>
              {customers
                .filter((c) => c.status === 'active')
                .map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.currency})
                  </option>
                ))}
            </select>
            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none text-xs"></i>
          </div>
        </div>

        {selectedCustomer && (
          <div className="col-span-2 glass-panel rounded-xl p-4 border border-money-gold/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {selectedCustomer.country === 'India' ? '🇮🇳' : 
                   selectedCustomer.country === 'USA' ? '🇺🇸' : 
                   selectedCustomer.country === 'UK' ? '🇬🇧' : 
                   selectedCustomer.country === 'Canada' ? '🇨🇦' : '🌍'}
                </span>
                <div>
                  <p className="text-sm font-bold text-money-paper">{selectedCustomer.name}</p>
                  <p className="text-xs text-text-tertiary">{selectedCustomer.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-secondary">Payment Terms: Net {selectedCustomer.payment_terms} days</p>
                <p className="text-xs text-money-gold">Currency: {selectedCustomer.currency}</p>
              </div>
            </div>
            {selectedCustomer.country === 'India' && selectedCustomer.gst_number && (
              <p className="text-xs text-money-green mt-2">GST: {selectedCustomer.gst_number}</p>
            )}
          </div>
        )}

        <div>
          <label className={labelClass}>Invoice Number</label>
          <input
            type="text"
            readOnly
            value={invoice?.invoice_number || `Auto-assigned on save (${location === 'calicut' ? 'C' : 'K'}...)`}
            className={`${inputClass} opacity-70 cursor-not-allowed border border-money-gold/20 text-money-gold font-mono`}
            title="Invoice number is auto-generated based on client and branch"
          />
        </div>

        <div>
          <label className={labelClass}>Invoice Date *</label>
          <input
            type="date"
            name="invoice_date"
            required
            value={formData.invoice_date}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, invoice_date: e.target.value }))
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Due Date *</label>
          <input
            type="date"
            name="due_date"
            required
            value={formData.due_date}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, due_date: e.target.value }))
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Service Month *</label>
          <input
            type="text"
            name="service_month"
            required
            placeholder="e.g., January 2024"
            value={formData.service_month}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, service_month: e.target.value }))
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Currency</label>
          <input
            type="text"
            value={formData.currency}
            disabled
            className={`${inputClass} opacity-70 cursor-not-allowed`}
          />
        </div>
      </div>

      {/* Service Lines */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
          Service Details
        </h3>

        {/* Existing Lines */}
        {formData.service_lines?.map((line, index) => (
          <div
            key={index}
            className="glass-panel rounded-xl p-4 border border-[#85bb65]/10 flex justify-between items-center"
          >
            <div className="flex-1">
              <p className="text-sm font-bold text-money-paper">{line.description}</p>
              <p className="text-xs text-text-tertiary">
                {line.quantity} × {getCurrencySymbol(formData.currency || 'USD')}
                {line.rate.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm font-bold text-money-gold">
                {getCurrencySymbol(formData.currency || 'USD')}
                {line.amount?.toFixed(2)}
              </p>
              <button
                type="button"
                onClick={() => removeServiceLine(index)}
                className="text-red-400 hover:text-red-500"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>
        ))}

        {/* Add New Line */}
        <div className="glass-panel rounded-xl p-4 border border-[#85bb65]/20 border-dashed">
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-5">
              <input
                type="text"
                placeholder="Service description (e.g., PMI Exams - 45 candidates)"
                value={newServiceLine.description}
                onChange={(e) =>
                  setNewServiceLine((prev) => ({ ...prev, description: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <input
                type="number"
                placeholder="Qty"
                min={1}
                value={newServiceLine.quantity || ''}
                onChange={(e) =>
                  setNewServiceLine((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 1,
                  }))
                }
                className={inputClass}
              />
            </div>
            <div className="col-span-3">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
                  {getCurrencySymbol(formData.currency || 'USD')}
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Rate"
                  value={newServiceLine.rate || ''}
                  onChange={(e) =>
                    setNewServiceLine((prev) => ({
                      ...prev,
                      rate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className={`${inputClass} pl-8`}
                />
              </div>
            </div>
            <div className="col-span-2">
              <button
                type="button"
                onClick={addServiceLine}
                disabled={!newServiceLine.description || !newServiceLine.rate}
                className="w-full neo-btn py-4 rounded-xl text-xs font-bold text-money-gold disabled:opacity-50"
              >
                <i className="fas fa-plus"></i> Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="glass-panel rounded-xl p-6 border border-[#85bb65]/10">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Subtotal:</span>
            <span className="font-bold">
              {getCurrencySymbol(formData.currency || 'USD')}
              {formData.subtotal?.toFixed(2)}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">
              GST ({formData.gst_rate}%):
            </span>
            <span className="font-bold">
              {getCurrencySymbol(formData.currency || 'USD')}
              {formData.gst_amount?.toFixed(2)}
            </span>
          </div>
          
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#85bb65]/20">
            <span className="text-money-gold">Total:</span>
            <span className="text-money-gold">
              {getCurrencySymbol(formData.currency || 'USD')}
              {formData.total_amount?.toFixed(2)}
            </span>
          </div>
          
          {selectedCustomer?.country !== 'India' && formData.total_amount > 0 && (
            <p className="text-xs text-money-green/60 mt-2">
              Foreign inward remittance: No GST applicable
            </p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>Notes / Terms</label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Payment instructions, bank details, etc."
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4 pt-4 mt-2 border-t border-[#85bb65]/10 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="neo-btn px-6 py-3.5 rounded-xl text-sm font-bold text-text-secondary hover:text-white transition-all active:scale-95"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e as any, 'draft')}
          className="neo-btn px-6 py-3.5 rounded-xl text-sm font-bold text-text-secondary hover:text-white transition-all active:scale-95"
        >
          Save as Draft
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e as any, 'sent')}
          disabled={!formData.customer_id || !formData.service_lines?.length}
          className="neo-btn px-8 py-3.5 rounded-xl text-sm font-bold text-money-gold transition-all active:scale-95 border border-money-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] disabled:opacity-50"
        >
          Create & Send Invoice
        </button>
      </div>
    </form>
  );
};