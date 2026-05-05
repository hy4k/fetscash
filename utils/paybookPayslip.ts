import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FetsSalaryData } from '../types';
import { computeSalaryBreakdown, type SalaryBreakdown } from './paybookSalary';

const COMPANY = {
  name: 'Forum Testing & Educational Services',
  gstin: '32AAIFF5955B1ZO',
  address: 'Cochin / Calicut, Kerala, India',
};

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function downloadPayslipPdf(row: FetsSalaryData, breakdown?: SalaryBreakdown): void {
  const b = breakdown ?? computeSalaryBreakdown(row);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setTextColor(20, 60, 40);
  doc.text('PAYSLIP', pageW / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(COMPANY.name, pageW / 2, 25, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`GSTIN: ${COMPANY.gstin}`, pageW / 2, 30, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(20);
  let y = 40;
  doc.text(`Employee: ${row.name}`, 14, y);
  y += 6;
  doc.text(`Period: ${row.month || '—'}`, 14, y);
  y += 6;
  if (row.designation) {
    doc.text(`Designation: ${row.designation}`, 14, y);
    y += 6;
  }
  if (row.id_num) {
    doc.text(`ID / Ref: ${row.id_num}`, 14, y);
    y += 6;
  }
  if (row.location) {
    doc.text(`Location: ${row.location}`, 14, y);
    y += 6;
  }

  const head = [['Description', 'Amount (INR)']];
  const body: string[][] = [
    ['Contract monthly (reference)', inr(Number(row.monthly_salary) || 0)],
    ['Daily rate (if set)', row.daily_rate != null ? inr(Number(row.daily_rate)) : '—'],
    ['Worked (full + ½×half days)', String(b.workedUnits)],
    ['Leave days', String(row.leave_days ?? 0)],
    ['OT hours (incl. extra)', String((Number(row.ot_hours) || 0) + (Number(row.extra_ot_hours) || 0))],
    ['—', '—'],
    ['Gross (estimated)', inr(b.grossSalary)],
    ['Deductions (unpaid leave est.)', inr(b.deductions)],
    ['Net pay (estimated)', inr(b.netSalary)],
  ];

  autoTable(doc, {
    startY: y + 4,
    head,
    body,
    theme: 'grid',
    headStyles: { fillColor: [20, 60, 40], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2.5 },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text(`Basis: ${b.basis}`, 14, finalY + 8);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, finalY + 13);
  doc.text('This is an internal estimate. Statutory components may apply.', 14, finalY + 18);

  const safeName = row.name.replace(/[^\w\d-]+/g, '_').slice(0, 40);
  doc.save(`payslip_${safeName}_${row.month || 'period'}.pdf`);
}

/** Payroll register PDF (multiple rows) — same idea as hy4k/paybook reports.js */
export function downloadPayrollRegisterPdf(rows: FetsSalaryData[], title: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  doc.setFontSize(14);
  doc.setTextColor(20, 60, 40);
  doc.text(COMPANY.name + ' — Payroll register', 14, 16);
  doc.setFontSize(10);
  doc.text(title, 14, 22);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 27);

  const head = [[
    'Period', 'Name', 'ID', 'Location', 'Monthly', 'Gross (est.)', 'Ded.', 'Net (est.)',
  ]];
  let sumG = 0;
  let sumD = 0;
  let sumN = 0;
  const body = rows.map((row) => {
    const b = computeSalaryBreakdown(row);
    sumG += b.grossSalary;
    sumD += b.deductions;
    sumN += b.netSalary;
    return [
      row.month || '—',
      row.name,
      row.id_num || '—',
      row.location || '—',
      inr(Number(row.monthly_salary) || 0),
      inr(b.grossSalary),
      inr(b.deductions),
      inr(b.netSalary),
    ];
  });
  body.push(['', '', '', 'TOTALS', '', inr(sumG), inr(sumD), inr(sumN)]);

  autoTable(doc, {
    startY: 32,
    head,
    body,
    theme: 'striped',
    headStyles: { fillColor: [20, 60, 40], textColor: 255 },
    styles: { fontSize: 7 },
  });

  doc.save('payroll_register.pdf');
}
