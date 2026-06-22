import React, { useState, useEffect } from 'react';
import { FormModal } from './FormModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Invoice, InvoiceStatus, Currency, Customer, ServiceLine } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  customers: Customer[];
  userId: string;
  location: string;
  onSave: (invoice: Invoice) => void;
}

const invoiceStatuses: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'partially_paid'];
const currencies: Currency[] = ['INR', 'USD', 'EUR', 'GBP', 'CAD'];

export function InvoiceModal({
  isOpen,
  onClose,
  invoice,
  customers,
  userId,
  location,
  onSave,
}: InvoiceModalProps) {
  const [form, setForm] = useState<Partial<Invoice>>({
    id: '',
    user_id: userId,
    invoice_number: '',
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    service_month: new Date().toISOString().slice(0, 7),
    currency: 'INR',
    subtotal: 0,
    gst_rate: 18,
    gst_amount: 0,
    total_amount: 0,
    status: 'draft',
    paid_amount: 0,
    service_lines: [],
    notes: '',
    terms_and_conditions: '',
  });
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);

  useEffect(() => {
    if (invoice) {
      setForm(invoice);
      setServiceLines(invoice.service_lines || []);
    } else {
      setForm({
        id: '',
        user_id: userId,
        invoice_number: '',
        customer_id: customers[0]?.id || '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        service_month: new Date().toISOString().slice(0, 7),
        currency: 'INR',
        subtotal: 0,
        gst_rate: 18,
        gst_amount: 0,
        total_amount: 0,
        status: 'draft',
        paid_amount: 0,
        service_lines: [],
        notes: '',
        terms_and_conditions: '',
      });
      setServiceLines([]);
    }
  }, [invoice, userId, customers, isOpen]);

  const recalculate = (lines: ServiceLine[], gstRate: number) => {
    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    const gstAmount = (subtotal * gstRate) / 100;
    const total = subtotal + gstAmount;
    setForm((prev) => ({
      ...prev,
      subtotal,
      gst_amount: gstAmount,
      total_amount: total,
    }));
  };

  const addServiceLine = () => {
    const newLine: ServiceLine = {
      id: `sl-${Date.now()}`,
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0,
      currency: form.currency || 'INR',
    };
    const updated = [...serviceLines, newLine];
    setServiceLines(updated);
    recalculate(updated, form.gst_rate || 18);
  };

  const updateServiceLine = (index: number, field: keyof ServiceLine, value: any) => {
    const updated = [...serviceLines];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'rate') {
      updated[index].amount = updated[index].quantity * updated[index].rate;
    }
    setServiceLines(updated);
    recalculate(updated, form.gst_rate || 18);
  };

  const removeServiceLine = (index: number) => {
    const updated = serviceLines.filter((_, i) => i !== index);
    setServiceLines(updated);
    recalculate(updated, form.gst_rate || 18);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...(form as Invoice), service_lines: serviceLines });
  };

  const updateField = <K extends keyof Invoice>(field: K, value: Invoice[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectedCustomer = customers.find((c) => c.id === form.customer_id);

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={invoice ? 'Edit Invoice' : 'Create Invoice'}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select
              value={form.customer_id || ''}
              onChange={(e) => updateField('customer_id', e.target.value)}
              required
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <Input
              value={form.invoice_number || ''}
              onChange={(e) => updateField('invoice_number', e.target.value)}
              placeholder="INV-2024-001"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Invoice Date</Label>
            <Input
              type="date"
              value={form.invoice_date || ''}
              onChange={(e) => updateField('invoice_date', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={form.due_date || ''}
              onChange={(e) => updateField('due_date', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Service Month</Label>
            <Input
              type="month"
              value={form.service_month || ''}
              onChange={(e) => updateField('service_month', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={form.currency || 'INR'}
              onChange={(e) => updateField('currency', e.target.value as Currency)}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status || 'draft'}
              onChange={(e) => updateField('status', e.target.value as InvoiceStatus)}
            >
              {invoiceStatuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="border border-divider rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-money-paper">Service Lines</h4>
            <Button type="button" variant="outline" size="sm" onClick={addServiceLine}>
              + Add Line
            </Button>
          </div>
          {serviceLines.map((line, index) => (
            <div key={line.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <Input
                  value={line.description}
                  onChange={(e) => updateServiceLine(index, 'description', e.target.value)}
                  placeholder="Description"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={line.quantity}
                  onChange={(e) => updateServiceLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                  placeholder="Qty"
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  step="0.01"
                  value={line.rate}
                  onChange={(e) => updateServiceLine(index, 'rate', parseFloat(e.target.value) || 0)}
                  placeholder="Rate"
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-xs text-text-secondary">
                  {formatCurrency(line.amount, form.currency || 'INR')}
                </span>
                <button
                  type="button"
                  onClick={() => removeServiceLine(index)}
                  className="text-text-tertiary hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {serviceLines.length === 0 && (
            <p className="text-xs text-text-tertiary text-center py-2">No service lines added yet</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>GST Rate (%)</Label>
            <Input
              type="number"
              value={form.gst_rate || 0}
              onChange={(e) => {
                const rate = parseFloat(e.target.value) || 0;
                updateField('gst_rate', rate);
                recalculate(serviceLines, rate);
              }}
            />
          </div>
          <div className="col-span-2 flex items-end justify-end">
            <div className="text-right space-y-1">
              <p className="text-xs text-text-tertiary">
                Subtotal: {formatCurrency(form.subtotal || 0, form.currency || 'INR')}
              </p>
              <p className="text-xs text-text-tertiary">
                GST ({form.gst_rate}%): {formatCurrency(form.gst_amount || 0, form.currency || 'INR')}
              </p>
              <p className="text-base font-bold text-money-gold">
                Total: {formatCurrency(form.total_amount || 0, form.currency || 'INR')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Input
            value={form.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Internal notes"
          />
        </div>

        <div className="space-y-2">
          <Label>Terms & Conditions</Label>
          <Input
            value={form.terms_and_conditions || ''}
            onChange={(e) => updateField('terms_and_conditions', e.target.value)}
            placeholder="Payment terms and conditions"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="default">
            {invoice ? 'Update' : 'Create'} Invoice
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
