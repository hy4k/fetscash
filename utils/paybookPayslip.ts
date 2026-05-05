import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FetsSalaryData } from '../types';
import { computeSalaryBreakdown, type SalaryBreakdown } from './paybookSalary';

const COMPANY = {
  name: 'Forum Testing & Educational Services',
  gstin: '32AAIFF5955B1ZO',
  address: 'Cochin / Calicut, Kerala, India',
};

const GREEN: [number, number, number] = [22, 101, 52];
const GREEN_LIGHT: [number, number, number] = [234, 250, 241];
const MUTED: [number, number, number] = [88, 88, 88];

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function drawModernPayslipPage(doc: jsPDF, row: FetsSalaryData, b: SalaryBreakdown): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFillColor(250, 252, 250);
  doc.rect(0, 0, pageW, pageH, 'F');

  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('Payslip', 14, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(row.month || '—', pageW - 14, 18, { align: 'right' });

  let y = 36;
  doc.setTextColor(45, 45, 45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(COMPANY.name, 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  y += 5;
  doc.text(`GSTIN ${COMPANY.gstin} · ${COMPANY.address}`, 14, y);
  y += 14;

  doc.setTextColor(...GREEN)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(row.name || '—', 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text(row.designation?.trim() ? row.designation : 'Team member', 14, y);
  y += 12;

  doc.setDrawColor(220, 228, 220);
  doc.setFillColor(248, 251, 248);
  doc.roundedRect(14, y, pageW - 28, 24, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('LOCATION', 18, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(35, 35, 35);
  doc.text(row.location || '—', 18, y + 16);
  const c2 = pageW * 0.38;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('EMPLOYEE REF', c2, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(35, 35, 35);
  doc.text(row.id_num || '—', c2, y + 16);
  const c3 = pageW * 0.62;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('CALCULATION BASIS', c3, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(35, 35, 35);
  const basisLines = doc.splitTextToSize(b.basis, pageW - c3 - 18);
  doc.text(basisLines, c3, y + 14);
  y += 32;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text('Attendance & inputs', 14, y);
  y += 2;
  doc.setDrawColor(200, 210, 200);
  doc.line(14, y, pageW - 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 55, 55);
  const ot = (Number(row.ot_hours) || 0) + (Number(row.extra_ot_hours) || 0);
  const att = [
    `Contract (monthly reference): ${inr(Number(row.monthly_salary) || 0)}`,
    `Daily rate: ${row.daily_rate != null ? inr(Number(row.daily_rate)) : '—'}`,
    `Working days in month: ${row.working_days_in_month ?? '—'} · Full / half days: ${row.full_days ?? '—'} / ${row.half_days ?? '—'}`,
    `Worked units (formula): ${b.workedUnits} · Leave days: ${row.leave_days ?? 0} · OT hours: ${ot}`,
  ];
  att.forEach((line) => {
    doc.text(line, 14, y);
    y += 5;
  });
  y += 6;

  const mid = pageW / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text('Earnings (estimate)', 14, y);
  doc.text('Deductions (estimate)', mid + 6, y);
  y += 3;
  doc.setDrawColor(200, 210, 200);
  doc.line(14, y, mid - 2, y);
  doc.line(mid + 6, y, pageW - 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(45, 45, 45);
  doc.text('Gross pay', 14, y);
  doc.text(inr(b.grossSalary), mid - 14, y, { align: 'right' });
  doc.text('Unpaid leave & adjustments', mid + 6, y);
  doc.text(inr(b.deductions), pageW - 14, y, { align: 'right' });
  y += 14;

  doc.setFillColor(...GREEN_LIGHT);
  doc.setDrawColor(...GREEN);
  doc.roundedRect(14, y, pageW - 28, 28, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text('Take-home pay (estimated)', 20, y + 12);
  doc.setFontSize(20);
  doc.text(inr(b.netSalary), pageW - 20, y + 20, { align: 'right' });
  y += 36;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(110, 110, 110);
  const foot = doc.splitTextToSize(
    'This payslip is an internal working estimate from attendance and contract rates. Statutory lines (PF, ESI, TDS, etc.) are not itemised here unless you add them to the payroll sheet. Generated on ' +
      new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) +
      '.',
    pageW - 28
  );
  doc.text(foot, 14, y);
}

export function downloadPayslipPdf(row: FetsSalaryData, breakdown?: SalaryBreakdown): void {
  const b = breakdown ?? computeSalaryBreakdown(row);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  drawModernPayslipPage(doc, row, b);
  const safeName = (row.name || 'staff').replace(/[^\w\d-]+/g, '_').slice(0, 40);
  const safeMonth = (row.month || 'period').replace(/[^\w\d-]+/g, '_').slice(0, 24);
  doc.save(`payslip_${safeName}_${safeMonth}.pdf`);
}

/** Single PDF, one page per employee (alphabetical). */
export function downloadAllPayslipsPdf(rows: FetsSalaryData[], periodLabel: string): void {
  const sorted = [...rows].filter((r) => r.name != null && String(r.name).trim() !== '').sort((a, b) =>
    String(a.name).localeCompare(String(b.name), 'en-IN')
  );
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

/** Payroll register PDF (summary table). */
export function downloadPayrollRegisterPdf(rows: FetsSalaryData[], title: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Payroll register', 14, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(COMPANY.name, 14, 19);
  doc.setTextColor(45, 45, 45);
  doc.setFontSize(10);
  doc.text(title, 14, 30);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, 14, 35);

  const head = [['Period', 'Name', 'ID', 'Location', 'Monthly', 'Gross (est.)', 'Ded.', 'Net (est.)']];
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
  body.push(['', '', '', 'Totals', '', inr(sumG), inr(sumD), inr(sumN)]);

  autoTable(doc, {
    startY: 40,
    head,
    body,
    theme: 'plain',
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: 50 },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold', textColor: GREEN },
    },
    alternateRowStyles: { fillColor: [248, 252, 248] },
    styles: { cellPadding: 3 },
  });

  doc.save('payroll_register.pdf');
}
