import React, { useMemo } from 'react';
import type { Employee, SalaryRecord } from '../types';
import { downloadPayslipPdf } from '../utils/paybookPayslip';
import { computeSalaryBreakdown } from '../utils/paybookSalary';

interface SalaryHistoryProps {
  employee: Employee;
  records: SalaryRecord[];
  signatureData?: string | null;
}

function inr(n: number): string {
  return `\u20b9${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SalaryHistory({ employee, records, signatureData }: SalaryHistoryProps) {
  const sorted = useMemo(() => {
    return [...records].sort((a, b) => {
      const ma = a.month || '';
      const mb = b.month || '';
      return mb.localeCompare(ma);
    });
  }, [records]);

  const handleView = (record: SalaryRecord) => {
    const breakdown = computeSalaryBreakdown({
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
    alert(
      `Payslip: ${record.month}\n` +
        `Gross: ${inr(breakdown.grossSalary)}\n` +
        `Deductions: ${inr(breakdown.deductions)}\n` +
        `Net: ${inr(breakdown.netSalary)}\n` +
        `Basis: ${breakdown.basis}`
    );
  };

  const handleDownload = (record: SalaryRecord) => {
    const breakdown = computeSalaryBreakdown({
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
    downloadPayslipPdf(employee, record, breakdown, signatureData);
  };

  if (sorted.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
        <i
          className="fa-solid fa-folder-open"
          style={{ fontSize: 40, color: '#4a6354', marginBottom: 16, display: 'block' }}
        />
        <p style={{ color: '#8ba696', fontSize: 14, margin: 0 }}>
          No salary records yet. Use the Calculator tab to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(133, 187, 101, 0.08)' }}>
        <h3
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 700,
            color: '#e8f5e9',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <i className="fa-solid fa-clock-rotate-left" style={{ color: '#85bb65' }} />
          Salary History
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              fontWeight: 500,
              color: '#8ba696',
              fontFamily: "'Courier New', monospace",
            }}
          >
            {sorted.length} record{sorted.length !== 1 ? 's' : ''}
          </span>
        </h3>
      </div>

      <div style={{ overflowX: 'auto' }} className="custom-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th style={{ textAlign: 'center' }}>Working</th>
              <th style={{ textAlign: 'center' }}>Full</th>
              <th style={{ textAlign: 'center' }}>Half</th>
              <th style={{ textAlign: 'center' }}>Leave</th>
              <th style={{ textAlign: 'center' }}>OT</th>
              <th style={{ textAlign: 'center' }}>TOIL</th>
              <th style={{ textAlign: 'right' }}>Gross</th>
              <th style={{ textAlign: 'right' }}>Deductions</th>
              <th style={{ textAlign: 'right' }}>Net</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((record) => {
              const ot = (Number(record.ot_hours) || 0) + (Number(record.extra_ot_hours) || 0);
              return (
                <tr key={record.id || `${record.month}-${record.employee_id}`}>
                  <td>
                    <span style={{ fontWeight: 600, color: '#e8f5e9' }}>{record.month}</span>
                  </td>
                  <td className="cell-muted" style={{ textAlign: 'center' }}>
                    {record.working_days_in_month ?? '\u2014'}
                  </td>
                  <td className="cell-muted" style={{ textAlign: 'center' }}>
                    {record.full_days ?? '\u2014'}
                  </td>
                  <td className="cell-muted" style={{ textAlign: 'center' }}>
                    {record.half_days ?? '\u2014'}
                  </td>
                  <td className="cell-muted" style={{ textAlign: 'center' }}>
                    {record.leave_days ?? 0}
                  </td>
                  <td className="cell-muted" style={{ textAlign: 'center' }}>
                    {ot > 0 ? ot : '\u2014'}
                  </td>
                  <td className="cell-muted" style={{ textAlign: 'center' }}>
                    {record.toil_hours ?? 0}
                  </td>
                  <td className="cell-number cell-green">
                    {record.gross_salary != null ? inr(record.gross_salary) : '\u2014'}
                  </td>
                  <td className="cell-number cell-muted">
                    {record.deductions != null ? inr(record.deductions) : '\u2014'}
                  </td>
                  <td className="cell-number cell-gold">
                    {record.net_salary != null ? inr(record.net_salary) : '\u2014'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="neo-btn"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => handleView(record)}
                        title="View details"
                      >
                        <i className="fa-solid fa-eye" />
                      </button>
                      <button
                        type="button"
                        className="neo-btn neo-btn--gold"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => handleDownload(record)}
                        title="Download PDF"
                      >
                        <i className="fa-solid fa-file-pdf" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
