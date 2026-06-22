import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FetsSalaryData } from '@/types';
import { computeSalaryBreakdown, type SalaryBreakdown } from './paybookSalary';

const COMPANY = {
  name: 'Forum Testing & Educational Services',
  gstin: '32AAIFF5955B1ZO',
  address: 'Cochin / Calicut, Kerala, India',
};

/** Deep pine + brass — matches fets.cash shell */
const PINE: [number, number, number] = [18, 52, 38];
const PINE_MID: [number, number, number] = [32, 86, 60];
const BRASS: [number, number, number] = [201, 162, 69];
const CREAM: [number, number, number] = [252, 251, 246];
const INK: [number, number, number] = [28, 32, 30];

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Payslip — Times display + structured bands (print-friendly). */
function drawModernPayslipPage(doc: jsPDF, row: FetsSalaryData, b: SalaryBreakdown): void {
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(...CREAM);
  doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F');

  doc.setFillColor(...PINE);
  doc.rect(0, 0, pageW, 32, 'F');
  doc.setFillColor(...BRASS);
  doc.rect(0, 32, pageW, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.text('Statement of pay', 16, 15);
  doc.setFont('times', 'italic');
  doc.setFontSize(9);
  doc.text(COMPANY.name, 16, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Pay period: ${row.month || '—'}`, pageW - 16, 20, { align: 'right' });

  let y = 44;
  doc.setTextColor(...INK);
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text(row.name || '—', 16, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70, 74, 72);
  doc.text(row.designation?.trim() ? String(row.designation) : 'Role not set', 16, y);
  y += 14;

  doc.setDrawColor(210, 208, 198);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(16, y, pageW - 32, 26, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(120, 118, 112);
  doc.text('SITE', 22, y + 9);
  doc.text('REFERENCE', pageW * 0.4, y + 9);
  doc.text('BASIS', pageW * 0.67, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(row.location || '—', 22, y + 18);
  doc.text(row.id_num || '—', pageW * 0.4, y + 18);
  const basisShort = b.basis.length > 110 ? `${b.basis.slice(0, 107)}…` : b.basis;
  doc.text(basisShort, pageW * 0.67, y + 18);
  y += 34;

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PINE_MID);
  doc.text('Inputs used', 16, y);
  y += 4;
  doc.setDrawColor(...BRASS);
  doc.setLineWidth(0.25);
  doc.line(16, y, pageW - 16, y);
  y += 7;
  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 58, 56);
  const ot = (Number(row.ot_hours) || 0) + (Number(row.extra_ot_hours) || 0);
  const lines = [
    `Monthly (contract) … ${inr(Number(row.monthly_salary) || 0)}`,
    `Daily rate … ${row.daily_rate != null ? inr(Number(row.daily_rate)) : '—'}`,
    `Calendar … WD ${row.working_days_in_month ?? '—'} · Full/half ${row.full_days ?? '—'} / ${row.half_days ?? '—'} · Leave ${row.leave_days ?? 0} · OT h ${ot}`,
    `Worked units (for formula) … ${b.workedUnits}`,
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
  doc.text('Gross (estimate)', 16, y);
  doc.setFont('courier', 'normal');
  doc.text(inr(b.grossSalary), mid - 2, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('Leave / adjustments (est.)', mid + 10, y);
  doc.setFont('courier', 'normal');
  doc.text(inr(b.deductions), pageW - 16, y, { align: 'right' });
  y += 16;

  doc.setFillColor(255, 252, 242);
  doc.setDrawColor(...BRASS);
  doc.setLineWidth(0.35);
  doc.roundedRect(16, y, pageW - 32, 30, 3, 3, 'FD');
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PINE);
  doc.text('Net pay (estimate)', 24, y + 14);
  doc.setFont('courier', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(inr(b.netSalary), pageW - 24, y + 21, { align: 'right' });
  y += 40;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(110, 108, 102);
  const foot = doc.splitTextToSize(
    'Internal working estimate from sheet rules; statutory components (PF, ESI, PT, TDS) are not split out unless mirrored in your data. Printed ' +
      new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) +
      '.',
    pageW - 32
  );
  doc.text(foot, 16, y);
}

export function downloadPayslipPdf(row: FetsSalaryData, breakdown?: SalaryBreakdown): void {
  const b = breakdown ?? computeSalaryBreakdown(row);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  drawModernPayslipPage(doc, row, b);
  const safeName = (row.name || 'staff').replace(/[^\w\d-]+/g, '_').slice(0, 40);
  const safeMonth = (row.month || 'period').replace(/[^\w\d-]+/g, '_').slice(0, 24);
  doc.save(`payslip_${safeName}_${safeMonth}.pdf`);
}

export function downloadAllPayslipsPdf(rows: FetsSalaryData[], periodLabel: string): void {
  const sorted = [...rows]
    .filter((r) => r.name != null && String(r.name).trim() !== '')
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'en-IN'));
  if (sorted.length === 0) return;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  drawModernPayslipPage(doc, sorted[0], computeSalaryBreakdown(sorted[0]));
  for (let i = 1; i < sorted.length; i++) {
    doc.addPage();
    drawModernPayslipPage(doc, sorted[i], computeSalaryBreakdown(sorted[i]));
  }
  const safeP = periodLabel.replace(/[^\w\d-]+/g, '_').slice(0, 28) || 'period';
  doc.save(`payslips_all_staff_${safeP}.pdf`);
}

/** Landscape register — editorial header + Courier figures */
export function downloadPayrollRegisterPdf(rows: FetsSalaryData[], title: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), 'F');
  doc.setFillColor(...PINE);
  doc.rect(0, 0, W, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.text('Payroll register — summary', 16, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${COMPANY.name} · GSTIN ${COMPANY.gstin}`, 16, 21);
  doc.setTextColor(...INK);
  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.text(title, 16, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, 16, 40);

  const head = [['Period', 'Employee', 'ID', 'Location', 'Monthly', 'Gross', 'Deductions', 'Net']];
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
  body.push(['—', '', '', 'Column totals', '', inr(sumG), inr(sumD), inr(sumN)]);

  autoTable(doc, {
    startY: 46,
    head,
    body,
    theme: 'plain',
    headStyles: {
      fillColor: PINE,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      font: 'times',
    },
    bodyStyles: { fontSize: 8, textColor: 28, font: 'courier' },
    columnStyles: {
      0: { font: 'helvetica', cellWidth: 24 },
      1: { font: 'helvetica', cellWidth: 42 },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold', textColor: PINE_MID },
    },
    alternateRowStyles: { fillColor: [254, 253, 250] },
    styles: { cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 }, lineColor: [220, 216, 206], lineWidth: 0.1 },
    margin: { left: 16, right: 16 },
  });

  doc.save('payroll_register.pdf');
}
