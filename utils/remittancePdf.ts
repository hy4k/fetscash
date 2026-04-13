import jsPDF from 'jspdf';
import { Invoice, Customer, Payment } from '../types';

// ---------------------------------------------------------------
// FETS bank + company constants
// ---------------------------------------------------------------
const BANK_BRANCH = 'PANAMPILLY NAGAR';
const BENEFICIARY_NAME = 'Forun Testing and educational services';
const ACCOUNT_NUMBER = '13160200027156';

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
function currencyName(currency: string): string {
  const map: Record<string, string> = {
    USD: 'DOLLARS', GBP: 'POUNDS STERLING', EUR: 'EUROS', CAD: 'CANADIAN DOLLARS',
  };
  return map[currency] ?? currency;
}

function currencySymbol(currency: string): string {
  const map: Record<string, string> = { USD: '$', GBP: '£', EUR: '€', CAD: 'C$' };
  return map[currency] ?? currency + ' ';
}

function amountInWords(amount: number, currency: string): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tensArr = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
    'Sixty', 'Seventy', 'Eighty', 'Ninety'];

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
  const currencyWord =
    currency === 'USD' ? 'US Dollars' :
    currency === 'GBP' ? 'Pounds Sterling' :
    currency === 'EUR' ? 'Euros' :
    currency === 'CAD' ? 'Canadian Dollars' : currency;
  const centsWord =
    currency === 'USD' ? 'Cents' : currency === 'GBP' ? 'Pence' : 'Cents';

  let words = toWords(intPart).trim() + ' ' + currencyWord;
  if (decPart > 0) words += ' and ' + toWords(decPart).trim() + ' ' + centsWord;
  return words + ' Only';
}

// ---------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------
function fieldLabel(doc: jsPDF, x: number, y: number, text: string) {
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(text, x, y);
}

function fieldBox(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, 'S');
}

function fieldValue(doc: jsPDF, x: number, y: number, text: string, bold = false) {
  doc.setFontSize(8.5);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setTextColor(20, 20, 20);
  doc.text(text, x, y);
}

function checkbox(doc: jsPDF, x: number, y: number, checked: boolean, label: string) {
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.4);
  doc.rect(x, y - 3, 4, 4, 'S');
  if (checked) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 80, 20);
    doc.text('X', x + 0.6, y);
  }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);
  doc.text(label, x + 5.5, y);
}

function sectionHeader(doc: jsPDF, x: number, y: number, text: string, pageW: number, margin: number) {
  doc.setFillColor(220, 235, 220);
  doc.rect(margin, y - 4.5, pageW - margin * 2, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 80, 30);
  doc.text(text, x, y);
  doc.setTextColor(20, 20, 20);
}

// ---------------------------------------------------------------
// Main export
// ---------------------------------------------------------------
export const generateRemittancePDF = (
  payment: Payment & { purpose_code?: string; deal_id?: string },
  invoice: Invoice,
  customer: Customer,
): Blob => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const colMid = pageW / 2;
  const rightStart = colMid + 4;
  const boxH = 8;

  // ================================================================
  // TITLE HEADER
  // ================================================================
  doc.setFillColor(15, 60, 30);
  doc.rect(0, 0, pageW, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('FEDERAL BANK', margin, 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Disposal Instruction for Foreign Inward Remittance', margin, 16);

  doc.setFontSize(8);
  doc.setTextColor(200, 230, 200);
  doc.text(`Branch: ${BANK_BRANCH}`, pageW - margin, 10, { align: 'right' });
  doc.text('For Bank Use Only', pageW - margin, 16, { align: 'right' });

  // ================================================================
  // BENEFICIARY + ACCOUNT SECTION
  // ================================================================
  let y = 30;
  sectionHeader(doc, margin, y, 'BENEFICIARY DETAILS', pageW, margin);
  y += 5;

  // Beneficiary Name
  fieldLabel(doc, margin, y, 'Beneficiary Name');
  fieldBox(doc, margin, y + 1, pageW - margin * 2, boxH);
  fieldValue(doc, margin + 2, y + 6.5, BENEFICIARY_NAME, true);
  y += 13;

  // Account Number + Branch (two columns)
  fieldLabel(doc, margin, y, 'Account Number');
  fieldBox(doc, margin, y + 1, colMid - margin - 4, boxH);
  fieldValue(doc, margin + 2, y + 6.5, ACCOUNT_NUMBER, true);

  fieldLabel(doc, rightStart, y, 'Branch Name');
  fieldBox(doc, rightStart, y + 1, pageW - margin - rightStart, boxH);
  fieldValue(doc, rightStart + 2, y + 6.5, BANK_BRANCH, true);
  y += 16;

  // ================================================================
  // REMITTANCE DETAILS
  // ================================================================
  sectionHeader(doc, margin, y, 'REMITTANCE DETAILS', pageW, margin);
  y += 5;

  // Bill Currency + Bill Amount
  fieldLabel(doc, margin, y, 'Bill Currency');
  fieldBox(doc, margin, y + 1, 40, boxH);
  fieldValue(doc, margin + 2, y + 6.5, currencyName(invoice.currency), true);

  fieldLabel(doc, margin + 45, y, 'Bill Amount (Figures)');
  fieldBox(doc, margin + 45, y + 1, colMid - margin - 45, boxH);
  fieldValue(doc, margin + 47, y + 6.5, `${currencySymbol(invoice.currency)}${payment.amount.toFixed(2)}`, true);

  fieldLabel(doc, rightStart, y, 'Date of Receipt');
  fieldBox(doc, rightStart, y + 1, pageW - margin - rightStart, boxH);
  fieldValue(doc, rightStart + 2, y + 6.5,
    new Date(payment.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    true,
  );
  y += 14;

  // Bill Amount in Words
  fieldLabel(doc, margin, y, 'Bill Amount (in Words)');
  fieldBox(doc, margin, y + 1, pageW - margin * 2, boxH);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  const wordsText = doc.splitTextToSize(amountInWords(payment.amount, invoice.currency), pageW - margin * 2 - 4);
  doc.text(wordsText, margin + 2, y + 6.5);
  y += 14;

  // ================================================================
  // REMITTER DETAILS
  // ================================================================
  sectionHeader(doc, margin, y, 'REMITTER DETAILS', pageW, margin);
  y += 5;

  fieldLabel(doc, margin, y, 'Remitter Name');
  fieldBox(doc, margin, y + 1, pageW - margin * 2, boxH);
  fieldValue(doc, margin + 2, y + 6.5, customer.name.toUpperCase(), true);
  y += 14;

  fieldLabel(doc, margin, y, 'Remitter Address');
  fieldBox(doc, margin, y + 1, pageW - margin * 2, boxH + 4);
  const addrText = customer.address || `${customer.country}`;
  const addrLines = doc.splitTextToSize(addrText.toUpperCase(), pageW - margin * 2 - 4);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);
  doc.text(addrLines.slice(0, 2), margin + 2, y + 6.5);
  y += 18;

  // ================================================================
  // PURPOSE OF REMITTANCE
  // ================================================================
  sectionHeader(doc, margin, y, 'PURPOSE OF REMITTANCE', pageW, margin);
  y += 5;

  // Purpose description + Purpose Code (two columns)
  fieldLabel(doc, margin, y, 'Purpose of Remittance');
  fieldBox(doc, margin, y + 1, colMid - margin - 4, boxH);
  fieldValue(doc, margin + 2, y + 6.5, 'Exam Registration', true);

  fieldLabel(doc, rightStart, y, 'RBI Purpose Code');
  fieldBox(doc, rightStart, y + 1, 30, boxH);
  fieldValue(doc, rightStart + 2, y + 6.5, (payment as any).purpose_code || 'P1107', true);

  // Deal ID (right side)
  fieldLabel(doc, rightStart + 35, y, 'Deal ID');
  fieldBox(doc, rightStart + 35, y + 1, pageW - margin - rightStart - 35, boxH);
  fieldValue(doc, rightStart + 37, y + 6.5, (payment as any).deal_id || '—', true);
  y += 14;

  // ================================================================
  // TRANSACTION TYPE
  // ================================================================
  sectionHeader(doc, margin, y, 'TRANSACTION TYPE', pageW, margin);
  y += 7;

  // Row 1 of checkboxes
  checkbox(doc, margin, y, true, 'SOFTWARE SERVICE (SOFTEX not required)');
  checkbox(doc, margin + 80, y, false, 'SOFTWARE SERVICE (SOFTEX required)');
  y += 8;
  checkbox(doc, margin, y, false, 'IT Enabled Services');
  checkbox(doc, margin + 80, y, false, 'Other (specify):');
  fieldBox(doc, margin + 115, y - 4, pageW - margin - 115 - margin, 6);
  y += 10;

  // ================================================================
  // SUPPLY MODE
  // ================================================================
  sectionHeader(doc, margin, y, 'MODE OF SUPPLY', pageW, margin);
  y += 7;

  checkbox(doc, margin, y, true, 'Mode 1 — Cross-border Supply');
  checkbox(doc, margin + 75, y, false, 'Mode 2 — Consumption Abroad');
  y += 8;
  checkbox(doc, margin, y, false, 'Mode 3 — Commercial Presence');
  checkbox(doc, margin + 75, y, false, 'Mode 4 — Presence of Natural Persons');
  y += 10;

  // ================================================================
  // CONVERSION INSTRUCTION
  // ================================================================
  sectionHeader(doc, margin, y, 'CONVERSION / CREDIT INSTRUCTION', pageW, margin);
  y += 7;

  checkbox(doc, margin, y, true, `Convert 100% into INR and credit to A/C: ${ACCOUNT_NUMBER}`);
  y += 8;
  checkbox(doc, margin, y, false, 'Retain in foreign currency account');
  checkbox(doc, margin + 75, y, false, 'Partial conversion (specify %):');
  fieldBox(doc, margin + 140, y - 4, 20, 6);
  y += 10;

  // ================================================================
  // REFERENCE / ADDITIONAL INFO
  // ================================================================
  sectionHeader(doc, margin, y, 'REFERENCE DETAILS', pageW, margin);
  y += 5;

  fieldLabel(doc, margin, y, 'Invoice Reference');
  fieldBox(doc, margin, y + 1, colMid - margin - 4, boxH);
  fieldValue(doc, margin + 2, y + 6.5, invoice.invoice_number, true);

  fieldLabel(doc, rightStart, y, 'Invoice Amount');
  fieldBox(doc, rightStart, y + 1, pageW - margin - rightStart, boxH);
  fieldValue(doc, rightStart + 2, y + 6.5,
    `${currencySymbol(invoice.currency)}${invoice.total_amount.toFixed(2)} ${invoice.currency}`,
    false,
  );
  y += 14;

  if (payment.notes) {
    fieldLabel(doc, margin, y, 'Notes');
    fieldBox(doc, margin, y + 1, pageW - margin * 2, boxH);
    fieldValue(doc, margin + 2, y + 6.5, payment.notes);
    y += 14;
  }

  // ================================================================
  // DECLARATION + SIGNATURE
  // ================================================================
  y += 4;
  doc.setFillColor(248, 252, 248);
  doc.rect(margin, y, pageW - margin * 2, 20, 'F');
  doc.setDrawColor(160, 160, 160);
  doc.rect(margin, y, pageW - margin * 2, 20, 'S');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const declarationText =
    'I/We hereby declare that the particulars given above are true and correct and the ' +
    'foreign exchange received has been applied / will be applied for the purpose mentioned ' +
    'above and in conformity with the provisions of the Foreign Exchange Management Act, 1999 ' +
    'and all rules, regulations and directions issued thereunder.';
  const declLines = doc.splitTextToSize(declarationText, pageW - margin * 2 - 4);
  doc.text(declLines, margin + 2, y + 5);

  // Signature lines
  const sigY = y + 16;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  // Beneficiary signature
  doc.line(margin, sigY + 2, margin + 60, sigY + 2);
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text('Authorised Signatory', margin, sigY + 5);
  doc.text(BENEFICIARY_NAME, margin, sigY + 9);
  // Date
  doc.line(pageW - margin - 50, sigY + 2, pageW - margin, sigY + 2);
  doc.text('Date: ' + new Date(payment.payment_date).toLocaleDateString('en-GB'), pageW - margin - 50, sigY + 5);

  // ================================================================
  // FOOTER
  // ================================================================
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, footerY - 3, pageW - margin, footerY - 3);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(
    'Federal Bank Ltd. | This form is for guidance only. Please submit the original signed form to your branch.',
    pageW / 2, footerY, { align: 'center' },
  );

  return doc.output('blob');
};

// ---------------------------------------------------------------
// Convenience: download the form
// ---------------------------------------------------------------
export const downloadRemittancePDF = (
  payment: Payment & { purpose_code?: string; deal_id?: string },
  invoice: Invoice,
  customer: Customer,
): void => {
  const blob = generateRemittancePDF(payment, invoice, customer);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Remittance-Instruction-${invoice.invoice_number}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 10000);
};
