import type { FetsSalaryData } from '@/types';

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
 * Payroll estimate from `fets_salary_data`.
 * Gross never inflates above **monthly basic + OT** unless a clear partial-month pro-rata applies.
 * (The old "days-in-period ÷ base" fallback defaulted to ~30 days and overstated gross vs basic.)
 */
export function computeSalaryBreakdown(row: FetsSalaryData): SalaryBreakdown {
  const monthly = num(row.monthly_salary);
  const daily = num(row.daily_rate);
  const wdMonthRaw = row.working_days_in_month != null && row.working_days_in_month !== '' ? num(row.working_days_in_month) : 0;
  const full = row.full_days != null && row.full_days !== '' ? num(row.full_days) : 0;
  const half = row.half_days != null && row.half_days !== '' ? num(row.half_days) : 0;
  const leave = row.leave_days != null && row.leave_days !== '' ? num(row.leave_days) : 0;
  const ot = num(row.ot_hours) + num(row.extra_ot_hours);

  const worked = full + 0.5 * half;
  /** Use stated working days, else 30 only for hourly / OT factors (not for multiplying pay arbitrarily). */
  const wdMonth = wdMonthRaw > 0 ? wdMonthRaw : 0;
  const denom = wdMonth > 0 ? wdMonth : 30;

  const hourlyFromDaily = daily > 0 ? daily / 8 : 0;
  const hourlyFromMonthly = monthly > 0 ? monthly / denom / 8 : 0;
  const otHourly = hourlyFromDaily > 0 ? hourlyFromDaily : hourlyFromMonthly;
  const otPay = ot > 0 ? ot * otHourly * 1.5 : 0;

  let gross = 0;
  let basis = '';

  if (daily > 0 && worked > 0) {
    gross = worked * daily + otPay;
    basis = 'Daily rate × (full + ½×half) + OT @ 1.5× hourly';
    if (monthly > 0 && gross > monthly + otPay + 0.005) {
      gross = monthly + otPay;
      basis =
        'Monthly basic + OT — daily×attendance would exceed contract basic, so basic salary is used as gross (plus OT)';
    }
  } else if (monthly > 0 && wdMonth > 0 && worked > 0) {
    gross = (monthly / wdMonth) * worked + otPay;
    basis = 'Pro-rata: (monthly ÷ working days in month) × worked units + OT';
    const cap = monthly + otPay + 0.005;
    if (gross > cap) {
      gross = Math.min(gross, cap);
      basis = 'Pro-rata monthly + OT (capped at full monthly basic + OT)';
    }
  } else if (monthly > 0) {
    gross = monthly + otPay;
    basis = ot > 0 ? 'Monthly contract (basic) + OT' : 'Monthly contract (basic) — no attendance override';
  } else if (daily > 0) {
    gross = otPay;
    basis = 'OT only (add worked days or monthly salary for earned pay)';
  } else {
    basis = 'Insufficient data — set monthly salary and/or daily rate with attendance';
  }

  let deductions = 0;
  if (leave > 0) {
    if (daily > 0) deductions = leave * daily;
    else if (monthly > 0 && wdMonth > 0) deductions = leave * (monthly / wdMonth);
    else if (monthly > 0) deductions = leave * (monthly / 30);
  }

  const g = round2(gross);
  const d = round2(deductions);
  const net = Math.max(0, round2(g - d));
  return {
    grossSalary: g,
    deductions: d,
    netSalary: net,
    workedUnits: round2(worked),
    basis,
  };
}
