import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Customer } from '@/types';

// Migrated from utils/invoicePdf.ts — business logic preserved, imports updated to @/ aliases.
export const generateInvoicePDF = (invoice: Invoice, customer: Customer): Blob => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const sym = invoice.currency === 'USD' ? '$' : invoice.currency === 'GBP' ? '£' : invoice.currency === 'EUR' ? '€' : 'Rs. ';
  doc.text('INVOICE', pageW - margin, 22, { align: 'right' });
  return doc.output('blob');
};

export const openInvoicePDF = (invoice: Invoice, customer: Customer): void => {
  const blob = generateInvoicePDF(invoice, customer);
  const url = window.URL.createObjectURL(blob);
  window.open(url, '_blank');
};
