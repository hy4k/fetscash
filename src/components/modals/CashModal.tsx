import React, { useState, useEffect } from 'react';
import { FormModal } from './FormModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { FetsTransaction, LocationType, TransactionType, Category } from '@/types';
import { CATEGORY_REPLENISHMENT } from '@/constants';

interface CashModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: FetsTransaction | null;
  categories: Category[];
  nextId: string;
  location: LocationType;
  onSave: (transaction: FetsTransaction) => void;
}

const transactionTypes: TransactionType[] = ['replenishment', 'expense', 'adjustment'];

export function CashModal({
  isOpen,
  onClose,
  transaction,
  categories,
  nextId,
  location,
  onSave,
}: CashModalProps) {
  const [form, setForm] = useState<Partial<FetsTransaction>>({
    id: '',
    user_id: '',
    location: location,
    type: 'expense',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    category: '',
  });

  useEffect(() => {
    if (transaction) {
      setForm(transaction);
    } else {
      setForm({
        id: nextId,
        user_id: '',
        location: location,
        type: 'expense',
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        category: categories[0]?.name || '',
      });
    }
  }, [transaction, nextId, location, categories, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form as FetsTransaction);
  };

  const updateField = <K extends keyof FetsTransaction>(field: K, value: FetsTransaction[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isReplenishment = form.type === 'replenishment';

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={transaction ? 'Edit Cash Transaction' : 'Add Cash Transaction'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <Select
              value={form.type || 'expense'}
              onChange={(e) => updateField('type', e.target.value as TransactionType)}
            >
              {transactionTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date || ''}
              onChange={(e) => updateField('date', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount || ''}
              onChange={(e) => updateField('amount', parseFloat(e.target.value) || 0)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Select
              value={form.location || location}
              onChange={(e) => updateField('location', e.target.value as LocationType)}
            >
              <option value="cochin">Cochin</option>
              <option value="calicut">Calicut</option>
            </Select>
          </div>
        </div>

        {!isReplenishment && (
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.category || ''}
              onChange={(e) => updateField('category', e.target.value)}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {isReplenishment && (
          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={CATEGORY_REPLENISHMENT} disabled className="opacity-60" />
          </div>
        )}

        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={form.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Transaction description"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Custom ID</Label>
          <Input
            value={form.custom_id || ''}
            onChange={(e) => updateField('custom_id', e.target.value)}
            placeholder="Optional reference ID"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="default">
            {transaction ? 'Update' : 'Add'} Transaction
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
