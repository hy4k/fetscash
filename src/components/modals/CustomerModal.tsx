import React, { useState, useEffect } from 'react';
import { FormModal } from './FormModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Customer, Country, Currency, CustomerStatus } from '@/types';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSave: (customer: Customer) => void;
}

const countries: Country[] = ['India', 'USA', 'UK', 'Canada', 'Other'];
const currencies: Currency[] = ['INR', 'USD', 'EUR', 'GBP', 'CAD'];
const statuses: CustomerStatus[] = ['active', 'inactive'];

export function CustomerModal({
  isOpen,
  onClose,
  customer,
  onSave,
}: CustomerModalProps) {
  const [form, setForm] = useState<Partial<Customer>>({
    id: '',
    user_id: '',
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    country: 'India',
    payment_terms: 30,
    currency: 'INR',
    gst_number: '',
    tan_number: '',
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    if (customer) {
      setForm(customer);
    } else {
      setForm({
        id: '',
        user_id: '',
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        country: 'India',
        payment_terms: 30,
        currency: 'INR',
        gst_number: '',
        tan_number: '',
        status: 'active',
        notes: '',
      });
    }
  }, [customer, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form as Customer);
  };

  const updateField = <K extends keyof Customer>(field: K, value: Customer[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add Customer'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Customer Name</Label>
            <Input
              value={form.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Company or individual name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Contact Person</Label>
            <Input
              value={form.contact_person || ''}
              onChange={(e) => updateField('contact_person', e.target.value)}
              placeholder="Primary contact"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="email@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={form.phone || ''}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="Phone number"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Address</Label>
          <Input
            value={form.address || ''}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Full address"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Country</Label>
            <Select
              value={form.country || 'India'}
              onChange={(e) => updateField('country', e.target.value as Country)}
            >
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
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
            <Label>Payment Terms (days)</Label>
            <Input
              type="number"
              value={form.payment_terms || ''}
              onChange={(e) => updateField('payment_terms', parseInt(e.target.value) || 30)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>GST Number</Label>
            <Input
              value={form.gst_number || ''}
              onChange={(e) => updateField('gst_number', e.target.value)}
              placeholder="GSTIN"
            />
          </div>
          <div className="space-y-2">
            <Label>TAN Number</Label>
            <Input
              value={form.tan_number || ''}
              onChange={(e) => updateField('tan_number', e.target.value)}
              placeholder="TAN"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status || 'active'}
              onChange={(e) => updateField('status', e.target.value as CustomerStatus)}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </div>
        </div>

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
            {customer ? 'Update' : 'Add'} Customer
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
