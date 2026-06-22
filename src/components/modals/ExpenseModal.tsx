import React, { useState, useEffect } from 'react';
import { FormModal } from './FormModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Expense, LocationType, PaymentMode, Category } from '@/types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: Expense | null;
  categories: Category[];
  nextId: string;
  location: LocationType;
  onSave: (expense: Expense) => void;
}

const paymentModes: PaymentMode[] = ['Card', 'Cash', 'UPI', 'Bank Transfer'];

export function ExpenseModal({
  isOpen,
  onClose,
  expense,
  categories,
  nextId,
  location,
  onSave,
}: ExpenseModalProps) {
  const [form, setForm] = useState<Partial<Expense>>({
    id: '',
    user_id: '',
    location: location,
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: '',
    paid_by: 'Company',
    payment_mode: 'Cash',
    settled_y_n: false,
    description: '',
  });
  const [isSettled, setIsSettled] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  useEffect(() => {
    if (expense) {
      setForm(expense);
      setIsSettled(expense.settled_y_n);
    } else {
      setForm({
        id: nextId,
        user_id: '',
        location: location,
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        category: categories[0]?.name || '',
        paid_by: 'Company',
        payment_mode: 'Cash',
        settled_y_n: false,
        description: '',
      });
      setIsSettled(false);
    }
  }, [expense, nextId, location, categories, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form as Expense);
  };

  const updateField = <K extends keyof Expense>(field: K, value: Expense[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={expense ? 'Edit Expense' : 'Add Expense'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date || ''}
              onChange={(e) => updateField('date', e.target.value)}
              required
            />
          </div>
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            {showNewCategory ? (
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newCategory.trim()) {
                      updateField('category', newCategory.trim());
                      setShowNewCategory(false);
                      setNewCategory('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            ) : (
              <Select
                value={form.category || ''}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowNewCategory(true);
                  } else {
                    updateField('category', e.target.value);
                  }
                }}
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
                <option value="__new__">+ New Category</option>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label>Payment Mode</Label>
            <Select
              value={form.payment_mode || 'Cash'}
              onChange={(e) => updateField('payment_mode', e.target.value as PaymentMode)}
            >
              {paymentModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Paid By</Label>
            <Input
              value={form.paid_by || ''}
              onChange={(e) => updateField('paid_by', e.target.value)}
              placeholder="Person or company"
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

        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={form.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Expense description"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsSettled(!isSettled);
              updateField('settled_y_n', !isSettled);
              if (!isSettled) {
                updateField('settled_date', new Date().toISOString().split('T')[0]);
              } else {
                updateField('settled_date', null);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isSettled
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-surface-elevated text-text-tertiary border border-divider hover:border-money-gold/20'
            }`}
          >
            {isSettled ? 'Settled' : 'Mark as Settled'}
          </button>
          {isSettled && (
            <Input
              type="date"
              value={form.settled_date?.split('T')[0] || ''}
              onChange={(e) => updateField('settled_date', e.target.value)}
              className="w-40"
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="default">
            {expense ? 'Update' : 'Add'} Expense
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
