import type { FetsSalaryData } from '../types';

function num(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).replace(/[,\s₹]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface SalaryBreakdown {
  grossSalary: number;
  deductions: number;
  netSalary: number;
  workedUnits: number;
  basis: string;
}

/**
 * Payroll estimate from fets_salary_data rows (reference: hy4k/paybook gross / deductions / net).
 * Order: daily-rate + attendance + OT → else pro-rata monthly using working days → else period slice using start/end day.
 */
export function computeSalaryBreakdown(row: FetsSalaryData): SalaryBreakdown {
  const monthly = num(row.monthly_salary);
  const daily = num(row.daily_rate);
  const wdMonth = row.working_days_in_month != null ? num(row.working_days_in_month) : 0;
  const full = row.full_days != null ? num(row.full_days) : 0;
  const half = row.half_days != null ? num(row.half_days) : 0;
  const leave = row.leave_days != null ? num(row.leave_days) : 0;
  const ot = num(row.ot_hours) + num(row.extra_ot_hours);

  const worked = full + 0.5 * half;
  const hourlyFromDaily = daily > 0 ? daily / 8 : 0;

  let gross = 0;
  let basis = '';

  if (daily > 0 && (worked > 0 || ot > 0)) {
    gross = worked * daily + ot * hourlyFromDaily * 1.5;
    basis = 'Daily rate × (full + ½×half) + OT @ 1.5× (daily÷8)';
  } else if (monthly > 0 && wdMonth > 0 && worked > 0) {
    gross = (monthly / wdMonth) * worked + ot * (monthly / wdMonth / 8) * 1.5;
    basis = 'Pro-rata: (monthly ÷ working days in month) × worked units + OT';
  } else if (monthly > 0) {
    const start = row.start_date != null ? Math.min(31, Math.max(1, num(row.start_date))) : 1;
    const end = row.end_date != null ? Math.min(31, Math.max(1, num(row.end_date))) : 30;
    const span = Math.max(1, end - start + 1);
    const denom = wdMonth > 0 ? wdMonth : 30;
    gross = (monthly / denom) * span;
    if (ot > 0 && monthly > 0 && denom > 0) {
      gross += ot * (monthly / denom / 8) * 1.5;
    }
    basis = 'Approx. from monthly × days in row period ÷ base days';
  } else {
    basis = 'Insufficient data (add monthly salary or daily rate)';
  }

  let deductions = 0;
  if (leave > 0) {
    if (daily > 0) deductions = leave * daily;
    else if (monthly > 0 && wdMonth > 0) deductions = leave * (monthly / wdMonth);
    else if (monthly > 0) deductions = leave * (monthly / 30);
  }

  const net = Math.max(0, gross - deductions);
  return {
    grossSalary: round2(gross),
    deductions: round2(deductions),
    netSalary: round2(net),
    workedUnits: round2(worked),
    basis,
  };
}
