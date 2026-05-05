import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { FetsExpensesData, FetsSalaryData, LocationType } from '../types';
import { Modal } from './Modal';
import { computeSalaryBreakdown } from '../utils/paybookSalary';
import { downloadPayslipPdf, downloadPayrollRegisterPdf, downloadAllPayslipsPdf } from '../utils/paybookPayslip';
import {
  PAYBOOK_ALL_PERIODS,
  canonicalMonthFromDate,
  normalizeMonthToCanonical,
  prettyPeriodLabel,
  periodTechnicalHint,
  rollingCanonicalMonths,
  sortPeriodsDesc,
  monthEqVariants,
} from '../utils/paybookMonth';

const labelCls = 'block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5';
const fieldCls = 'neo-input w-full rounded-lg px-3 py-2 text-sm';

export function locationToPaybookLabel(loc: LocationType): string {
  return loc === 'cochin' ? 'Cochin' : 'Calicut';
}

function postingMonth(ledgerMonth: string): string {
  if (ledgerMonth === PAYBOOK_ALL_PERIODS) return canonicalMonthFromDate();
  return normalizeMonthToCanonical(ledgerMonth) ?? ledgerMonth;
}

function rowMatchesLocation(rowLoc: string | null | undefined, appLoc: LocationType): boolean {
  if (!rowLoc || rowLoc.trim() === '') return true;
  const r = rowLoc.toLowerCase().trim();
  if (appLoc === 'cochin') {
    return (
      r.includes('cochin') ||
      r.includes('kochi') ||
      r.includes('ernakulam') ||
      r.includes('ekm')
    );
  }
  return r.includes('calicut') || r.includes('kozhikode');
}

/** DB may return numeric columns as strings; sheets sometimes store ₹ / commas. */
function parseAmountDisplay(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).replace(/[,\s₹]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function formatLedgerDate(raw: string | null | undefined): string {
  if (raw == null || raw === '') return '—';
  const t = Date.parse(raw);
  if (!Number.isNaN(t)) return new Date(t).toLocaleDateString('en-GB');
  const d = /^\d{4}-\d{2}-\d{2}/.exec(raw);
  if (d) {
    const t2 = Date.parse(d[0]);
    if (!Number.isNaN(t2)) return new Date(t2).toLocaleDateString('en-GB');
  }
  return String(raw).slice(0, 16);
}

const INR = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function parseNum(v: string | number | null | undefined): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,\s₹]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(v: string | number | null | undefined): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

interface PaybookViewProps {
  location: LocationType;
  primaryColor: string;
}

interface SettleCycleRow {
  id: string;
  start_date?: string | null;
  end_date?: string | null;
  is_settled?: boolean | null;
  mithun_total?: number | null;
  niyas_total?: number | null;
}

export const PaybookView: React.FC<PaybookViewProps> = ({ location, primaryColor }) => {
  const [ledgerMonth, setLedgerMonth] = useState<string>(() => canonicalMonthFromDate());
  const [salaryRows, setSalaryRows] = useState<FetsSalaryData[]>([]);
  const [paybookExps, setPaybookExps] = useState<FetsExpensesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  /** When "branch", only rows whose location matches the header toggle (Cochin/Calicut). "all" shows every row (legacy/import). */
  const [locationScope, setLocationScope] = useState<'all' | 'branch'>('all');

  const [salaryModal, setSalaryModal] = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [editingSalary, setEditingSalary] = useState<FetsSalaryData | null>(null);
  const [editingExp, setEditingExp] = useState<FetsExpensesData | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'salary' | 'expense'; id: number } | null>(null);
  const [dbMonths, setDbMonths] = useState<string[]>([]);
  const [settleCycles, setSettleCycles] = useState<SettleCycleRow[]>([]);

  const periodChoices = useMemo(() => {
    const acc = new Set<string>();
    rollingCanonicalMonths(42).forEach((c) => acc.add(c));
    dbMonths.forEach((raw) => {
      const t = raw?.trim();
      if (!t) return;
      const c = normalizeMonthToCanonical(t);
      acc.add(c ?? t);
    });
    return sortPeriodsDesc(Array.from(acc));
  }, [dbMonths]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('settleup_cycles')
        .select('id,start_date,end_date,is_settled,mithun_total,niyas_total')
        .order('created_at', { ascending: false })
        .limit(25);
      if (!cancelled && !error && data) setSettleCycles(data as SettleCycleRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const locLabel = locationToPaybookLabel(location);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      let salQ = supabase.from('fets_salary_data').select('*');
      if (ledgerMonth !== PAYBOOK_ALL_PERIODS) {
        const vs = monthEqVariants(ledgerMonth);
        salQ = vs.length <= 1 ? salQ.eq('month', vs[0]) : salQ.in('month', vs);
      }
      let exQ = supabase.from('fets_expenses_data').select('*');
      if (ledgerMonth !== PAYBOOK_ALL_PERIODS) {
        const vs = monthEqVariants(ledgerMonth);
        exQ = vs.length <= 1 ? exQ.eq('month', vs[0]) : exQ.in('month', vs);
      }

      const [{ data: sal, error: e1 }, { data: ex, error: e2 }] = await Promise.all([
        salQ.order('name'),
        exQ.order('id', { ascending: false }),
      ]);

      const parts: string[] = [];
      if (e1) {
        console.error('fets_salary_data', e1);
        parts.push(`Salary table: ${e1.message}`);
      }
      if (e2) {
        console.error('fets_expenses_data', e2);
        parts.push(`Expenses table: ${e2.message}`);
      }
      setFetchError(parts.length ? parts.join(' ') : null);

      setSalaryRows(
        (sal || []).filter((r) => locationScope === 'all' || rowMatchesLocation(r.location, location))
      );
      setPaybookExps(
        (ex || []).filter((r) => locationScope === 'all' || rowMatchesLocation(r.location, location))
      );

      const [rm, em] = await Promise.all([
        supabase.from('fets_salary_data').select('month').limit(8000),
        supabase.from('fets_expenses_data').select('month').limit(8000),
      ]);
      const mu = new Set<string>();
      (rm.data || []).forEach((r: { month?: string | null }) => {
        if (r.month?.trim()) mu.add(r.month.trim());
      });
      (em.data || []).forEach((r: { month?: string | null }) => {
        if (r.month?.trim()) mu.add(r.month.trim());
      });
      setDbMonths(Array.from(mu));
    } finally {
      setLoading(false);
    }
  }, [ledgerMonth, location, locationScope]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredSalary = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return salaryRows;
    return salaryRows.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.designation || '').toLowerCase().includes(q) ||
        (r.id_num || '').toLowerCase().includes(q)
    );
  }, [salaryRows, search]);

  const filteredExps = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return paybookExps;
    return paybookExps.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q)
    );
  }, [paybookExps, search]);

  const periodSummaryLabel =
    ledgerMonth === PAYBOOK_ALL_PERIODS ? 'All periods' : prettyPeriodLabel(ledgerMonth);

  const payrollPdfTitle =
    ledgerMonth === PAYBOOK_ALL_PERIODS ? 'All periods' : `${prettyPeriodLabel(ledgerMonth)} (${periodTechnicalHint(ledgerMonth)})`;

  const totalPayroll = useMemo(
    () => filteredSalary.reduce((s, r) => s + parseAmountDisplay(r.monthly_salary), 0),
    [filteredSalary]
  );
  const totalSundry = useMemo(
    () => filteredExps.reduce((s, r) => s + parseAmountDisplay(r.amount), 0),
    [filteredExps]
  );
  const grandTotal = totalPayroll + totalSundry;

  const { totalGrossPay, totalDeductions, totalNetPay } = useMemo(() => {
    let g = 0;
    let d = 0;
    let n = 0;
    filteredSalary.forEach((r) => {
      const b = computeSalaryBreakdown(r);
      g += b.grossSalary;
      d += b.deductions;
      n += b.netSalary;
    });
    return { totalGrossPay: g, totalDeductions: d, totalNetPay: n };
  }, [filteredSalary]);

  const openNewSalary = () => {
    setEditingSalary({
      month: postingMonth(ledgerMonth),
      name: '',
      location: locLabel,
      monthly_salary: null,
      daily_rate: null,
      start_date: null,
      end_date: null,
      leave_days: 0,
      ot_hours: 0,
      full_days: null,
      half_days: null,
      designation: '',
      id_num: '',
      working_days_in_month: null,
      extra_ot_hours: null,
    });
    setSalaryModal(true);
  };

  const openEditSalary = (row: FetsSalaryData) => {
    setEditingSalary({ ...row });
    setSalaryModal(true);
  };

  const openNewExp = () => {
    setEditingExp({
      name: '',
      amount: 0,
      location: locLabel,
      month: postingMonth(ledgerMonth),
      date: new Date().toISOString().split('T')[0],
      category: '',
      color: '#85bb65',
    });
    setExpModal(true);
  };

  const openRentExpense = () => {
    setEditingExp({
      name: 'Rent — ',
      amount: 0,
      location: locLabel,
      month: postingMonth(ledgerMonth),
      date: new Date().toISOString().split('T')[0],
      category: 'Rent',
      color: '#d4af37',
    });
    setExpModal(true);
  };

  const openEditExp = (row: FetsExpensesData) => {
    setEditingExp({ ...row });
    setExpModal(true);
  };

  const saveSalary = async () => {
    if (!editingSalary?.name?.trim()) {
      alert('Employee name is required.');
      return;
    }
    const payload: Record<string, unknown> = {
      month: (editingSalary.month && editingSalary.month.trim()) || postingMonth(ledgerMonth),
      name: editingSalary.name.trim(),
      location: locLabel,
      designation: editingSalary.designation?.trim() || null,
      id_num: editingSalary.id_num?.trim() || null,
      monthly_salary: parseNum(editingSalary.monthly_salary as any),
      daily_rate: parseNum(editingSalary.daily_rate as any),
      start_date: parseIntOrNull(editingSalary.start_date as any),
      end_date: parseIntOrNull(editingSalary.end_date as any),
      leave_days: parseIntOrNull(editingSalary.leave_days as any) ?? 0,
      ot_hours: parseNum(editingSalary.ot_hours as any) ?? 0,
      full_days: parseIntOrNull(editingSalary.full_days as any),
      half_days: parseIntOrNull(editingSalary.half_days as any),
      working_days_in_month: parseIntOrNull(editingSalary.working_days_in_month as any),
      extra_ot_hours: parseNum(editingSalary.extra_ot_hours as any),
    };

    if (editingSalary.id) {
      const { error } = await supabase.from('fets_salary_data').update(payload).eq('id', editingSalary.id);
      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('fets_salary_data').insert(payload);
      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }
    }
    setSalaryModal(false);
    setEditingSalary(null);
    refresh();
  };

  const saveExp = async () => {
    if (!editingExp?.name?.trim()) {
      alert('Description / payee name is required.');
      return;
    }
    const amt = parseNum(editingExp.amount as any);
    if (amt === null || amt < 0) {
      alert('Enter a valid amount.');
      return;
    }
    const payload: Record<string, unknown> = {
      name: editingExp.name.trim(),
      amount: amt,
      location: locLabel,
      month: (editingExp.month && editingExp.month.trim()) || postingMonth(ledgerMonth),
      category: editingExp.category?.trim() || null,
      color: editingExp.color || null,
      date: editingExp.date || null,
    };

    if (editingExp.id) {
      const { error } = await supabase.from('fets_expenses_data').update(payload).eq('id', editingExp.id);
      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('fets_expenses_data').insert(payload);
      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }
    }
    setExpModal(false);
    setEditingExp(null);
    refresh();
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'salary') {
      const { error } = await supabase.from('fets_salary_data').delete().eq('id', deleteTarget.id);
      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('fets_expenses_data').delete().eq('id', deleteTarget.id);
      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }
    }
    setDeleteTarget(null);
    refresh();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Ledger control bar — accounts period */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-[#85bb65]/15">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-5">
            <p className="text-[10px] font-black text-money-gold uppercase tracking-[0.22em] mb-1">Paybook</p>
            <h3 className="text-xl font-serif font-bold text-money-paper leading-tight">Payroll &amp; sundry vouchers</h3>
            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
              Opens on <strong className="text-money-paper">this calendar month</strong> only. Use the period list for history, or “All
              periods” when auditing imports. Data: <code className="text-money-green/85 text-[10px]">fets_salary_data</code>,{' '}
              <code className="text-money-green/85 text-[10px]">fets_expenses_data</code>.
            </p>
          </div>
          <div className="lg:col-span-7 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Period</label>
              <select
                className={`${fieldCls} w-full min-w-0`}
                value={ledgerMonth}
                onChange={(e) => setLedgerMonth(e.target.value)}
              >
                {periodChoices.map((value) => (
                  <option key={value} value={value}>
                    {prettyPeriodLabel(value)} — {periodTechnicalHint(value)}
                  </option>
                ))}
                <option value={PAYBOOK_ALL_PERIODS}>{prettyPeriodLabel(PAYBOOK_ALL_PERIODS)}</option>
              </select>
              <p className="text-[10px] text-text-tertiary mt-1.5">Readable month name + storage key (e.g. Sep-2025).</p>
            </div>
            <div>
              <label className={labelCls}>Branch filter</label>
              <select
                className={`${fieldCls} w-full min-w-0`}
                value={locationScope}
                onChange={(e) => setLocationScope(e.target.value as 'all' | 'branch')}
              >
                <option value="all">All branches</option>
                <option value="branch">This branch only ({locLabel})</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Search</label>
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xs" />
                <input
                  type="text"
                  className={`${fieldCls} pl-9 w-full`}
                  placeholder="Name, designation, voucher category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-red-400/50 bg-red-950/50 px-4 py-3 text-sm text-red-200/95">
          <p className="font-bold text-red-300 mb-1 uppercase text-[10px] tracking-wider">Paybook data error</p>
          <p>{fetchError}</p>
        </div>
      )}

      {settleCycles.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-[#85bb65]/15">
          <h4 className="text-sm font-black uppercase tracking-widest text-text-secondary mb-3">SettleUp cycles</h4>
          <p className="text-[10px] text-text-tertiary mb-3">
            From <code className="text-money-green/90">settleup_cycles</code> (reference:{' '}
            <a href="https://github.com/hy4k/paybook" className="text-money-gold underline" target="_blank" rel="noreferrer">
              hy4k/paybook
            </a>
            ).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#85bb65]/20 text-text-tertiary uppercase text-[9px]">
                  <th className="text-left py-2">Period</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Mithun</th>
                  <th className="text-right py-2">Niyas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#85bb65]/10">
                {settleCycles.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 text-text-secondary">
                      {c.start_date ? new Date(c.start_date).toLocaleDateString('en-GB') : '—'} —{' '}
                      {c.end_date ? new Date(c.end_date).toLocaleDateString('en-GB') : '…'}
                    </td>
                    <td className="py-2">{c.is_settled ? 'Settled' : 'Active'}</td>
                    <td className="py-2 text-right tabular-nums">{INR(Number(c.mithun_total) || 0)}</td>
                    <td className="py-2 text-right tabular-nums">{INR(Number(c.niyas_total) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary — trial balance style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="glass-panel rounded-xl p-5 border border-[#85bb65]/20"
          style={{ borderLeftColor: primaryColor, borderLeftWidth: 3 }}
        >
          <p className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold">Dr — Payroll (contract)</p>
          <p className="text-2xl font-bold tabular-nums text-money-green mt-1">{INR(totalPayroll)}</p>
          <p className="text-[10px] text-text-tertiary mt-2">{filteredSalary.length} employee(s)</p>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-[#85bb65]/20 border-l-amber-500/60 border-l-[3px]">
          <p className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold">Dr — Sundry &amp; misc.</p>
          <p className="text-2xl font-bold tabular-nums text-amber-200/90 mt-1">{INR(totalSundry)}</p>
          <p className="text-[10px] text-text-tertiary mt-2">{filteredExps.length} voucher(s)</p>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-money-gold/30 bg-[#0c1410]/40">
          <p className="text-[10px] uppercase tracking-widest text-money-gold font-bold">Period total (paybook)</p>
          <p className="text-2xl font-serif font-bold tabular-nums text-money-gold mt-1">{INR(grandTotal)}</p>
          <p className="text-[10px] text-text-secondary mt-2">
            {periodSummaryLabel}
            {locationScope === 'all' ? '' : ` · ${locLabel}`}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-5 border border-emerald-500/30 border-l-[3px] border-l-emerald-400/50">
          <p className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold">Net pay (estimated)</p>
          <p className="text-2xl font-bold tabular-nums text-emerald-200 mt-1">{INR(totalNetPay)}</p>
          <p className="text-[10px] text-text-tertiary mt-2">
            Gross {INR(totalGrossPay)} · Ded. {INR(totalDeductions)}
          </p>
        </div>
      </div>

      {loading && (
        <div className="text-center text-text-tertiary text-sm py-6">
          <i className="fas fa-circle-notch fa-spin mr-2" />
          Loading ledgers…
        </div>
      )}

      {/* Payroll — card layout (no horizontal scroll for actions) */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h4 className="text-sm font-black uppercase tracking-widest text-text-secondary">Payroll</h4>
            <p className="text-xs text-text-tertiary mt-1">
              <span className="text-money-paper font-semibold">{periodSummaryLabel}</span>
              {ledgerMonth !== PAYBOOK_ALL_PERIODS && (
                <span className="text-text-tertiary/75"> · stored as {periodTechnicalHint(ledgerMonth)}</span>
              )}
            </p>
            <p className="text-[10px] text-text-tertiary/85 mt-2 max-w-xl leading-relaxed">
              Estimates from attendance + contract rates. Use <strong>Expand</strong> for every field; actions stay on the right without
              scrolling the sheet.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openRentExpense}
              className="neo-btn px-4 py-2.5 rounded-xl text-[11px] font-bold text-amber-200 border border-amber-500/30 inline-flex items-center gap-2"
            >
              <i className="fas fa-building" /> Add rent
            </button>
            <button
              type="button"
              onClick={() => downloadPayrollRegisterPdf(filteredSalary, payrollPdfTitle)}
              disabled={filteredSalary.length === 0}
              className="neo-btn px-4 py-2.5 rounded-xl text-[11px] font-bold text-text-secondary border border-[#85bb65]/25 inline-flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <i className="fas fa-table" /> Summary table PDF
            </button>
            <button
              type="button"
              onClick={() => downloadAllPayslipsPdf(filteredSalary, payrollPdfTitle)}
              disabled={filteredSalary.length === 0}
              className="neo-btn px-4 py-2.5 rounded-xl text-[11px] font-bold text-sky-200/95 border border-sky-500/35 inline-flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <i className="fas fa-file-pdf" /> All payslips (one PDF)
            </button>
            <button
              type="button"
              onClick={openNewSalary}
              className="neo-btn px-5 py-2.5 rounded-xl text-[11px] font-bold text-money-gold border border-money-gold/25 inline-flex items-center gap-2"
            >
              <i className="fas fa-user-plus" /> Add employee
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredSalary.map((row, idx) => {
            const b = computeSalaryBreakdown(row);
            return (
              <div
                key={row.id ?? idx}
                className="rounded-2xl border border-[#85bb65]/15 bg-[#0c1410]/55 overflow-hidden shadow-sm shadow-black/20"
              >
                <div className="flex flex-wrap items-stretch gap-3 p-4 sm:gap-4">
                  <div className="flex items-center justify-center w-9 shrink-0 rounded-lg bg-black/25 text-text-tertiary text-xs font-mono tabular-nums">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-money-paper text-sm leading-snug">{row.name || '—'}</div>
                    <div className="text-[11px] text-text-tertiary mt-0.5 space-x-1.5 space-y-0.5">
                      <span>{row.designation || 'No designation'}</span>
                      <span className="text-text-tertiary/50">·</span>
                      <span>{row.location?.trim() || 'Any branch'}</span>
                      {ledgerMonth === PAYBOOK_ALL_PERIODS && (
                        <>
                          <span className="text-text-tertiary/50">·</span>
                          <span className="font-mono text-[10px]">{row.month || '—'}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-4 sm:gap-6">
                    <div className="text-right min-w-[7rem]">
                      <div className="text-[9px] uppercase tracking-wider text-text-tertiary font-bold">Gross est.</div>
                      <div className="text-sm font-bold tabular-nums text-money-green/90">{INR(b.grossSalary)}</div>
                    </div>
                    <div className="text-right min-w-[7rem]">
                      <div className="text-[9px] uppercase tracking-wider text-text-tertiary font-bold">Net est.</div>
                      <div className="text-lg font-bold tabular-nums text-emerald-200 leading-none">{INR(b.netSalary)}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 border-l border-[#85bb65]/15 pl-3 ml-auto">
                      <button
                        type="button"
                        className="p-2.5 rounded-xl text-text-tertiary hover:text-money-gold hover:bg-[#85bb65]/10 transition-colors"
                        onClick={() => row.id != null && openEditSalary(row)}
                        title="Edit"
                        aria-label="Edit payroll line"
                      >
                        <i className="fas fa-pen-to-square" />
                      </button>
                      <button
                        type="button"
                        className="p-2.5 rounded-xl text-text-tertiary hover:text-sky-300 hover:bg-sky-500/10 transition-colors"
                        onClick={() => downloadPayslipPdf(row, b)}
                        title="Download payslip PDF"
                        aria-label="Download payslip PDF"
                      >
                        <i className="fas fa-file-pdf" />
                      </button>
                      <button
                        type="button"
                        className="p-2.5 rounded-xl text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        onClick={() => row.id != null && setDeleteTarget({ kind: 'salary', id: row.id })}
                        title="Delete"
                        aria-label="Delete payroll line"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                </div>
                <details className="group border-t border-[#85bb65]/10 bg-black/15 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="cursor-pointer select-none px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary hover:text-money-green flex items-center gap-2">
                    <i className="fas fa-chevron-right text-[9px] transition-transform group-open:rotate-90" />
                    Expand — attendance, rates, deductions
                  </summary>
                  <div className="px-4 pb-4 pt-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-[11px] font-mono text-text-secondary">
                    <div>
                      <span className="text-text-tertiary text-[9px] uppercase block">Monthly</span>
                      {INR(parseAmountDisplay(row.monthly_salary))}
                    </div>
                    <div>
                      <span className="text-text-tertiary text-[9px] uppercase block">Daily rate</span>
                      {row.daily_rate ?? '—'}
                    </div>
                    <div>
                      <span className="text-text-tertiary text-[9px] uppercase block">Work days (month)</span>
                      {row.working_days_in_month ?? '—'}
                    </div>
                    <div>
                      <span className="text-text-tertiary text-[9px] uppercase block">Full / half</span>
                      {row.full_days ?? '—'} / {row.half_days ?? '—'}
                    </div>
                    <div>
                      <span className="text-text-tertiary text-[9px] uppercase block">Leave</span>
                      {row.leave_days ?? 0}
                    </div>
                    <div>
                      <span className="text-text-tertiary text-[9px] uppercase block">OT hours</span>
                      {(Number(row.ot_hours) || 0) + (Number(row.extra_ot_hours) || 0)}
                    </div>
                    <div>
                      <span className="text-text-tertiary text-[9px] uppercase block">Deductions est.</span>
                      {INR(b.deductions)}
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4">
                      <span className="text-text-tertiary text-[9px] uppercase block">Basis</span>
                      <span className="font-sans text-[11px] text-text-secondary/95 leading-snug">{b.basis}</span>
                    </div>
                  </div>
                </details>
              </div>
            );
          })}
        </div>

        {!loading && filteredSalary.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#85bb65]/25 bg-[#0c1410]/30 text-center py-12 text-text-secondary text-sm px-4">
            <i className="fas fa-users-slash text-2xl mb-2 block opacity-40" />
            No payroll for <strong className="text-money-paper">{periodSummaryLabel}</strong>. Try another period or{' '}
            <strong>All periods</strong> / <strong>All branches</strong>.
          </div>
        )}
      </section>

      {/* Sundry vouchers — cards */}
      <section className="space-y-4 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-text-secondary">Sundry vouchers</h4>
            <p className="text-xs text-text-tertiary mt-1">
              <span className="text-money-paper font-semibold">{periodSummaryLabel}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={openNewExp}
            className="neo-btn px-5 py-2.5 rounded-xl text-[11px] font-bold text-money-gold border border-money-gold/25 inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <i className="fas fa-file-circle-plus" /> Add voucher
          </button>
        </div>

        <div className="space-y-2.5">
          {filteredExps.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-[#85bb65]/12 bg-[#0c1410]/50 p-4 flex flex-wrap gap-3 items-start justify-between"
            >
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="shrink-0 text-[11px] font-mono text-text-tertiary tabular-nums w-[5.5rem]">
                  {formatLedgerDate(row.date)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-start gap-2">
                    {row.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 border border-white/10"
                        style={{ backgroundColor: row.color }}
                      />
                    )}
                    <span className="font-medium text-money-paper text-sm leading-snug break-words">{row.name}</span>
                  </div>
                  <div className="text-[10px] text-text-tertiary mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span className="rounded-md bg-black/20 px-1.5 py-0.5">{row.category || 'Uncategorised'}</span>
                    {ledgerMonth === PAYBOOK_ALL_PERIODS && (
                      <span className="font-mono">{row.month || '—'}</span>
                    )}
                    {row.location?.trim() && <span>{row.location.trim()}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                  <div className="text-[9px] uppercase text-text-tertiary font-bold">Amount</div>
                  <div className="text-base font-bold tabular-nums text-amber-100/90">{INR(parseAmountDisplay(row.amount))}</div>
                </div>
                <div className="flex gap-1 border-l border-[#85bb65]/15 pl-3">
                  <button
                    type="button"
                    className="p-2.5 rounded-xl text-text-tertiary hover:text-money-gold hover:bg-[#85bb65]/10"
                    onClick={() => row.id != null && openEditExp(row)}
                    aria-label="Edit voucher"
                  >
                    <i className="fas fa-pen-to-square" />
                  </button>
                  <button
                    type="button"
                    className="p-2.5 rounded-xl text-text-tertiary hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => row.id != null && setDeleteTarget({ kind: 'expense', id: row.id })}
                    aria-label="Delete voucher"
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && filteredExps.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#85bb65]/25 bg-[#0c1410]/30 text-center py-12 text-text-secondary text-sm px-4">
            <i className="fas fa-receipt text-2xl mb-2 block opacity-40" />
            No sundry vouchers for <strong className="text-money-paper">{periodSummaryLabel}</strong>. Change period or branch filter.
          </div>
        )}
      </section>

      {/* Salary modal */}
      <Modal
        isOpen={salaryModal}
        onClose={() => {
          setSalaryModal(false);
          setEditingSalary(null);
        }}
        title={editingSalary?.id ? 'Edit payroll line' : 'New payroll line'}
        maxWidthClass="max-w-3xl"
      >
        {editingSalary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="sm:col-span-2">
              <label className={labelCls}>Employee name</label>
              <input
                className={fieldCls}
                value={editingSalary.name}
                onChange={(e) => setEditingSalary({ ...editingSalary, name: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>
                Ledger month (matches sheet, e.g. <span className="font-mono text-money-green/90">Sep-2025</span>)
              </label>
              <input
                className={fieldCls}
                placeholder={postingMonth(ledgerMonth)}
                value={editingSalary.month || ''}
                onChange={(e) => setEditingSalary({ ...editingSalary, month: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Designation</label>
              <input
                className={fieldCls}
                value={editingSalary.designation || ''}
                onChange={(e) => setEditingSalary({ ...editingSalary, designation: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>ID / document ref.</label>
              <input
                className={fieldCls}
                value={editingSalary.id_num || ''}
                onChange={(e) => setEditingSalary({ ...editingSalary, id_num: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Monthly salary (₹)</label>
              <input
                type="number"
                step="0.01"
                className={fieldCls}
                value={editingSalary.monthly_salary ?? ''}
                onChange={(e) => setEditingSalary({ ...editingSalary, monthly_salary: e.target.value as any })}
              />
            </div>
            <div>
              <label className={labelCls}>Daily rate (₹)</label>
              <input
                type="number"
                step="0.01"
                className={fieldCls}
                value={editingSalary.daily_rate ?? ''}
                onChange={(e) => setEditingSalary({ ...editingSalary, daily_rate: e.target.value as any })}
              />
            </div>
            <div>
              <label className={labelCls}>Working days in month</label>
              <input
                type="number"
                className={fieldCls}
                value={editingSalary.working_days_in_month ?? ''}
                onChange={(e) => setEditingSalary({ ...editingSalary, working_days_in_month: e.target.value as any })}
              />
            </div>
            <div>
              <label className={labelCls}>Full days / half days</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Full"
                  className={fieldCls}
                  value={editingSalary.full_days ?? ''}
                  onChange={(e) => setEditingSalary({ ...editingSalary, full_days: e.target.value as any })}
                />
                <input
                  type="number"
                  placeholder="Half"
                  className={fieldCls}
                  value={editingSalary.half_days ?? ''}
                  onChange={(e) => setEditingSalary({ ...editingSalary, half_days: e.target.value as any })}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Leave days</label>
              <input
                type="number"
                className={fieldCls}
                value={editingSalary.leave_days ?? ''}
                onChange={(e) => setEditingSalary({ ...editingSalary, leave_days: e.target.value as any })}
              />
            </div>
            <div>
              <label className={labelCls}>OT hours / extra OT</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="OT"
                  className={fieldCls}
                  value={editingSalary.ot_hours ?? ''}
                  onChange={(e) => setEditingSalary({ ...editingSalary, ot_hours: e.target.value as any })}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Extra"
                  className={fieldCls}
                  value={editingSalary.extra_ot_hours ?? ''}
                  onChange={(e) => setEditingSalary({ ...editingSalary, extra_ot_hours: e.target.value as any })}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Period start (day of month)</label>
              <input
                type="number"
                className={fieldCls}
                value={editingSalary.start_date ?? ''}
                onChange={(e) => setEditingSalary({ ...editingSalary, start_date: e.target.value as any })}
              />
            </div>
            <div>
              <label className={labelCls}>Period end (day of month)</label>
              <input
                type="number"
                className={fieldCls}
                value={editingSalary.end_date ?? ''}
                onChange={(e) => setEditingSalary({ ...editingSalary, end_date: e.target.value as any })}
              />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end pt-4 border-t border-[#85bb65]/10">
              <button type="button" className="neo-btn px-5 py-2.5 rounded-xl text-xs font-bold text-text-secondary" onClick={() => setSalaryModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="neo-btn px-5 py-2.5 rounded-xl text-xs font-bold text-money-gold border border-money-gold/30"
                onClick={saveSalary}
              >
                Post to ledger
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Sundry expense modal */}
      <Modal
        isOpen={expModal}
        onClose={() => {
          setExpModal(false);
          setEditingExp(null);
        }}
        title={editingExp?.id ? 'Edit voucher' : 'New voucher'}
        maxWidthClass="max-w-lg"
      >
        {editingExp && (
          <div className="space-y-4 text-sm">
            <div>
              <label className={labelCls}>Narration / payee</label>
              <input
                className={fieldCls}
                value={editingExp.name}
                onChange={(e) => setEditingExp({ ...editingExp, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>
                Ledger month (e.g. <span className="font-mono text-money-green/90">Sep-2025</span>)
              </label>
              <input
                className={fieldCls}
                placeholder={postingMonth(ledgerMonth)}
                value={editingExp.month || ''}
                onChange={(e) => setEditingExp({ ...editingExp, month: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className={fieldCls}
                  value={editingExp.amount}
                  onChange={(e) => setEditingExp({ ...editingExp, amount: e.target.value as any })}
                />
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input
                  type="date"
                  className={fieldCls}
                  value={((editingExp.date as string) || '').slice(0, 10)}
                  onChange={(e) => setEditingExp({ ...editingExp, date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <input
                className={fieldCls}
                placeholder="e.g. Stationery, Travel"
                value={editingExp.category || ''}
                onChange={(e) => setEditingExp({ ...editingExp, category: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Tag colour</label>
              <input
                type="color"
                className="h-10 w-full rounded-lg cursor-pointer bg-[#131f19] border border-[#85bb65]/20"
                value={editingExp.color || '#85bb65'}
                onChange={(e) => setEditingExp({ ...editingExp, color: e.target.value })}
              />
            </div>
            <p className="text-[10px] text-text-tertiary">
              Branch <span className="text-money-green">{locLabel}</span> is set from the header toggle. Set ledger month above to match existing rows in Supabase.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" className="neo-btn px-5 py-2.5 rounded-xl text-xs font-bold text-text-secondary" onClick={() => setExpModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="neo-btn px-5 py-2.5 rounded-xl text-xs font-bold text-money-gold border border-money-gold/30"
                onClick={saveExp}
              >
                Post voucher
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove ledger line">
        <div className="space-y-5">
          <p className="text-sm text-text-secondary">
            This will permanently remove the row from the paybook table. Continue?
          </p>
          <div className="flex gap-3 justify-end">
            <button type="button" className="neo-btn px-5 py-2.5 rounded-xl text-xs font-bold text-text-secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="neo-btn px-5 py-2.5 rounded-xl text-xs font-bold text-red-400 border border-red-400/30"
              onClick={executeDelete}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
