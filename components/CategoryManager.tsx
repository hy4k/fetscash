import React, { useState } from 'react';
import { Category } from '../types';

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (name: string) => void;
  onDelete: (id: number) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onAdd, onDelete }) => {
  const [newCategory, setNewCategory] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.trim()) {
      onAdd(newCategory.trim());
      setNewCategory('');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-xs font-bold text-text-secondary mb-2 ml-1 uppercase tracking-wider">New Category Name</label>
          <input 
            type="text" 
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full neo-input rounded-xl p-4 text-sm font-medium placeholder-text-tertiary"
            placeholder="e.g. Marketing, Logistics..."
          />
        </div>
        <button 
          type="submit" 
          disabled={!newCategory.trim()}
          className="neo-btn h-[54px] px-6 rounded-xl text-money-gold font-bold uppercase tracking-wider hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Add
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        {categories.map((cat) => (
          <div key={cat.id} className="flex justify-between items-center p-4 rounded-xl bg-[#131f19] border border-[#85bb65]/10 shadow-inner group hover:border-[#85bb65]/30 transition-all">
            <span className="text-sm font-bold text-money-paper">{cat.name}</span>
            <button 
              onClick={() => cat.id && onDelete(cat.id)}
              className="text-text-tertiary hover:text-red-500 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10"
              title="Remove Category"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};