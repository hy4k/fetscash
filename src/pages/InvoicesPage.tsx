import React, { useMemo, useState } from 'react';
import { FileText, Edit2, Trash2, DollarSign } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAppStore } from '@/stores/useAppStore';
import {
  useInvoices,
  useCustomers,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useRecordPayment,
} from '@/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingPage } from '@/components/error/LoadingPage';
import { DataTable, Column } from '@/components/data/DataTable';
import { SearchBar } from '@/components/data/SearchBar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { InvoiceModal } from '@/components/modals/InvoiceModal';
import { PaymentModal } from '@/components/modals/PaymentModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { Invoice, Payment } from '@/types';
import { formatCurrency, formatDate, formatMonthLabel } from '@/utils/formatters';
import { cn } from '@/lib/utils';

export default function InvoicesPage() {
  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const location = useAppStore((s) => s.location);

  const { data: invoices = [], isLoading: isInvoicesLoading } = useInvoices();
  const { data: customers = [], isLoading: isCustomersLoading } = useCustomers();

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const recordPayment = useRecordPayment();

  const [tab, setTab] = useState<'invoices' | 'monthly_revenue'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [customers]);

  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        (customerMap.get(inv.customer_id) || '').toLowerCase().includes(q) ||
        (inv.notes || '').toLowerCase().includes(q) ||
        inv.service_lines.some((sl) => sl.description.toLowerCase().includes(q))
    );
  }, [invoices, searchQuery, customerMap]);

  const monthlyData = useMemo(() => {
    const map = new Map<
      string,
      {
        month: string;
        invoiceCount: number;
        totalRevenue: number;
        paidAmount: number;
        pendingAmount: number;
      }
    >();

    invoices.forEach((invoice) => {
      const month = formatMonthLabel(new Date(invoice.invoice_date));
      const existing = map.get(month) || {
        month,
        invoiceCount: 0,
        totalRevenue: 0,
        paidAmount: 0,
        pendingAmount: 0,
      };
      existing.invoiceCount += 1;
      existing.totalRevenue += invoice.total_amount;
      existing.paidAmount += invoice.paid_amount || 0;
      existing.pendingAmount = existing.totalRevenue - existing.paidAmount;
      map.set(month, existing);
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Array.from(map.values()).sort((a, b) => months.indexOf(a.month) - months.indexOf(b.month));
  }, [invoices]);

  const getStatusVariant = (
    status: Invoice['status']
  ): { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success'; className?: string } => {
    switch (status) {
      case 'paid':
        return { variant: 'success' };
      case 'sent':
        return { variant: 'default' };
      case 'overdue':
        return { variant: 'destructive' };
      case 'partially_paid':
        return { variant: 'default', className: 'text-amber-400' };
      case 'draft':
        return { variant: 'secondary' };
      default:
        return { variant: 'default' };
    }
  };

  const handleAddInvoice = () => {
    setSelectedInvoice(null);
    setIsInvoiceModalOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceModalOpen(true);
  };

  const handleRecordPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentModalOpen(true);
  };

  const handleDeleteClick = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
  };

  const handleConfirmDelete = () => {
    if (!invoiceToDelete) return;
    deleteInvoice.mutate(invoiceToDelete.id);
    setInvoiceToDelete(null);
  };

  const handleSaveInvoice = (invoice: Invoice) => {
    if (invoice.id) {
      updateInvoice.mutate({
        id: invoice.id,
        updates: invoice,
        serviceLines: invoice.service_lines,
      });
    } else {
      const { id, created_at, updated_at, service_lines, ...newInvoice } = invoice;
      createInvoice.mutate({
        invoice: newInvoice as Omit<Invoice, 'id' | 'created_at' | 'updated_at'>,
        serviceLines: service_lines,
      });
    }
    setIsInvoiceModalOpen(false);
  };

  const handleSavePayment = (payment: Payment) => {
    if (!selectedInvoice) return;
    recordPayment.mutate({
      invoiceId: selectedInvoice.id,
      paidAmount: payment.amount,
      paymentDate: payment.payment_date,
      reference: payment.reference_number,
      totalAmount: selectedInvoice.total_amount,
    });
    setIsPaymentModalOpen(false);
  };

  if (isAuthLoading || isInvoicesLoading || isCustomersLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return (
      <div className="page-enter flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-divider flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-text-muted" />
          </div>
          <h2 className="text-lg font-semibold text-money-paper">Connection Required</h2>
          <p className="text-sm text-text-secondary mt-1">Please sign in to view your invoices.</p>
        </div>
      </div>
    );
  }

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice Number',
      accessor: (inv) => <span className="font-semibold text-money-green">{inv.invoice_number}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      accessor: (inv) => customerMap.get(inv.customer_id) || 'Unknown',
    },
    {
      key: 'invoice_date',
      header: 'Date',
      accessor: (inv) => formatDate(inv.invoice_date),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      accessor: (inv) => formatDate(inv.due_date),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      accessor: (inv) => (
        <span className="font-semibold">{formatCurrency(inv.total_amount, inv.currency)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (inv) => {
        const { variant, className } = getStatusVariant(inv.status);
        return (
          <Badge variant={variant} className={className}>
            {inv.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </Badge>
        );
      },
    },
    {
      key: 'paid',
      header: 'Paid',
      accessor: (inv) => formatCurrency(inv.paid_amount || 0, inv.currency),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      accessor: (inv) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => handleEditInvoice(inv)}
            className="w-8 h-8 rounded-lg hover:bg-money-gold/5 text-text-tertiary hover:text-money-gold transition-colors"
          >
            <Edit2 size={14} className="mx-auto" />
          </button>
          <button
            onClick={() => handleRecordPayment(inv)}
            className="w-8 h-8 rounded-lg hover:bg-money-gold/5 text-text-tertiary hover:text-money-gold transition-colors"
          >
            <DollarSign size={14} className="mx-auto" />
          </button>
          <button
            onClick={() => handleDeleteClick(inv)}
            className="w-8 h-8 rounded-lg hover:bg-red-500/5 text-text-tertiary hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} className="mx-auto" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Invoices"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-surface rounded-xl border border-divider p-1">
              <button
                onClick={() => setTab('invoices')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  tab === 'invoices'
                    ? 'bg-surface-elevated text-money-gold'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                Invoices
              </button>
              <button
                onClick={() => setTab('monthly_revenue')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  tab === 'monthly_revenue'
                    ? 'bg-surface-elevated text-money-gold'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                Monthly Revenue
              </button>
            </div>
            <Button onClick={handleAddInvoice}>
              <FileText size={16} className="mr-2" />
              New Invoice
            </Button>
          </div>
        }
      />

      {tab === 'invoices' && (
        <>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search invoices..."
          />

          <div className="bg-surface rounded-2xl border border-divider overflow-hidden">
            <DataTable
              columns={invoiceColumns}
              data={filteredInvoices}
              emptyMessage="No invoices found"
              emptyIcon={
                <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-divider flex items-center justify-center">
                  <FileText size={24} className="text-text-muted" />
                </div>
              }
            />
          </div>
        </>
      )}

      {tab === 'monthly_revenue' && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-highlight/50 border-b border-divider">
                  <tr>
                    <th className="px-5 py-3.5 text-[10px] font-black text-text-tertiary uppercase tracking-wider text-left">
                      Month
                    </th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-text-tertiary uppercase tracking-wider text-right">
                      Invoice Count
                    </th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-text-tertiary uppercase tracking-wider text-right">
                      Total Revenue
                    </th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-text-tertiary uppercase tracking-wider text-right">
                      Paid Amount
                    </th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-text-tertiary uppercase tracking-wider text-right">
                      Pending Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {monthlyData.map((row) => (
                    <tr key={row.month} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-xs text-left font-medium text-text-primary">
                        {row.month}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-right text-text-secondary">
                        {row.invoiceCount}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-right font-semibold text-money-gold">
                        {formatCurrency(row.totalRevenue, 'INR')}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-right text-green-400">
                        {formatCurrency(row.paidAmount, 'INR')}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-right text-amber-400">
                        {formatCurrency(row.pendingAmount, 'INR')}
                      </td>
                    </tr>
                  ))}
                  {monthlyData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-xs text-text-tertiary">
                        No revenue data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoice={selectedInvoice}
        customers={customers}
        userId={user.id}
        location={location}
        onSave={handleSaveInvoice}
      />

      {selectedInvoice && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          invoice={selectedInvoice}
          onSave={handleSavePayment}
        />
      )}

      <ConfirmDialog
        isOpen={!!invoiceToDelete}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${invoiceToDelete?.invoice_number}? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setInvoiceToDelete(null)}
      />
    </div>
  );
}
