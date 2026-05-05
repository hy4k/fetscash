import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { FetsExpensesData, FetsSalaryData, LocationType } from '../types';
import { Modal } from './Modal';

const labelCls = 'block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5';
const fieldCls = 'neo-input w-full rounded-lg px-3 py-2 text-sm';

export function locationToPaybookLabel(loc: LocationType): string {
  return loc === 'cochin' ? 'Cochin' : 'Calicut';
}

function monthChoices(count = 30): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(x.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
  }
  return out;
}

function defaultMonth(): string {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/** Selector value: load every row regardless of `month` text (handles mismatched formats). */
const PAYBOOK_ALL_PERIODS = '__all__';

function postingMonth(ledgerMonth: string): string {
  return ledgerMonth === PAYBOOK_ALL_PERIODS ? defaultMonth() : ledgerMonth;
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

export const PaybookView: React.FC<PaybookViewProps> = ({ location, primaryColor }) => {
  const [ledgerMonth, setLedgerMonth] = useState<string>(PAYBOOK_ALL_PERIODS);
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

  const months = useMemo(() => monthChoices(), []);

  const locLabel = locationToPaybookLabel(location);
  const showPeriodCol = ledgerMonth === PAYBOOK_ALL_PERIODS;
  const showBranchCol = locationScope === 'all';
  const payrollCarryColSpan = 4 + (showPeriodCol ? 1 : 0) + (showBranchCol ? 1 : 0);
  const sundryCarryColSpan = 3 + (showPeriodCol ? 1 : 0) + (showBranchCol ? 1 : 0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      let salQ = supabase.from('fets_salary_data').select('*');
      if (ledgerMonth !== PAYBOOK_ALL_PERIODS) salQ = salQ.eq('month', ledgerMonth);
      let exQ = supabase.from('fets_expenses_data').select('*');
      if (ledgerMonth !== PAYBOOK_ALL_PERIODS) exQ = exQ.eq('month', ledgerMonth);

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

  const totalPayroll = useMemo(
    () => filteredSalary.reduce((s, r) => s + parseAmountDisplay(r.monthly_salary), 0),
    [filteredSalary]
  );
  const totalSundry = useMemo(
    () => filteredExps.reduce((s, r) => s + parseAmountDisplay(r.amount), 0),
    [filteredExps]
  );
  const grandTotal = totalPayroll + totalSundry;

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
      <div className="glass-panel rounded-2xl p-5 border border-[#85bb65]/15">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-money-gold uppercase tracking-[0.25em] mb-1">Paybook</p>
            <h3 className="text-lg font-serif font-bold text-money-paper">Staff payroll &amp; sundry disbursements</h3>
            <p className="text-xs text-text-secondary mt-1 max-w-xl">
              Period-based ledger for <span className="text-money-green/90 font-mono text-[11px]">fets_salary_data</span> and{' '}
              <span className="text-money-green/90 font-mono text-[11px]">fets_expenses_data</span>. Amounts in INR. Use{' '}
              <strong className="text-money-paper">All periods</strong> if your rows use a different <code className="text-money-green/80">month</code> text than the list. Use{' '}
              <strong className="text-money-paper">All branches</strong> under Locations if payroll/vouchers were saved with another site label.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className={labelCls}>Accounting period (month)</label>
              <select
                className={`${fieldCls} min-w-[220px]`}
                value={ledgerMonth}
                onChange={(e) => setLedgerMonth(e.target.value)}
              >
                <option value={PAYBOOK_ALL_PERIODS}>All periods (show everything)</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Locations</label>
              <select
                className={`${fieldCls} min-w-[220px]`}
                value={locationScope}
                onChange={(e) => setLocationScope(e.target.value as 'all' | 'branch')}
              >
                <option value="all">All branches (legacy / imports)</option>
                <option value="branch">This branch only ({locLabel})</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px] max-w-md">
              <label className={labelCls}>Search ledgers</label>
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xs" />
                <input
                  type="text"
                  className={`${fieldCls} pl-9`}
                  placeholder="Name, designation, category…"
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

      {/* Summary — trial balance style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            {locationScope === 'all' ? 'All branches' : `${locLabel} only`}
          </p>
        </div>
      </div>

      {loading && (
        <div className="text-center text-text-tertiary text-sm py-6">
          <i className="fas fa-circle-notch fa-spin mr-2" />
          Loading ledgers…
        </div>
      )}

      {/* Payroll register */}
      <section className="space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-text-secondary">Payroll register</h4>
            <p className="text-[10px] text-text-tertiary">
              Employee cost sheet
              {ledgerMonth === PAYBOOK_ALL_PERIODS ? ' — all periods' : ` — ${ledgerMonth}`}
            </p>
          </div>
          <button
            type="button"
            onClick={openNewSalary}
            className="neo-btn px-5 py-2.5 rounded-xl text-[11px] font-bold text-money-gold border border-money-gold/25 flex items-center gap-2"
          >
            <i className="fas fa-user-plus" /> Add employee line
          </button>
        </div>
        <div className="glass-panel rounded-2xl overflow-hidden border border-[#85bb65]/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-xs">
              <thead>
                <tr className="bg-[#0c1410]/80 border-b-2 border-[#85bb65]/25">
                  <th className="text-left px-3 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider w-10">#</th>
              {showPeriodCol && (
                    <th className="text-left px-3 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider min-w-[100px]">Period</th>
                  )}
                  {showBranchCol && (
                    <th className="text-left px-3 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider min-w-[88px]">Branch</th>
                  )}
                  <th className="text-left px-3 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider min-w-[140px]">Particulars</th>
                  <th className="text-left px-3 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider">Designation</th>
                  <th className="text-left px-3 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider">ID ref.</th>
                  <th className="text-right px-3 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider">Monthly</th>
                  <th className="text-right px-3 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider">Daily rate</th>
                  <th className="text-right px-3 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider">Work days</th>
                  <th className="text-right px-3 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider">Full / half</th>
                  <th className="text-right px-3 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider">Leave</th>
                  <th className="text-right px-3 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider">OT hrs</th>
                  <th className="text-center px-3 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#85bb65]/10">
                {filteredSalary.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-[#85bb65]/5 font-mono text-[11px]">
                    <td className="px-1 py-2 text-center text-text-tertiary tabular-nums">{idx + 1}</td>
                    {showPeriodCol && (
                      <td className="px-3 py-2 text-text-secondary font-sans text-[10px] whitespace-nowrap">{row.month || '—'}</td>
                    )}
                    {showBranchCol && (
                      <td className="px-3 py-2 text-text-tertiary font-sans text-[10px] whitespace-nowrap">{row.location?.trim() || '—'}</td>
                    )}
                    <td className="px-3 py-2 text-money-paper font-sans font-semibold">{row.name}</td>
                    <td className="px-3 py-2 text-text-secondary font-sans">{row.designation || '—'}</td>
                    <td className="px-3 py-2 text-text-tertiary font-sans">{row.id_num || '—'}</td>
                    <td className="px-3 py-2 text-right text-money-green tabular-nums">{INR(parseAmountDisplay(row.monthly_salary))}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{row.daily_rate ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{row.working_days_in_month ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                      {row.full_days ?? '—'} / {row.half_days ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{row.leave_days ?? 0}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                      {(Number(row.ot_hours) || 0) + (Number(row.extra_ot_hours) || 0)}
                    </td>
                    <td className="px-2 py-2 text-center font-sans">
                      <button
                        type="button"
                        className="text-text-tertiary hover:text-money-gold px-2"
                        onClick={() => row.id != null && openEditSalary(row)}
                        title="Edit"
                      >
                        <i className="fas fa-pen-to-square" />
                      </button>
                      <button
                        type="button"
                        className="text-text-tertiary hover:text-red-400 px-2"
                        onClick={() => row.id != null && setDeleteTarget({ kind: 'salary', id: row.id })}
                        title="Delete"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#0c1410]/90 border-t-2 border-money-gold/30">
                  <td
                    colSpan={payrollCarryColSpan}
                    className="px-3 py-3 text-right font-black text-[10px] uppercase text-money-gold tracking-widest"
                  >
                    carried to summary →
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-money-green tabular-nums text-sm">{INR(totalPayroll)}</td>
                  <td colSpan={6} />
                </tr>
              </tfoot>
            </table>
          </div>
          {!loading && filteredSalary.length === 0 && (
            <div className="text-center py-10 text-text-secondary text-sm">
              <i className="fas fa-users-slash text-2xl mb-2 block opacity-40" />
              No payroll lines. Try <strong>All periods</strong> and <strong>All branches</strong> if data was imported.
            </div>
          )}
        </div>
      </section>

      {/* Cash / sundry disbursements */}
      <section className="space-y-3 pb-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-text-secondary">Sundry disbursements</h4>
            <p className="text-[10px] text-text-tertiary">
              Miscellaneous payments
              {ledgerMonth === PAYBOOK_ALL_PERIODS ? ' — all periods' : ` — ${ledgerMonth}`}
            </p>
          </div>
          <button
            type="button"
            onClick={openNewExp}
            className="neo-btn px-5 py-2.5 rounded-xl text-[11px] font-bold text-money-gold border border-money-gold/25 flex items-center gap-2"
          >
            <i className="fas fa-file-circle-plus" /> Add voucher
          </button>
        </div>
        <div className="glass-panel rounded-2xl overflow-hidden border border-[#85bb65]/10">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#0c1410]/80 border-b-2 border-[#85bb65]/25">
                <th className="text-left px-4 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider w-28">Date</th>
                {showPeriodCol && (
                  <th className="text-left px-4 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider min-w-[96px]">Period</th>
                )}
                {showBranchCol && (
                  <th className="text-left px-4 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider min-w-[88px]">Branch</th>
                )}
                <th className="text-left px-4 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider">Narration</th>
                <th className="text-left px-4 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider">Category</th>
                <th className="text-right px-4 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider min-w-[120px]">Debit (₹)</th>
                <th className="text-center px-4 py-3 font-black text-[9px] text-text-tertiary uppercase tracking-wider w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#85bb65]/10">
              {filteredExps.map((row) => (
                <tr key={row.id} className="hover:bg-[#85bb65]/5">
                  <td className="px-4 py-3 font-mono tabular-nums text-text-secondary align-top">{formatLedgerDate(row.date)}</td>
                  {showPeriodCol && (
                    <td className="px-4 py-3 text-[10px] text-text-secondary whitespace-nowrap align-top">{row.month || '—'}</td>
                  )}
                  {showBranchCol && (
                    <td className="px-4 py-3 text-[10px] text-text-tertiary whitespace-nowrap align-top">{row.location?.trim() || '—'}</td>
                  )}
                  <td className="px-4 py-3 align-top min-w-[160px]">
                    <span className="inline-flex items-start gap-2 max-w-md">
                      {row.color && (
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/10 mt-1" style={{ backgroundColor: row.color }} />
                      )}
                      <span className="font-medium text-money-paper break-words whitespace-normal leading-snug">{row.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary align-top">{row.category || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-amber-100/90 tabular-nums align-top">{INR(parseAmountDisplay(row.amount))}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      className="text-text-tertiary hover:text-money-gold px-2"
                      onClick={() => row.id != null && openEditExp(row)}
                    >
                      <i className="fas fa-pen-to-square" />
                    </button>
                    <button
                      type="button"
                      className="text-text-tertiary hover:text-red-400 px-2"
                      onClick={() => row.id != null && setDeleteTarget({ kind: 'expense', id: row.id })}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#0c1410]/90 border-t-2 border-amber-500/25">
                <td
                  colSpan={sundryCarryColSpan}
                  className="px-4 py-3 text-right font-black text-[10px] uppercase text-amber-200/80 tracking-widest"
                >
                  sundry subtotal →
                </td>
                <td className="px-4 py-3 text-right font-bold text-amber-100 tabular-nums text-sm">{INR(totalSundry)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          {!loading && filteredExps.length === 0 && (
            <div className="text-center py-10 text-text-secondary text-sm">
              <i className="fas fa-receipt text-2xl mb-2 block opacity-40" />
              No sundry vouchers. Try <strong>All periods</strong> and <strong>All branches</strong>.
            </div>
          )}
        </div>
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
              <label className={labelCls}>Ledger month (exact text stored in DB, e.g. January 2026)</label>
              <input
                className={fieldCls}
                placeholder={defaultMonth()}
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
              <label className={labelCls}>Ledger month (DB text)</label>
              <input
                className={fieldCls}
                placeholder={defaultMonth()}
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
