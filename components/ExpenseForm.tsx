import React, { useState, useEffect } from 'react';
import { Category, Expense, LocationType } from '../types';

interface ExpenseFormProps {
  expense?: Expense | null;
  nextId: string; // Calculated ID from parent
  categories: Category[];
  location: LocationType;
  onSave: (expense: Partial<Expense>) => void;
  onCancel: () => void;
  primaryColor: string;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ 
  expense, nextId, categories, location, onSave, onCancel, primaryColor 
}) => {
  const [formData, setFormData] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    amount: '' as any,
    category: categories[0]?.name || '',
    description: '',
    // Hidden defaults
    paid_by: nextId, // Using paid_by to store the Auto-Generated Expense Number
    payment_mode: 'Cash',
    settled_y_n: true,
    location: location,
  });

  useEffect(() => {
    if (expense) {
      setFormData(expense);
    } else {
       setFormData(prev => ({ 
         ...prev, 
         location: location, 
         category: categories[0]?.name || '',
         paid_by: nextId 
       })); 
    }
  }, [expense, location, categories, nextId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'amount') {
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const inputClass = "w-full neo-input rounded-xl p-4 text-sm font-medium placeholder-text-tertiary";
  const labelClass = "block text-xs font-bold text-text-secondary mb-2 ml-1 uppercase tracking-wider";

  // Determine displayed ID (Edit mode uses existing, New mode uses calculated)
  const displayId = expense ? expense.paid_by : nextId;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" style={{ '--active-color': primaryColor } as React.CSSProperties}>
      
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Date</label>
          <input 
            type="date" name="date" required
            value={formData.date} onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Expense No.</label>
          <input 
            type="text" 
            readOnly
            value={displayId}
            className={`${inputClass} opacity-70 cursor-not-allowed border border-money-gold/20 text-money-gold`}
            title="Auto-generated ID"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Category</label>
        <div className="relative">
            <select 
            name="category" required
            value={formData.category} onChange={handleChange}
            className={`${inputClass} appearance-none cursor-pointer`}
            >
                {categories.map(c => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                ))}
            </select>
            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none text-xs"></i>
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea 
          name="description" 
          rows={3}
          value={formData.description} 
          onChange={handleChange}
          className={`${inputClass} resize-none`}
          placeholder="Enter expense details..."
        ></textarea>
      </div>

      <div>
        <label className={labelClass}>Amount (₹)</label>
        <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-serif">₹</span>
            <input 
                type="number" name="amount" required step="0.01"
                value={formData.amount} onChange={handleChange}
                className={`${inputClass} pl-8 text-lg font-serif tracking-wider`}
                placeholder="0.00"
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
            Confirm Transaction
        </button>
      </div>
    </form>
  );
};