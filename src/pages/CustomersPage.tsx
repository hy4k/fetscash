import React, { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useInvoices,
} from '@/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingPage } from '@/components/error/LoadingPage';
import { DataTable, Column } from '@/components/data/DataTable';
import { SearchBar } from '@/components/data/SearchBar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CustomerModal } from '@/components/modals/CustomerModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { Customer } from '@/types';

export default function CustomersPage() {
  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isLoading);

  const { data: customers = [], isLoading: isCustomersLoading } = useCustomers();
  const { data: invoices = [] } = useInvoices();

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const columns: Column<Customer>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        accessor: (c) => <span className="font-semibold text-text-primary">{c.name}</span>,
      },
      {
        key: 'email',
        header: 'Email',
        accessor: (c) => <span className="text-text-secondary">{c.email}</span>,
      },
      {
        key: 'country',
        header: 'Country',
        accessor: (c) => c.country,
      },
      {
        key: 'currency',
        header: 'Currency',
        accessor: (c) => <Badge>{c.currency}</Badge>,
      },
      {
        key: 'payment_terms',
        header: 'Payment Terms',
        accessor: (c) => `${c.payment_terms} days`,
      },
      {
        key: 'status',
        header: 'Status',
        accessor: (c) => (
          <Badge variant={c.status === 'active' ? 'success' : 'secondary'}>
            {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
          </Badge>
        ),
      },
    ],
    []
  );

  const handleAdd = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
  };

  const handleConfirmDelete = () => {
    if (!customerToDelete) return;
    const hasInvoices = invoices.some((inv) => inv.customer_id === customerToDelete.id);
    if (hasInvoices) {
      toast.error('Cannot delete customer with existing invoices. Please delete invoices first.');
      setCustomerToDelete(null);
      return;
    }
    deleteCustomer.mutate(customerToDelete.id);
    setCustomerToDelete(null);
  };

  const handleSave = (customer: Customer) => {
    if (customer.id) {
      updateCustomer.mutate({ id: customer.id, updates: customer });
    } else {
      const { id, created_at, updated_at, ...newCustomer } = customer;
      createCustomer.mutate(newCustomer as Omit<Customer, 'id' | 'created_at' | 'updated_at'>);
    }
    setIsModalOpen(false);
  };

  if (isAuthLoading || isCustomersLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return (
      <div className="page-enter flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-divider flex items-center justify-center mx-auto mb-4">
            <Users size={24} className="text-text-muted" />
          </div>
          <h2 className="text-lg font-semibold text-money-paper">Connection Required</h2>
          <p className="text-sm text-text-secondary mt-1">Please sign in to view your clients.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Clients"
        actions={
          <Button onClick={handleAdd}>
            <Users size={16} className="mr-2" />
            Add Client
          </Button>
        }
      />

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by name, email, country"
      />

      <div className="bg-surface rounded-2xl border border-divider overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredCustomers}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          emptyMessage="No customers found"
          emptyIcon={
            <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-divider flex items-center justify-center">
              <Users size={24} className="text-text-muted" />
            </div>
          }
        />
      </div>

      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={selectedCustomer}
        onSave={handleSave}
      />

      <ConfirmDialog
        isOpen={!!customerToDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete ${customerToDelete?.name}? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setCustomerToDelete(null)}
      />
    </div>
  );
}
