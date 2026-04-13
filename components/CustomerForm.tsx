import React, { useState, useEffect } from 'react';
import { Customer, CustomerFormData } from '../types';

interface CustomerFormProps {
  customer?: Customer | null;
  onSave: (data: any) => void;
  onCancel: () => void;
  primaryColor: string;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  customer,
  onSave,
  onCancel,
  primaryColor,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    country: 'USA' as Customer['country'],
    payment_terms: 30,
    currency: 'USD' as Customer['currency'],
    gst_number: '',
    tan_number: '',
    status: 'active' as Customer['status'],
    notes: '',
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        contact_person: customer.contact_person || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        country: customer.country || 'USA',
        payment_terms: customer.payment_terms || 30,
        currency: customer.currency || 'USD',
        gst_number: customer.gst_number || '',
        tan_number: customer.tan_number || '',
        status: customer.status || 'active',
        notes: customer.notes || '',
      });
    }
  }, [customer]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value as Customer['country'];
    setFormData((prev) => ({
      ...prev,
      country,
      // Auto-set currency based on country
      currency: country === 'India' ? 'INR' : 
                country === 'USA' ? 'USD' :
                country === 'UK' ? 'GBP' :
                country === 'Canada' ? 'CAD' : 'USD',
      // Clear GST for foreign clients
      gst_number: country === 'India' ? prev.gst_number : '',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const inputClass =
    'w-full neo-input rounded-xl p-4 text-sm font-medium placeholder-text-tertiary focus:border-money-gold/30 transition-all';
  const labelClass =
    'block text-xs font-bold text-text-secondary mb-2 ml-1 uppercase tracking-wider';

  const isIndian = formData.country === 'India';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className={labelClass}>Client / Company Name *</label>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g., Prometric Testing Services"
            value={formData.name}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Country *</label>
          <div className="relative">
            <select
              name="country"
              required
              value={formData.country}
              onChange={handleCountryChange}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              <option value="USA">🇺🇸 United States</option>
              <option value="UK">🇬🇧 United Kingdom</option>
              <option value="Canada">🇨🇦 Canada</option>
              <option value="India">🇮🇳 India</option>
              <option value="Other">🌍 Other</option>
            </select>
            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none text-xs"></i>
          </div>
        </div>

        <div>
          <label className={labelClass}>Default Currency *</label>
          <div className="relative">
            <select
              name="currency"
              required
              value={formData.currency}
              onChange={handleChange}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD (C$)</option>
            </select>
            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none text-xs"></i>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Email Address *</label>
          <input
            type="email"
            name="email"
            required
            placeholder="accounts@prometric.com"
            value={formData.email}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Contact Person</label>
          <input
            type="text"
            name="contact_person"
            placeholder="Accounts Manager Name"
            value={formData.contact_person}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Phone Number</label>
          <input
            type="tel"
            name="phone"
            placeholder="+1 (555) 000-0000"
            value={formData.phone}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Address</label>
          <textarea
            name="address"
            rows={2}
            placeholder="Billing address"
            value={formData.address}
            onChange={handleChange}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className={labelClass}>Payment Terms (Days)</label>
          <div className="relative">
            <select
              name="payment_terms"
              value={formData.payment_terms}
              onChange={handleChange}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              <option value={15}>Net 15 days</option>
              <option value={30}>Net 30 days</option>
              <option value={45}>Net 45 days</option>
              <option value={60}>Net 60 days</option>
            </select>
            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none text-xs"></i>
          </div>
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <div className="relative">
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              <option value="active">✅ Active</option>
              <option value="inactive">⏸️ Inactive</option>
            </select>
            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none text-xs"></i>
          </div>
        </div>

        {isIndian && (
          <>
            <div>
              <label className={labelClass}>GST Number</label>
              <input
                type="text"
                name="gst_number"
                placeholder="27AAPFU0939F1ZV"
                value={formData.gst_number}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>TAN Number</label>
              <input
                type="text"
                name="tan_number"
                placeholder="Required for TDS"
                value={formData.tan_number}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </>
        )}

        <div className="md:col-span-2">
          <label className={labelClass}>Notes</label>
          <textarea
            name="notes"
            rows={2}
            placeholder="Any special notes about this client..."
            value={formData.notes}
            onChange={handleChange}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4 mt-2 border-t border-[#85bb65]/10 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="neo-btn px-6 py-3.5 rounded-xl text-sm font-bold text-text-secondary hover:text-white transition-all active:scale-95"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="neo-btn px-8 py-3.5 rounded-xl text-sm font-bold text-money-gold transition-all active:scale-95 border border-money-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]"
        >
          {customer ? 'Update Client' : 'Create Client'}
        </button>
      </div>
    </form>
  );
};