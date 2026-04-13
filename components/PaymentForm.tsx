import React, { useState, useEffect } from 'react';
import { Invoice, Customer, Payment } from '../types';

interface PaymentFormProps {
  invoice: Invoice;
  customer: Customer;
  onSave: (paymentData: Omit<Payment, 'id' | 'user_id' | 'created_at'>) => void;
  onCancel: () => void;
}

const isForeignInvoice = (customer: Customer) => customer.country !== 'India';

export const PaymentForm: React.FC<PaymentFormProps> = ({
  invoice,
  customer,
  onSave,
  onCancel,
}) => {
  const foreign = isForeignInvoice(customer);
  const balance = invoice.total_amount - (invoice.paid_amount || 0);

  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    // Foreign fields
    amount: balance,
    exchange_rate: '' as string | number,
    amount_inr: '' as string | number,
    purpose_code: 'P1107',
    deal_id: '',
    sender_bank: '',
    // Domestic fields
    payment_method: 'NEFT' as Payment['payment_method'],
    reference_number: '',
    // Shared
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculate INR equivalent when amount or exchange_rate changes
  useEffect(() => {
    if (foreign) {
      const amt = Number(formData.amount) || 0;
      const rate = Number(formData.exchange_rate) || 0;
      if (amt > 0 && rate > 0) {
        setFormData(prev => ({ ...prev, amount_inr: parseFloat((amt * rate).toFixed(2)) }));
      } else {
        setFormData(prev => ({ ...prev, amount_inr: '' }));
      }
    }
  }, [formData.amount, formData.exchange_rate, foreign]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = Number(formData.amount);
    if (!amount || amount <= 0) { setError('Received amount must be greater than zero.'); return; }
    if (amount > invoice.total_amount * 1.05) {
      setError(`Amount exceeds invoice total by more than 5%. Invoice total: ${invoice.total_amount.toFixed(2)} ${invoice.currency}`);
      return;
    }
    if (foreign && !Number(formData.exchange_rate)) { setError('Exchange rate is required for foreign currency payments.'); return; }
    if (!foreign && !formData.reference_number.trim()) { setError('UTR / Reference number is required.'); return; }

    setSaving(true);

    const payload: Omit<Payment, 'id' | 'user_id' | 'created_at'> = {
      invoice_id: invoice.id,
      payment_date: formData.payment_date,
      amount,
      amount_inr: foreign ? Number(formData.amount_inr) || 0 : amount,
      payment_method: foreign ? 'SWIFT' : formData.payment_method,
      bank_name: 'Federal Bank',
      reference_number: formData.reference_number || `PAY-${Date.now()}`,
      exchange_rate: foreign ? Number(formData.exchange_rate) || undefined : undefined,
      conversion_date: foreign ? formData.payment_date : undefined,
      sender_bank: foreign ? formData.sender_bank || undefined : undefined,
      notes: formData.notes || undefined,
      // Extended fields (purpose_code, deal_id stored in notes if columns absent; overridden by 2C migration)
      ...(foreign ? {
        purpose_code: formData.purpose_code,
        deal_id: formData.deal_id || undefined,
      } : {}),
    } as any;

    onSave(payload);
  };

  const inputClass = 'w-full neo-input rounded-xl p-4 text-sm font-medium placeholder-text-tertiary focus:border-money-gold/30 transition-all';
  const labelClass = 'block text-xs font-bold text-[#8ba696] mb-2 ml-1 uppercase tracking-wider';
  const sym = { USD: '$', INR: '₹', GBP: '£', EUR: '€', CAD: 'C$' }[invoice.currency] ?? invoice.currency;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-h-[72vh] overflow-y-auto custom-scrollbar pr-2">

      {/* Invoice summary strip */}
      <div className="glass-panel rounded-xl p-4 border border-money-gold/20 flex justify-between items-center">
        <div>
          <p className="text-xs text-text-tertiary uppercase tracking-wider">Invoice</p>
          <p className="font-bold text-money-green text-sm">{invoice.invoice_number}</p>
          <p className="text-xs text-text-secondary mt-0.5">{customer.name}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">Balance Due</p>
          <p className="font-serif font-bold text-money-gold text-lg">{sym}{balance.toFixed(2)}</p>
          <p className="text-xs text-text-secondary">{invoice.currency} invoice</p>
        </div>
      </div>

      {/* Payment date */}
      <div>
        <label className={labelClass}>Payment Date *</label>
        <input type="date" name="payment_date" required value={formData.payment_date} onChange={handleChange} className={inputClass} />
      </div>

      {/* ======================================================
          FOREIGN CURRENCY FLOW (USD/GBP/CAD etc.)
         ====================================================== */}
      {foreign && (
        <>
          <div className="glass-panel rounded-xl p-3 border border-[#3e5c76]/40">
            <p className="text-xs font-bold text-[#7eb8e0] uppercase tracking-wider flex items-center gap-2">
              <i className="fas fa-globe"></i>
              Foreign Inward Remittance — {invoice.currency}
            </p>
          </div>

          {/* Received amount */}
          <div>
            <label className={labelClass}>Amount Received ({invoice.currency}) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm font-bold">{sym}</span>
              <input
                type="number" name="amount" step="0.01" min="0.01" required
                value={formData.amount}
                onChange={handleChange}
                className={`${inputClass} pl-8 font-mono text-base`}
                placeholder={balance.toFixed(2)}
              />
            </div>
            {Number(formData.amount) !== balance && Number(formData.amount) > 0 && (
              <p className="text-xs text-yellow-400 mt-1 ml-1">
                Note: Differs from balance ({sym}{balance.toFixed(2)}) — this is normal due to bank charges.
              </p>
            )}
          </div>

          {/* Exchange rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Exchange Rate (₹ per 1 {invoice.currency}) *</label>
              <input
                type="number" name="exchange_rate" step="0.0001" min="0.0001" required
                value={formData.exchange_rate}
                onChange={handleChange}
                className={`${inputClass} font-mono`}
                placeholder="e.g. 84.5200"
              />
            </div>
            <div>
              <label className={labelClass}>INR Equivalent (auto-calculated)</label>
              <input
                type="text" readOnly
                value={formData.amount_inr ? `₹${Number(formData.amount_inr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                className={`${inputClass} opacity-70 cursor-not-allowed text-money-green font-mono`}
              />
            </div>
          </div>

          {/* Deal ID + Sender Bank */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Deal ID (Bank Reference)</label>
              <input
                type="text" name="deal_id"
                value={formData.deal_id}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. C934"
              />
            </div>
            <div>
              <label className={labelClass}>Remitter / Sender Bank</label>
              <input
                type="text" name="sender_bank"
                value={formData.sender_bank}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. ING Bank, Amsterdam"
              />
            </div>
          </div>

          {/* Purpose code */}
          <div>
            <label className={labelClass}>RBI Purpose Code</label>
            <div className="flex gap-3 items-center">
              <input
                type="text" name="purpose_code"
                value={formData.purpose_code}
                onChange={handleChange}
                className={`${inputClass} flex-1 font-mono`}
                placeholder="P1107"
              />
              <div className="glass-panel rounded-xl px-3 py-2 text-xs text-text-secondary border border-[#85bb65]/10 whitespace-nowrap">
                P1107 = Exam services
              </div>
            </div>
          </div>
        </>
      )}

      {/* ======================================================
          DOMESTIC INR FLOW
         ====================================================== */}
      {!foreign && (
        <>
          <div className="glass-panel rounded-xl p-3 border border-[#85bb65]/30">
            <p className="text-xs font-bold text-money-green uppercase tracking-wider flex items-center gap-2">
              <i className="fas fa-university"></i>
              Domestic Payment — INR
            </p>
          </div>

          {/* Amount */}
          <div>
            <label className={labelClass}>Amount Received (₹) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">₹</span>
              <input
                type="number" name="amount" step="0.01" min="0.01" required
                value={formData.amount}
                onChange={handleChange}
                className={`${inputClass} pl-8 font-mono text-base`}
                placeholder={balance.toFixed(2)}
              />
            </div>
          </div>

          {/* Payment method + Reference */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Payment Method *</label>
              <div className="relative">
                <select name="payment_method" value={formData.payment_method} onChange={handleChange} className={`${inputClass} appearance-none cursor-pointer`}>
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
                <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none text-xs"></i>
              </div>
            </div>
            <div>
              <label className={labelClass}>UTR / Reference No. *</label>
              <input
                type="text" name="reference_number" required
                value={formData.reference_number}
                onChange={handleChange}
                className={inputClass}
                placeholder="UTR or transaction ref"
              />
            </div>
          </div>
        </>
      )}

      {/* Notes — shared */}
      <div>
        <label className={labelClass}>Notes (optional)</label>
        <textarea
          name="notes" rows={2}
          value={formData.notes}
          onChange={handleChange}
          className={`${inputClass} resize-none`}
          placeholder="Any additional details..."
        />
      </div>

      {/* Error */}
      {error && (
        <div className="glass-panel rounded-xl p-3 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 pt-4 border-t border-[#85bb65]/10 justify-end">
        <button type="button" onClick={onCancel} className="neo-btn px-6 py-3 rounded-xl text-sm font-bold text-text-secondary hover:text-white transition-all">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="neo-btn px-8 py-3 rounded-xl text-sm font-bold text-money-gold border border-money-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
          Record Payment
        </button>
      </div>
    </form>
  );
};
