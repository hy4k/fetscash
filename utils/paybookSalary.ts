import type { FetsSalaryData, SalaryBreakdown } from '../types';

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

export function computeSalaryBreakdown(row: FetsSalaryData & { toil_hours?: number | null }): SalaryBreakdown {
  const monthly = num(row.monthly_salary);
  const daily = num(row.daily_rate);
  const wdMonthRaw = row.working_days_in_month != null ? num(row.working_days_in_month) : 0;
  const full = row.full_days != null ? num(row.full_days) : 0;
  const half = row.half_days != null ? num(row.half_days) : 0;
  const leave = row.leave_days != null ? num(row.leave_days) : 0;
  const ot = num(row.ot_hours) + num(row.extra_ot_hours);
  const toil = num(row.toil_hours);

  const worked = full + 0.5 * half;
  const wdMonth = wdMonthRaw > 0 ? wdMonthRaw : 0;
  const denom = wdMonth > 0 ? wdMonth : 30;

  const hourlyFromDaily = daily > 0 ? daily / 8 : 0;
  const hourlyFromMonthly = monthly > 0 ? monthly / denom / 8 : 0;
  const otHourly = hourlyFromDaily > 0 ? hourlyFromDaily : hourlyFromMonthly;
  
  const effectiveOt = Math.max(0, ot - toil);
  const otPay = effectiveOt > 0 ? effectiveOt * otHourly * 1.5 : 0;

  let gross = 0;
  let basis = '';

  if (daily > 0 && worked > 0) {
    gross = worked * daily + otPay;
    basis = `Daily rate × (full + ½×half) + OT @ 1.5× hourly`;
    if (toil > 0) basis += ` — TOIL ${toil}h deducted from OT`;
    if (monthly > 0 && gross > monthly + otPay + 0.005) {
      gross = monthly + otPay;
      basis = 'Monthly basic + OT — daily×attendance would exceed contract basic';
    }
  } else if (monthly > 0 && wdMonth > 0 && worked > 0) {
    gross = (monthly / wdMonth) * worked + otPay;
    basis = 'Pro-rata: (monthly ÷ working days) × worked + OT';
    if (toil > 0) basis += ` — TOIL ${toil}h deducted`;
    const cap = monthly + otPay + 0.005;
    if (gross > cap) {
      gross = Math.min(gross, cap);
      basis = 'Pro-rata monthly + OT (capped at full basic + OT)';
    }
  } else if (monthly > 0) {
    gross = monthly + otPay;
    basis = ot > 0 ? 'Monthly contract (basic) + OT' : 'Monthly contract (basic)';
    if (toil > 0) basis += ` — TOIL ${toil}h deducted from OT`;
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
