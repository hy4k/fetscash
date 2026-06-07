import React, { useState } from 'react';
import { Customer } from '../types';
import { CustomerForm } from './CustomerForm';
import { Modal } from './Modal';

interface CustomerListProps {
  customers: Customer[];
  onAdd: (customer: Omit<Customer, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onUpdate: (id: string, customer: Partial<Customer>) => void;
  onDelete: (id: string) => void;
  primaryColor: string;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  onAdd,
  onUpdate,
  onDelete,
  primaryColor,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'India' | 'Foreign'>('all');

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (viewMode === 'all') return matchesSearch;
    if (viewMode === 'India') return c.country === 'India' && matchesSearch;
    return c.country !== 'India' && matchesSearch;
  });

  const getCountryFlag = (country: string) => {
    const flags: { [key: string]: string } = {
      'India': '🇮🇳',
      'USA': '🇺🇸',
      'UK': '🇬🇧',
      'Canada': '🇨🇦',
      'Other': '🌍',
    };
    return flags[country] || '🌍';
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const indianCustomers = customers.filter(c => c.country === 'India').length;
  const foreignCustomers = customers.filter(c => c.country !== 'India').length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl p-5 border-l-2 border-money-green/20">
          <p className="text-[11px] font-medium text-text-muted uppercase tracking-widest">Total Clients</p>
          <p className="text-2xl font-semibold text-money-paper mt-1.5">{customers.length}</p>
        </div>
        <div className="glass-panel rounded-2xl p-5 border-l-2 border-money-green/20">
          <p className="text-[11px] font-medium text-text-muted uppercase tracking-widest">Indian</p>
          <p className="text-2xl font-semibold text-money-paper mt-1.5">{indianCustomers}</p>
        </div>
        <div className="glass-panel rounded-2xl p-5 border-l-2 border-money-green/20">
          <p className="text-[11px] font-medium text-text-muted uppercase tracking-widest">Foreign</p>
          <p className="text-2xl font-semibold text-money-paper mt-1.5">{foreignCustomers}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"></i>
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neo-input w-full rounded-xl py-3 pl-11 pr-4 text-sm"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              viewMode === 'all' ? 'bg-money-green/10 border border-money-green/20 text-money-green' : 'neo-btn text-text-secondary'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setViewMode('India')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              viewMode === 'India' ? 'bg-money-green/10 border border-money-green/20 text-money-green' : 'neo-btn text-text-secondary'
            }`}
          >
            India
          </button>
          <button
            onClick={() => setViewMode('Foreign')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              viewMode === 'Foreign' ? 'bg-money-green/10 border border-money-green/20 text-money-green' : 'neo-btn text-text-secondary'
            }`}
          >
            Foreign
          </button>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="neo-btn px-6 py-3 rounded-xl text-xs font-bold text-money-gold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap"
        >
          <i className="fas fa-plus"></i> Add Client
        </button>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            className="glass-panel rounded-2xl p-5 border border-divider hover:bg-white/[0.02] transition-colors group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getCountryFlag(customer.country)}</span>
                <div>
                  <h3 className="font-bold text-money-paper text-lg leading-tight">{customer.name}</h3>
                  <p className="text-xs text-text-tertiary mt-0.5">{customer.currency}</p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                  customer.status === 'active'
                    ? 'bg-money-green/5 border-money-green/25 text-money-green'
                    : 'bg-red-400/5 border-red-400/25 text-red-400'
                }`}
              >
                {customer.status}
              </span>
            </div>

            <div className="space-y-3 text-sm mb-4">
              <div className="flex items-center gap-3 text-text-secondary">
                <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-divider flex items-center justify-center shrink-0">
                  <i className="fas fa-envelope text-xs text-text-muted"></i>
                </div>
                <span className="truncate">{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-3 text-text-secondary">
                  <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-divider flex items-center justify-center shrink-0">
                    <i className="fas fa-phone text-xs text-text-muted"></i>
                  </div>
                  <span>{customer.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-text-secondary">
                <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-divider flex items-center justify-center shrink-0">
                  <i className="fas fa-calendar-alt text-xs text-text-muted"></i>
                </div>
                <span>Payment: Net {customer.payment_terms} days</span>
              </div>
              {customer.gst_number && (
                <div className="flex items-center gap-3 text-money-gold">
                  <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-money-gold/15 flex items-center justify-center shrink-0">
                    <i className="fas fa-file-invoice text-xs text-money-gold/70"></i>
                  </div>
                  <span>GST: {customer.gst_number}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-divider">
              <button
                onClick={() => handleEdit(customer)}
                className="flex-1 neo-btn py-2.5 rounded-lg text-xs font-bold text-text-secondary hover:text-money-paper transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(customer.id!)}
                className="flex-1 neo-btn py-2.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 glass-panel rounded-2xl border border-divider">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-divider flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-users text-2xl text-text-muted"></i>
          </div>
          <p className="text-text-secondary font-medium">No clients found</p>
          <p className="text-xs text-text-tertiary mt-2">Add your first client to get started</p>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCustomer ? 'Edit Client' : 'New Client'}
      >
        <CustomerForm
          customer={editingCustomer}
          onSave={(data) => {
            if (editingCustomer) {
              onUpdate(editingCustomer.id!, data);
            } else {
              onAdd(data);
            }
            handleCloseModal();
          }}
          onCancel={handleCloseModal}
          primaryColor={primaryColor}
        />
      </Modal>
    </div>
  );
};
