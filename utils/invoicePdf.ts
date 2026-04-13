import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Customer } from '../types';

// ---------------------------------------------------------------
// FETS Bank Details — Federal Bank, Panampilly Nagar, Cochin
// ---------------------------------------------------------------
const BANK = {
  name: 'FEDERAL BANK',
  accountNumber: '13160200027156',
  branch: 'PANAMPILLY NAGAR',
  ifsc: 'FDRL0001316',
  swiftCode: 'FDRLINBBXXX',
};

// ---------------------------------------------------------------
// FETS Company Details
// ---------------------------------------------------------------
const COMPANY = {
  name: 'Forum Testing & Educational Services',
  addressLine1: '4th Floor, Kadooli Tower,',
  addressLine2: 'Vandipetta JN, West Nadakkavu,',
  addressLine3: 'Calicut - 673011, Kerala, India',
  phone: '+91 8089393992',
  website: 'www.fets.in',
  gstin: '32AAIFF5955B1ZO',
};

// ---------------------------------------------------------------
// Colours
// ---------------------------------------------------------------
const COLORS = {
  headerBg: [20, 40, 30] as [number, number, number],
  accentGreen: [133, 187, 101] as [number, number, number],
  gold: [212, 175, 55] as [number, number, number],
  tableHeaderBg: [240, 247, 237] as [number, number, number],
  grandTotalBg: [30, 60, 100] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [26, 26, 26] as [number, number, number],
  grey: [100, 100, 100] as [number, number, number],
  lightGrey: [220, 220, 220] as [number, number, number],
};

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
function currencySymbol(currency: string): string {
  const map: Record<string, string> = {
    USD: '$', INR: 'Rs.', GBP: 'GBP ', EUR: 'EUR ', CAD: 'CAD ',
  };
  return map[currency] ?? (currency + ' ');
}

function amountInWords(amount: number, currency: string): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tensArr = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function toWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tensArr[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' ';
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + toWords(n % 100);
    if (n < 100000) return toWords(Math.floor(n / 1000)) + 'Thousand ' + toWords(n % 1000);
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + 'Lakh ' + toWords(n % 100000);
    return toWords(Math.floor(n / 10000000)) + 'Crore ' + toWords(n % 10000000);
  }

  const intPart = Math.floor(Math.abs(amount));
  const decPart = Math.round((Math.abs(amount) - intPart) * 100);
  const currencyName =
    currency === 'INR' ? 'Rupees' :
    currency === 'USD' ? 'US Dollars' :
    currency === 'GBP' ? 'Pounds Sterling' :
    currency === 'EUR' ? 'Euros' : currency;
  const centsName = currency === 'INR' ? 'Paise' : 'Cents';

  let words = toWords(intPart).trim() + ' ' + currencyName;
  if (decPart > 0) words += ' and ' + toWords(decPart).trim() + ' ' + centsName;
  return words + ' Only';
}

// ---------------------------------------------------------------
// Main export: generate real PDF
// ---------------------------------------------------------------
export const generateInvoicePDF = (
  invoice: Invoice,
  customer: Customer,
): Blob => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const sym = currencySymbol(invoice.currency);

  // DRAFT watermark
  if (invoice.status === 'draft') {
    doc.setTextColor(220, 220, 220);
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.text('DRAFT', pageW / 2, 160, { align: 'center', angle: 45 });
  }

  // ================================================================
  // HEADER BAND
  // ================================================================
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(0, 0, pageW, 38, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY.name.toUpperCase(), margin, 12);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    COMPANY.addressLine1 + ' ' + COMPANY.addressLine2 + ' ' + COMPANY.addressLine3,
    margin, 18.5,
  );
  doc.text(`Ph: ${COMPANY.phone}   |   Web: ${COMPANY.website}`, margin, 23.5);
  doc.text(`GSTIN: ${COMPANY.gstin}`, margin, 28.5);

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.gold);
  doc.text('INVOICE', pageW - margin, 22, { align: 'right' });

  doc.setDrawColor(...COLORS.accentGreen);
  doc.setLineWidth(0.8);
  doc.line(0, 38.5, pageW, 38.5);

  // ================================================================
  // INVOICE META (two columns)
  // ================================================================
  let y = 46;

  // Left: Bill To
  doc.setTextColor(...COLORS.accentGreen);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', margin, y);

  doc.setTextColor(...COLORS.black);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(customer.name, margin, y + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.grey);
  let billY = y + 12;

  if (customer.contact_person) {
    doc.text(`Attn: ${customer.contact_person}`, margin, billY);
    billY += 4.5;
  }
  if (customer.address) {
    const addrLines = doc.splitTextToSize(customer.address, 80);
    doc.text(addrLines, margin, billY);
    billY += (addrLines.length as number) * 4.5;
  }
  doc.text(customer.email, margin, billY);
  billY += 4.5;
  if (customer.gst_number) {
    doc.setTextColor(80, 140, 60);
    doc.text(`GSTIN: ${customer.gst_number}`, margin, billY);
    doc.setTextColor(...COLORS.grey);
    billY += 4.5;
  }

  // Right: Invoice details
  const rightX = pageW / 2 + 8;
  const valueX = rightX + 32;

  const metaRows: [string, string, boolean][] = [
    ['Invoice No.', invoice.invoice_number, true],
    ['Date', new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }), false],
    ['Due Date', new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }), false],
    ['Service Period', invoice.service_month || '—', false],
    ['Currency', invoice.currency, false],
    ['Payment Terms', `Net ${customer.payment_terms} days`, false],
  ];

  let metaY = y + 2;
  metaRows.forEach(([label, value, isHighlight]) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.grey);
    doc.text(label + ':', rightX, metaY);

    doc.setFont('helvetica', 'bold');
    if (isHighlight) {
      doc.setTextColor(...COLORS.accentGreen);
      doc.setFontSize(9);
    } else {
      doc.setTextColor(...COLORS.black);
      doc.setFontSize(8);
    }
    doc.text(value, valueX, metaY);
    metaY += 5.5;
  });

  // ================================================================
  // SERVICE LINES TABLE
  // ================================================================
  y = Math.max(billY + 6, metaY + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.accentGreen);
  doc.text('SERVICES', margin, y);
  y += 3;

  const tableBody = (invoice.service_lines || []).map((line, idx) => [
    String(idx + 1),
    line.description,
    String(line.quantity),
    `${sym}${Number(line.rate).toFixed(2)}`,
    `${sym}${Number(line.amount).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Sr No.', 'Product / Description', 'Quantity', 'Rate', 'Amount']],
    body: tableBody.length > 0 ? tableBody : [['—', 'No service lines recorded', '', '', '']],
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: COLORS.black,
      lineColor: COLORS.lightGrey,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLORS.tableHeaderBg,
      textColor: COLORS.grey,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [248, 252, 248] },
  });

  // ================================================================
  // BOTTOM SECTION: Please Note (left) + Totals (right)
  // ================================================================
  const afterTableY: number = (doc as any).lastAutoTable.finalY + 8;
  const colW = (pageW - margin * 2) / 2 - 4;
  const rightColX = margin + colW + 8;

  // Please Note
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.grey);
  doc.text('PLEASE NOTE', margin, afterTableY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (invoice.notes) {
    doc.setTextColor(...COLORS.black);
    const noteLines = doc.splitTextToSize(invoice.notes, colW);
    doc.text(noteLines, margin, afterTableY + 5);
  } else {
    doc.setTextColor(...COLORS.lightGrey);
    doc.text('—', margin, afterTableY + 5);
  }

  // Totals
  let totY = afterTableY;
  const totValueX = pageW - margin;

  const drawTotalRow = (label: string, value: string, highlight = false) => {
    if (highlight) {
      doc.setFillColor(...COLORS.grandTotalBg);
      doc.rect(rightColX - 2, totY - 5, pageW - margin - rightColX + 4, 7.5, 'F');
      doc.setTextColor(...COLORS.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
    } else {
      doc.setTextColor(...COLORS.grey);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
    }
    doc.text(label, rightColX, totY);
    doc.setFont('helvetica', 'bold');
    doc.text(value, totValueX, totY, { align: 'right' });
    totY += 7;
    doc.setTextColor(...COLORS.black);
    doc.setFontSize(8.5);
  };

  drawTotalRow('Sub Total', `${sym}${invoice.subtotal.toFixed(2)}`);
  if (invoice.gst_amount > 0) {
    drawTotalRow(`GST (${invoice.gst_rate}%)`, `${sym}${invoice.gst_amount.toFixed(2)}`);
  }
  drawTotalRow('Grand Total', `${sym}${invoice.total_amount.toFixed(2)}`, true);
  drawTotalRow('Paid Amount', `${sym}${(invoice.paid_amount || 0).toFixed(2)}`);

  const balance = invoice.total_amount - (invoice.paid_amount || 0);
  doc.setDrawColor(...COLORS.accentGreen);
  doc.setLineWidth(0.4);
  doc.line(rightColX, totY - 1, pageW - margin, totY - 1);
  drawTotalRow('Balance Due', `${sym}${balance.toFixed(2)}`);

  // ================================================================
  // AMOUNT IN WORDS
  // ================================================================
  const amtWordsY = Math.max(afterTableY + 32, totY + 5);
  doc.setFillColor(245, 252, 245);
  doc.rect(margin, amtWordsY - 4, pageW - margin * 2, 10, 'F');
  doc.setDrawColor(...COLORS.accentGreen);
  doc.setLineWidth(0.3);
  doc.rect(margin, amtWordsY - 4, pageW - margin * 2, 10, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.grey);
  doc.text('Amount in Words:', margin + 2, amtWordsY + 1.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  const wordsText = doc.splitTextToSize(amountInWords(invoice.total_amount, invoice.currency), pageW - margin * 2 - 38);
  doc.text(wordsText, margin + 36, amtWordsY + 1.5);

  // ================================================================
  // BANKING DETAILS
  // ================================================================
  const bankY = amtWordsY + 14;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.grey);
  doc.text('BANKING DETAILS', margin, bankY);

  const bankBoxH = customer.country !== 'India' ? 28 : 24;
  doc.setFillColor(248, 252, 248);
  doc.rect(margin, bankY + 2, colW, bankBoxH, 'F');
  doc.setDrawColor(...COLORS.lightGrey);
  doc.rect(margin, bankY + 2, colW, bankBoxH, 'S');

  const bankRows: [string, string][] = [
    ['Bank', BANK.name],
    ['A/C No.', BANK.accountNumber],
    ['Branch', BANK.branch],
    ['IFSC', BANK.ifsc],
  ];
  if (customer.country !== 'India') {
    bankRows.push(['SWIFT', BANK.swiftCode]);
  }

  let bY = bankY + 8;
  bankRows.forEach(([lbl, val]) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.grey);
    doc.text(lbl + ':', margin + 3, bY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text(val, margin + 22, bY);
    bY += 4.5;
  });

  // Remittance / GST notice
  const noticeW = pageW - margin - rightColX;
  const isForeign = customer.country !== 'India';
  doc.setFillColor(isForeign ? 227 : 232, isForeign ? 242 : 245, isForeign ? 251 : 232);
  doc.rect(rightColX, bankY + 2, noticeW, bankBoxH, 'F');
  doc.setDrawColor(...COLORS.lightGrey);
  doc.rect(rightColX, bankY + 2, noticeW, bankBoxH, 'S');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isForeign ? 13 : 46, isForeign ? 71 : 125, isForeign ? 161 : 50);
  doc.text(isForeign ? 'FOREIGN REMITTANCE' : 'GST NOTICE', rightColX + 3, bankY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.grey);
  const noticeBody = isForeign
    ? 'Export of Services — Zero-Rated GST (0%). Please remit via SWIFT / Wire Transfer. Mention invoice number in transfer details.'
    : `GST @ ${invoice.gst_rate}% charged as per Indian GST regulations. Taxable supply of services.`;
  const noticeLines = doc.splitTextToSize(noticeBody, noticeW - 6);
  doc.text(noticeLines, rightColX + 3, bankY + 13);

  // ================================================================
  // FOOTER
  // ================================================================
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setDrawColor(...COLORS.lightGrey);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.grey);
  doc.text(
    'This is a computer-generated invoice. No physical signature required.',
    pageW / 2, footerY, { align: 'center' },
  );
  doc.text(
    `${COMPANY.name}  |  GSTIN: ${COMPANY.gstin}`,
    pageW / 2, footerY + 4, { align: 'center' },
  );

  return doc.output('blob');
};

// ---------------------------------------------------------------
// Convenience: open PDF preview in new tab
// ---------------------------------------------------------------
export const openInvoicePDF = (invoice: Invoice, customer: Customer): void => {
  const blob = generateInvoicePDF(invoice, customer);
  const url = window.URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => window.URL.revokeObjectURL(url), 30000);
};
