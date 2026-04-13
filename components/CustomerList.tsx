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
        <div className="glass-panel rounded-xl p-4 border border-[#85bb65]/10">
          <p className="text-[10px] font-bold text-money-green/60 uppercase tracking-wider">Total Clients</p>
          <p className="text-2xl font-bold text-white mt-1">{customers.length}</p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-[#85bb65]/10">
          <p className="text-[10px] font-bold text-money-green/60 uppercase tracking-wider">Indian</p>
          <p className="text-2xl font-bold text-white mt-1">{indianCustomers}</p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-[#85bb65]/10">
          <p className="text-[10px] font-bold text-money-green/60 uppercase tracking-wider">Foreign</p>
          <p className="text-2xl font-bold text-white mt-1">{foreignCustomers}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"></i>
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
              viewMode === 'all' ? 'bg-money-green text-[#0c1410]' : 'neo-btn text-text-secondary'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setViewMode('India')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              viewMode === 'India' ? 'bg-money-green text-[#0c1410]' : 'neo-btn text-text-secondary'
            }`}
          >
            India
          </button>
          <button
            onClick={() => setViewMode('Foreign')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              viewMode === 'Foreign' ? 'bg-money-green text-[#0c1410]' : 'neo-btn text-text-secondary'
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
            className="glass-panel rounded-2xl p-5 border border-[#85bb65]/10 hover:border-[#85bb65]/30 transition-all group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getCountryFlag(customer.country)}</span>
                <div>
                  <h3 className="font-bold text-money-paper text-lg">{customer.name}</h3>
                  <p className="text-xs text-text-tertiary">{customer.currency}</p>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                  customer.status === 'active'
                    ? 'bg-money-green/20 text-money-green'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {customer.status}
              </span>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2 text-text-secondary">
                <i className="fas fa-envelope w-4"></i>
                <span className="truncate">{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <i className="fas fa-phone w-4"></i>
                  <span>{customer.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-text-secondary">
                <i className="fas fa-calendar-alt w-4"></i>
                <span>Payment: Net {customer.payment_terms} days</span>
              </div>
              {customer.gst_number && (
                <div className="flex items-center gap-2 text-money-gold">
                  <i className="fas fa-file-invoice w-4"></i>
                  <span>GST: {customer.gst_number}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-[#85bb65]/10">
              <button
                onClick={() => handleEdit(customer)}
                className="flex-1 neo-btn py-2 rounded-lg text-xs font-bold text-text-secondary hover:text-white"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(customer.id!)}
                className="flex-1 neo-btn py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 glass-panel rounded-2xl">
          <i className="fas fa-users text-4xl text-text-tertiary mb-4"></i>
          <p className="text-text-secondary">No clients found</p>
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