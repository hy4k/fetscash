import jsPDF from 'jspdf';
import type { Employee, SalaryRecord, SalaryBreakdown } from '../types';
import { computeSalaryBreakdown } from './paybookSalary';

const COMPANY = {
  name: 'Forum Testing & Educational Services',
  gstin: '32AAIFF5955B1ZO',
  address: 'Cochin / Calicut, Kerala, India',
};

const PINE: [number, number, number] = [18, 52, 38];
const PINE_MID: [number, number, number] = [32, 86, 60];
const BRASS: [number, number, number] = [201, 162, 69];
const CREAM: [number, number, number] = [252, 251, 246];
const INK: [number, number, number] = [28, 32, 30];

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero';
  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convert(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  return result + ' Only';
}

function drawPayslipPage(
  doc: jsPDF,
  employee: Employee,
  record: SalaryRecord,
  breakdown: SalaryBreakdown,
  signatureData?: string | null
): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFillColor(...CREAM);
  doc.rect(0, 0, pageW, pageH, 'F');

  doc.setFillColor(...PINE);
  doc.rect(0, 0, pageW, 38, 'F');
  doc.setFillColor(...BRASS);
  doc.rect(0, 38, pageW, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.text('SALARY SLIP', 16, 14);
  doc.setFont('times', 'italic');
  doc.setFontSize(9);
  doc.text(COMPANY.name, 16, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`GSTIN: ${COMPANY.gstin} | ${COMPANY.address}`, 16, 31);
  doc.text(`Pay period: ${record.month || '—'}`, pageW - 16, 24, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageW - 16, 31, { align: 'right' });

  let y = 48;

  doc.setDrawColor(210, 208, 198);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(16, y, pageW - 32, 30, 2.5, 2.5, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(120, 118, 112);
  doc.text('EMPLOYEE NAME', 22, y + 9);
  doc.text('DESIGNATION', pageW * 0.38, y + 9);
  doc.text('LOCATION', pageW * 0.62, y + 9);
  doc.text('CARD TYPE', pageW * 0.82, y + 9);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(employee.name || '—', 22, y + 18);
  doc.text(employee.designation || 'Staff', pageW * 0.38, y + 18);
  doc.text(employee.location || '—', pageW * 0.62, y + 18);
  doc.text(employee.card_type || 'FETS Money', pageW * 0.82, y + 18);
  
  y += 38;

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PINE_MID);
  doc.text('Attendance & Rates', 16, y);
  y += 4;
  doc.setDrawColor(...BRASS);
  doc.setLineWidth(0.25);
  doc.line(16, y, pageW - 16, y);
  y += 7;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 58, 56);
  const ot = (Number(record.ot_hours) || 0) + (Number(record.extra_ot_hours) || 0);
  const lines = [
    `Monthly Salary      … ${inr(Number(record.monthly_salary) || 0)}`,
    `Daily Rate          … ${record.daily_rate != null ? inr(Number(record.daily_rate)) : '—'}`,
    `Working Days        … ${record.working_days_in_month ?? '—'}`,
    `Full / Half Days    … ${record.full_days ?? '—'} / ${record.half_days ?? '—'}`,
    `Leave Days          … ${record.leave_days ?? 0}`,
    `OT Hours            … ${ot}`,
    `TOIL Hours          … ${record.toil_hours ?? 0}`,
    `Worked Units        … ${breakdown.workedUnits}`,
  ];
  lines.forEach((ln) => {
    doc.text(ln, 16, y);
    y += 5.2;
  });
  y += 6;

  const mid = pageW / 2 - 2;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PINE);
  doc.text('Earnings', 16, y);
  doc.text('Deductions', mid + 10, y);
  y += 4;
  doc.line(16, y, pageW - 16, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Gross Salary', 16, y);
  doc.setFont('courier', 'normal');
  doc.text(inr(breakdown.grossSalary), mid - 2, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('Leave / Adjustments', mid + 10, y);
  doc.setFont('courier', 'normal');
  doc.text(inr(breakdown.deductions), pageW - 16, y, { align: 'right' });
  y += 16;

  doc.setFillColor(255, 252, 242);
  doc.setDrawColor(...BRASS);
  doc.setLineWidth(0.35);
  doc.roundedRect(16, y, pageW - 32, 32, 3, 3, 'FD');
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PINE);
  doc.text('NET PAY', 24, y + 14);
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.text(`(${numberToWords(breakdown.netSalary)})`, 24, y + 24);
  doc.setFont('courier', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(inr(breakdown.netSalary), pageW - 24, y + 21, { align: 'right' });
  y += 40;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 98, 92);
  const basisText = doc.splitTextToSize(`Calculation basis: ${breakdown.basis}`, pageW - 32);
  doc.text(basisText, 16, y);
  y += basisText.length * 4 + 8;

  if (signatureData) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...PINE);
    doc.text('Authorised Signature', 16, y);
    y += 4;
    try {
      doc.addImage(signatureData, 'PNG', 16, y, 60, 20);
    } catch {
      doc.setDrawColor(...PINE);
      doc.setLineWidth(0.5);
      doc.line(16, y + 15, 76, y + 15);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(120, 118, 112);
      doc.text('Digitally signed', 16, y + 20);
    }
    y += 28;
  } else {
    doc.setDrawColor(...PINE);
    doc.setLineWidth(0.3);
    doc.line(16, y + 15, 76, y + 15);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 118, 112);
    doc.text('Authorised Signature', 16, y + 20);
    y += 28;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(110, 108, 102);
  const foot = doc.splitTextToSize(
    'This is a computer-generated salary slip and does not require physical signature. ' +
    'Statutory components (PF, ESI, PT, TDS) are not split out unless mirrored in company data. ' +
    `Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`,
    pageW - 32
  );
  doc.text(foot, 16, pageH - 20);
}

export function downloadPayslipPdf(
  employee: Employee,
  record: SalaryRecord,
  breakdown?: SalaryBreakdown,
  signatureData?: string | null
): void {
  const b = breakdown ?? computeSalaryBreakdown({
    monthly_salary: record.monthly_salary,
    daily_rate: record.daily_rate,
    working_days_in_month: record.working_days_in_month,
    full_days: record.full_days,
    half_days: record.half_days,
    leave_days: record.leave_days,
    ot_hours: record.ot_hours,
    extra_ot_hours: record.extra_ot_hours,
    toil_hours: record.toil_hours,
    month: record.month,
    name: employee.name,
  });
  
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  drawPayslipPage(doc, employee, record, b, signatureData);
  const safeName = (employee.name || 'staff').replace(/[^\w\d-]+/g, '_').slice(0, 40);
  const safeMonth = (record.month || 'period').replace(/[^\w\d-]+/g, '_').slice(0, 24);
  doc.save(`payslip_${safeName}_${safeMonth}.pdf`);
}

export function downloadAllPayslipsPdf(
  employee: Employee,
  records: SalaryRecord[],
  signatureData?: string | null
): void {
  if (records.length === 0) return;
  const sorted = [...records].sort((a, b) => (a.month || '').localeCompare(b.month || ''));
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  
  sorted.forEach((record, i) => {
    if (i > 0) doc.addPage();
    const b = computeSalaryBreakdown({
      monthly_salary: record.monthly_salary,
      daily_rate: record.daily_rate,
      working_days_in_month: record.working_days_in_month,
      full_days: record.full_days,
      half_days: record.half_days,
      leave_days: record.leave_days,
      ot_hours: record.ot_hours,
      extra_ot_hours: record.extra_ot_hours,
      toil_hours: record.toil_hours,
      month: record.month,
      name: employee.name,
    });
    drawPayslipPage(doc, employee, record, b, signatureData);
  });
  
  const safeName = (employee.name || 'staff').replace(/[^\w\d-]+/g, '_').slice(0, 40);
  doc.save(`payslips_all_${safeName}.pdf`);
}
