import React, { useState, useMemo } from 'react';
import { Invoice, Customer, InvoiceStatus, LocationType, Payment } from '../types';
import { InvoiceForm } from './InvoiceForm';
import { PaymentForm } from './PaymentForm';
import { Modal } from './Modal';
import { generateInvoicePDF } from '../utils/invoicePdf';
import { downloadRemittancePDF } from '../utils/remittancePdf';

interface InvoiceListProps {
  invoices: Invoice[];
  customers: Customer[];
  userId: string;
  location: LocationType;
  onAdd: (invoice: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onUpdate: (id: string, invoice: Partial<Invoice>) => void;
  onDelete: (id: string) => void;
  onRecordPayment: (invoiceId: string, payment: Omit<Payment, 'id' | 'user_id' | 'created_at'>) => void;
  primaryColor: string;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  customers,
  userId,
  location,
  onAdd,
  onUpdate,
  onDelete,
  primaryColor,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  const getStatusColor = (status: InvoiceStatus) => {
    const colors: { [key: string]: string } = {
      draft: 'bg-gray-500',
      sent: 'bg-blue-500',
      paid: 'bg-money-green',
      overdue: 'bg-red-500',
      partially_paid: 'bg-yellow-500',
      cancelled: 'bg-gray-700',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: InvoiceStatus) => {
    const labels: { [key: string]: string } = {
      draft: 'Draft',
      sent: 'Sent',
      paid: 'Paid',
      overdue: 'Overdue',
      partially_paid: 'Partial',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || 'Unknown Client';
  };

  const getCustomerCountry = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.country || 'Other';
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const customerName = getCustomerName(inv.customer_id).toLowerCase();
      const matchesSearch =
        customerName.includes(searchQuery.toLowerCase()) ||
        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchesCustomer = customerFilter === 'all' || inv.customer_id === customerFilter;
      return matchesSearch && matchesStatus && matchesCustomer;
    });
  }, [invoices, searchQuery, statusFilter, customerFilter, customers]);

  // Statistics
  const stats = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPaid = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPending = invoices
      .filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.total_amount, 0);
    const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length;

    return { totalInvoiced, totalPaid, totalPending, overdueCount };
  }, [invoices]);

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingInvoice(null);
  };

  const handleOpenPaymentModal = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentInvoice(null);
  };

  const handleSavePayment = (paymentData: Omit<Payment, 'id' | 'user_id' | 'created_at'>) => {
    if (!paymentInvoice) return;
    onRecordPayment(paymentInvoice.id, paymentData);
    handleClosePaymentModal();
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    const customer = customers.find((c) => c.id === invoice.customer_id);
    if (!customer) return;

    try {
      const pdfBlob = await generateInvoicePDF(invoice, customer);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleDownloadRemittancePDF = (invoice: Invoice) => {
    const customer = customers.find((c) => c.id === invoice.customer_id);
    if (!customer) return;
    if (!invoice.paid_amount || !invoice.paid_date) {
      alert('Payment date and amount are required to generate remittance PDF.');
      return;
    }

    try {
      // Create a Payment object from the invoice's paid data
      const payment: Payment = {
        id: `payment-${invoice.id}`,
        user_id: '',
        invoice_id: invoice.id,
        payment_date: invoice.paid_date,
        amount: invoice.paid_amount,
        amount_inr: invoice.inr_equivalent || invoice.paid_amount,
        payment_method: 'Bank Transfer',
        bank_name: 'Federal Bank',
        reference_number: invoice.payment_reference || '—',
      };

      downloadRemittancePDF(payment, invoice, customer);
    } catch (error) {
      console.error('Failed to generate remittance PDF:', error);
      alert('Failed to generate remittance PDF. Please try again.');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      INR: '₹',
      EUR: '€',
      GBP: '£',
      CAD: 'C$',
    };
    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-4 border border-[#85bb65]/10">
          <p className="text-[10px] font-bold text-money-green/60 uppercase tracking-wider">Total Invoiced</p>
          <p className="text-xl font-bold text-white mt-1">{formatCurrency(stats.totalInvoiced, 'USD')}</p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-[#85bb65]/10">
          <p className="text-[10px] font-bold text-money-green/60 uppercase tracking-wider">Total Paid</p>
          <p className="text-xl font-bold text-money-green mt-1">{formatCurrency(stats.totalPaid, 'USD')}</p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-[#85bb65]/10">
          <p className="text-[10px] font-bold text-money-green/60 uppercase tracking-wider">Pending</p>
          <p className="text-xl font-bold text-money-gold mt-1">{formatCurrency(stats.totalPending, 'USD')}</p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-[#85bb65]/10">
          <p className="text-[10px] font-bold text-money-green/60 uppercase tracking-wider">Overdue</p>
          <p className={`text-xl font-bold mt-1 ${stats.overdueCount > 0 ? 'text-red-400' : 'text-white'}`}>
            {stats.overdueCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"></i>
          <input
            type="text"
            placeholder="Search invoices by client or number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neo-input w-full rounded-xl py-3 pl-11 pr-4 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="neo-input rounded-xl px-4 py-3 text-xs font-bold text-text-secondary cursor-pointer"
          >
            <option value="all">All Clients</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
            className="neo-input rounded-xl px-4 py-3 text-xs font-bold text-text-secondary cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="partially_paid">Partial</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="neo-btn px-6 py-3 rounded-xl text-xs font-bold text-money-gold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap"
          >
            <i className="fas fa-plus"></i> New Invoice
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0c1410]/50 border-b border-[#85bb65]/20">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Invoice #</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Client</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Service Month</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Currency</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Amount</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Paid</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Balance</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Due Date</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#85bb65]/5">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <i className="fas fa-file-invoice text-4xl text-text-tertiary mb-4"></i>
                    <p className="text-text-secondary">No invoices found</p>
                    <p className="text-xs text-text-tertiary mt-2">Create your first invoice to get started</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#85bb65]/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-money-green">{inv.invoice_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span>
                          {getCustomerCountry(inv.customer_id) === 'India' ? '🇮🇳' : 
                           getCustomerCountry(inv.customer_id) === 'USA' ? '🇺🇸' : 
                           getCustomerCountry(inv.customer_id) === 'UK' ? '🇬🇧' : 
                           getCustomerCountry(inv.customer_id) === 'Canada' ? '🇨🇦' : '🌍'}
                        </span>
                        <span className="text-sm font-bold text-money-paper">
                          {getCustomerName(inv.customer_id)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-text-secondary">{inv.service_month}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold">{inv.currency}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-serif font-bold text-money-gold text-sm">
                        {formatCurrency(inv.total_amount, inv.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-serif font-bold text-money-green text-sm">
                        {formatCurrency(inv.paid_amount || 0, inv.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-serif font-bold text-sm ${
                        ((inv.total_amount - (inv.paid_amount || 0)) > 0) ? 'text-money-gold' : 'text-money-green'
                      }`}>
                        {formatCurrency(Math.max(0, inv.total_amount - (inv.paid_amount || 0)), inv.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase text-white ${getStatusColor(
                          inv.status
                        )}`}
                      >
                        {getStatusLabel(inv.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs">
                      <span className={inv.status === 'overdue' ? 'text-red-400 font-bold' : 'text-text-secondary'}>
                        {new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          className="p-2 rounded-lg text-text-tertiary hover:text-money-green hover:bg-money-green/10 transition-all"
                          title="Download Invoice PDF"
                        >
                          <i className="fas fa-file-pdf"></i>
                        </button>
                        {(inv.status === 'paid' || inv.status === 'partially_paid') && (
                          <button
                            onClick={() => handleDownloadRemittancePDF(inv)}
                            className="p-2 rounded-lg text-text-tertiary hover:text-money-gold hover:bg-money-gold/10 transition-all"
                            title="Download Remittance PDF"
                          >
                            <i className="fas fa-file-invoice"></i>
                          </button>
                        )}
                        {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                          <button
                            onClick={() => handleOpenPaymentModal(inv)}
                            className="p-2 rounded-lg text-text-tertiary hover:text-money-green hover:bg-money-green/10 transition-all"
                            title="Record Payment"
                          >
                            <i className="fas fa-credit-card"></i>
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(inv)}
                          className="p-2 rounded-lg text-text-tertiary hover:text-money-gold hover:bg-money-gold/10 transition-all"
                          title="Edit"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => onDelete(inv.id)}
                          className="p-2 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-400/10 transition-all"
                          title="Delete"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
      >
        <InvoiceForm
          invoice={editingInvoice}
          customers={customers}
          userId={userId}
          location={location}
          onSave={(data) => {
            if (editingInvoice) {
              onUpdate(editingInvoice.id!, data);
            } else {
              onAdd(data);
            }
            handleCloseModal();
          }}
          onCancel={handleCloseModal}
          primaryColor={primaryColor}
        />
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={handleClosePaymentModal}
        title="Record Payment"
      >
        {paymentInvoice && (
          <PaymentForm
            invoice={paymentInvoice}
            customer={customers.find((c) => c.id === paymentInvoice.customer_id)!}
            onSave={handleSavePayment}
            onCancel={handleClosePaymentModal}
          />
        )}
      </Modal>
    </div>
  );
};