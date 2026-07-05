import type { Expense, MonthlyPartnerSummary } from '../types';

export function parseAmount(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).replace(/[,\s₹]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function formatINR(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function groupExpensesByMonth(expenses: Expense[]): Record<string, Expense[]> {
  const grouped: Record<string, Expense[]> = {};
  expenses.forEach((e) => {
    const d = new Date(e.date);
    const key = `${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear()}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });
  return grouped;
}

export function computeMonthlyReconciliation(
  expenses: Expense[],
  month: string
): MonthlyPartnerSummary {
  const monthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    const key = `${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear()}`;
    return key === month;
  });

  const mithunTotal = monthExpenses
    .filter((e) => e.paid_by === 'Mithun')
    .reduce((s, e) => s + parseAmount(e.amount), 0);
  
  const niyasTotal = monthExpenses
    .filter((e) => e.paid_by === 'Niyas')
    .reduce((s, e) => s + parseAmount(e.amount), 0);
  
  const companyTotal = monthExpenses
    .filter((e) => e.paid_by === 'Company')
    .reduce((s, e) => s + parseAmount(e.amount), 0);

  const partnerTotal = mithunTotal + niyasTotal;
  const equalShare = partnerTotal / 2;
  
  const mithunOwes = Math.max(0, equalShare - mithunTotal);
  const niyasOwes = Math.max(0, equalShare - niyasTotal);
  
  return {
    month,
    mithunTotal,
    niyasTotal,
    companyTotal,
    grandTotal: partnerTotal + companyTotal,
    equalShare,
    mithunOwes,
    niyasOwes,
    settlementRequired: Math.abs(mithunOwes - niyasOwes) > 0.01,
  };
}
