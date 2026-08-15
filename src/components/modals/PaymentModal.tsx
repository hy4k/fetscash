import React, { useState, useEffect } from 'react';
import { FormModal } from './FormModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Invoice, Payment, PaymentMethod } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSave: (payment: Payment) => void;
}

const paymentMethods: PaymentMethod[] = [
  'Bank Transfer',
  'Wire',
  'SWIFT',
  'Cheque',
  'Cash',
  'UPI',
  'Card',
];

export function PaymentModal({
  isOpen,
  onClose,
  invoice,
  onSave,
}: PaymentModalProps) {
  const [form, setForm] = useState<Partial<Payment>>({
    id: '',
    user_id: '',
    invoice_id: invoice.id,
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    amount_inr: 0,
    payment_method: 'Bank Transfer',
    bank_name: '',
    reference_number: '',
    swift_code: '',
    sender_bank: '',
    intermediary_bank: '',
    foreign_bank_charges: 0,
    exchange_rate: 1,
    notes: '',
  });

  const remainingAmount = invoice.total_amount - (invoice.paid_amount || 0);
  const isForeign = invoice.currency !== 'INR';

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      invoice_id: invoice.id,
      amount: remainingAmount,
      amount_inr: isForeign ? remainingAmount * (prev.exchange_rate || 1) : remainingAmount,
    }));
  }, [invoice, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form as Payment);
  };

  const updateField = <K extends keyof Payment>(field: K, value: Payment[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'amount' || field === 'exchange_rate') {
        const rate = next.exchange_rate || 1;
        const amt = next.amount || 0;
        if (isForeign) {
          next.amount_inr = amt * rate;
        } else {
          next.amount_inr = amt;
        }
      }
      return next;
    });
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Payment — Invoice ${invoice.invoice_number}`}
      maxWidth="max-w-xl"
    >
      <div className="mb-4 p-3 rounded-xl bg-surface border border-divider">
        <div className="flex justify-between items-center">
          <span className="text-xs text-text-tertiary">Invoice Total</span>
          <span className="text-sm font-semibold text-money-paper">
            {formatCurrency(invoice.total_amount, invoice.currency)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-text-tertiary">Already Paid</span>
          <span className="text-sm font-semibold text-green-400">
            {formatCurrency(invoice.paid_amount || 0, invoice.currency)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-1 pt-1 border-t border-divider">
          <span className="text-xs text-text-tertiary">Remaining</span>
          <span className="text-sm font-bold text-money-gold">
            {formatCurrency(remainingAmount, invoice.currency)}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Input
              type="date"
              value={form.payment_date || ''}
              onChange={(e) => updateField('payment_date', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select
              value={form.payment_method || 'Bank Transfer'}
              onChange={(e) => updateField('payment_method', e.target.value as PaymentMethod)}
            >
              {paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Amount ({invoice.currency})</Label>
            <Input
              type="number"
              step="0.01"
              max={remainingAmount}
              value={form.amount || ''}
              onChange={(e) => updateField('amount', parseFloat(e.target.value) || 0)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Amount (INR)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount_inr || ''}
              onChange={(e) => updateField('amount_inr', parseFloat(e.target.value) || 0)}
              required
            />
          </div>
        </div>

        {isForeign && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Exchange Rate</Label>
              <Input
                type="number"
                step="0.0001"
                value={form.exchange_rate || ''}
                onChange={(e) => updateField('exchange_rate', parseFloat(e.target.value) || 1)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Foreign Bank Charges</Label>
              <Input
                type="number"
                step="0.01"
                value={form.foreign_bank_charges || ''}
                onChange={(e) =>
                  updateField('foreign_bank_charges', parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Bank Name</Label>
          <Input
            value={form.bank_name || ''}
            onChange={(e) => updateField('bank_name', e.target.value)}
            placeholder="Receiving bank name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Reference Number</Label>
          <Input
            value={form.reference_number || ''}
            onChange={(e) => updateField('reference_number', e.target.value)}
            placeholder="UTR / Reference / Transaction ID"
            required
          />
        </div>

        {isForeign && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SWIFT Code</Label>
                <Input
                  value={form.swift_code || ''}
                  onChange={(e) => updateField('swift_code', e.target.value)}
                  placeholder="SWIFT/BIC"
                />
              </div>
              <div className="space-y-2">
                <Label>Sender Bank</Label>
                <Input
                  value={form.sender_bank || ''}
                  onChange={(e) => updateField('sender_bank', e.target.value)}
                  placeholder="Sender bank name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Intermediary Bank</Label>
              <Input
                value={form.intermediary_bank || ''}
                onChange={(e) => updateField('intermediary_bank', e.target.value)}
                placeholder="Intermediary bank (if any)"
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label>Notes</Label>
          <Input
            value={form.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Additional notes"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="default">
            Record Payment
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
