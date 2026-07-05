import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { Expense, MonthlyPartnerSummary } from '../types';
import { formatINR, computeMonthlyReconciliation } from '../utils/reconciliation';
import { prettyPeriodLabel, sortPeriodsDesc } from '../utils/paybookMonth';

// ─── Types ───────────────────────────────────────────────────
interface SettleUpCycle {
  id: number;
  created_at?: string;
  settled_date?: string | null;
  settlement_method?: string | null;
  mithun_total?: number | null;
  niyas_total?: number | null;
}

interface SettleUpContribution {
  id: number;
  created_at?: string;
  date?: string | null;
  amount: number;
  description?: string | null;
  contributor?: string | null;
  is_settled?: boolean | null;
  cycle_id?: number | null;
}

interface ReconciliationViewProps {
  expenses: Expense[];
}

// ─── Component ───────────────────────────────────────────────
export default function ReconciliationView({ expenses }: ReconciliationViewProps) {
  // ── Months ──────────────────────────────────────────────
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    expenses.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear()}`;
      months.add(key);
    });
    return sortPeriodsDesc(Array.from(months));
  }, [expenses]);

  const defaultMonth = useMemo(() => {
    return availableMonths[0] || '';
  }, [availableMonths]);

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  useEffect(() => {
    if (!selectedMonth && defaultMonth) {
      setSelectedMonth(defaultMonth);
    }
  }, [defaultMonth, selectedMonth]);

  // ── Reconciliation ──────────────────────────────────────
  const summary: MonthlyPartnerSummary | null = useMemo(() => {
    if (!selectedMonth) return null;
    return computeMonthlyReconciliation(expenses, selectedMonth);
  }, [expenses, selectedMonth]);

  // ── Month expenses ──────────────────────────────────────
  const monthExpenses = useMemo(() => {
    if (!selectedMonth) return [];
    return expenses
      .filter((e) => {
        const d = new Date(e.date);
        const key = `${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear()}`;
        return key === selectedMonth;
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [expenses, selectedMonth]);

  // ── Settleup data ───────────────────────────────────────
  const [cycles, setCycles] = useState<SettleUpCycle[]>([]);
  const [contributions, setContributions] = useState<SettleUpContribution[]>([]);
  const [loadingSettleup, setLoadingSettleup] = useState(false);
  const [showSettleForm, setShowSettleForm] = useState(false);
  const [settleForm, setSettleForm] = useState({
    from: 'Mithun' as 'Mithun' | 'Niyas',
    to: 'Niyas' as 'Mithun' | 'Niyas',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'Bank Transfer',
    note: '',
  });
  const [savingSettle, setSavingSettle] = useState(false);

  const fetchSettleup = async () => {
    setLoadingSettleup(true);
    const [{ data: cyc }, { data: con }] = await Promise.all([
      supabase.from('settleup_cycles').select('*').order('created_at', { ascending: false }),
      supabase.from('settleup_contributions').select('*').order('date', { ascending: false }),
    ]);
    if (cyc) setCycles(cyc as SettleUpCycle[]);
    if (con) setContributions(con as SettleUpContribution[]);
    setLoadingSettleup(false);
  };

  useEffect(() => {
    fetchSettleup();
  }, []);

  const handleRecordSettlement = async () => {
    const amount = parseFloat(settleForm.amount);
    if (!amount || amount <= 0) return;

    setSavingSettle(true);
    // Insert a new cycle
    const { data: cycleData } = await supabase
      .from('settleup_cycles')
      .insert({
        settled_date: settleForm.date,
        settlement_method: settleForm.method,
        mithun_total: settleForm.from === 'Mithun' ? amount : 0,
        niyas_total: settleForm.from === 'Niyas' ? amount : 0,
      })
      .select()
      .single();

    if (cycleData) {
      await supabase.from('settleup_contributions').insert({
        date: settleForm.date,
        amount,
        description: settleForm.note || `Settlement from ${settleForm.from} to ${settleForm.to}`,
        contributor: settleForm.from,
        is_settled: true,
        cycle_id: cycleData.id,
      });
    }

    setSavingSettle(false);
    setShowSettleForm(false);
    setSettleForm({
      from: 'Mithun',
      to: 'Niyas',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      method: 'Bank Transfer',
      note: '',
    });
    fetchSettleup();
  };

  // ── Category breakdown ──────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + (e.amount || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ({ category: cat, amount: amt }));
  }, [monthExpenses]);

  // ── Partner expense lists ───────────────────────────────
  const mithunExpenses = monthExpenses.filter((e) => e.paid_by === 'Mithun');
  const niyasExpenses = monthExpenses.filter((e) => e.paid_by === 'Niyas');
  const companyExpenses = monthExpenses.filter((e) => e.paid_by === 'Company');

  // ── Render helpers ──────────────────────────────────────
  const renderSettlementText = (s: MonthlyPartnerSummary) => {
    if (!s.settlementRequired) {
      return (
        <div className="text-center py-4">
          <i className="fa-solid fa-check-circle text-money-green text-2xl mb-2" />
          <p className="text-money-paper font-medium">Settlement not required</p>
          <p className="text-text-secondary text-sm">Both partners have contributed equally</p>
        </div>
      );
    }
    const diff = Math.abs(s.mithunOwes - s.niyasOwes);
    if (s.niyasOwes > 0.01) {
      return (
        <div className="text-center py-4">
          <p className="text-text-secondary text-sm mb-1">Niyas owes Mithun</p>
          <p className="text-3xl font-bold text-money-green font-mono">{formatINR(diff)}</p>
          <p className="text-text-secondary text-xs mt-1">
            Equal share was {formatINR(s.equalShare)}
          </p>
        </div>
      );
    }
    return (
      <div className="text-center py-4">
        <p className="text-text-secondary text-sm mb-1">Mithun owes Niyas</p>
        <p className="text-3xl font-bold text-money-green font-mono">{formatINR(diff)}</p>
        <p className="text-text-secondary text-xs mt-1">
          Equal share was {formatINR(s.equalShare)}
        </p>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Header + Month Selector ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-semibold text-money-paper">Partner Settlement</h2>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="neo-input text-sm py-2 px-3 w-full sm:w-auto"
        >
          {availableMonths.length === 0 && <option value="">No data</option>}
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {prettyPeriodLabel(m)}
            </option>
          ))}
        </select>
      </div>

      {/* ── Partner Summary Cards ── */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mithun */}
          <div className="glass-panel rounded-xl p-5 border-l-4 border-blue-500/60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <i className="fa-solid fa-user text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-money-paper">Mithun</p>
                <p className="text-xs text-text-secondary">Total Spent</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-money-paper font-mono">
              {formatINR(summary.mithunTotal)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {mithunExpenses.length} expense{mithunExpenses.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Niyas */}
          <div className="glass-panel rounded-xl p-5 border-l-4 border-emerald-500/60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <i className="fa-solid fa-user text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-money-paper">Niyas</p>
                <p className="text-xs text-text-secondary">Total Spent</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-money-paper font-mono">
              {formatINR(summary.niyasTotal)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {niyasExpenses.length} expense{niyasExpenses.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Company */}
          <div className="glass-panel rounded-xl p-5 border-l-4 border-money-gold/60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-money-gold/10 flex items-center justify-center">
                <i className="fa-solid fa-building text-money-gold" />
              </div>
              <div>
                <p className="text-sm font-medium text-money-paper">Company</p>
                <p className="text-xs text-text-secondary">Total Spent</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-money-paper font-mono">
              {formatINR(summary.companyTotal)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {companyExpenses.length} expense{companyExpenses.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* ── Settlement Highlight ── */}
      {summary && (
        <div className="glass-panel rounded-xl p-1">
          <div className="bg-surface-elevated/50 rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-money-green">
                <i className="fa-solid fa-scale-balanced mr-2" />
                Settlement
              </h3>
              <span className="text-xs text-text-secondary">
                Grand Total: {formatINR(summary.grandTotal)}
              </span>
            </div>
            {renderSettlementText(summary)}
          </div>
        </div>
      )}

      {/* ── Record Settlement Action ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowSettleForm((p) => !p)}
          className="neo-btn px-4 py-2 text-sm font-medium"
        >
          <i className={`fa-solid ${showSettleForm ? 'fa-chevron-up' : 'fa-handshake'} mr-2`} />
          {showSettleForm ? 'Close' : 'Record Settlement'}
        </button>
      </div>

      {/* ── Settlement Form ── */}
      {showSettleForm && (
        <div className="glass-panel rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-money-green">Record a Settlement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">From</label>
              <select
                value={settleForm.from}
                onChange={(e) => {
                  const from = e.target.value as 'Mithun' | 'Niyas';
                  setSettleForm((f) => ({
                    ...f,
                    from,
                    to: from === 'Mithun' ? 'Niyas' : 'Mithun',
                  }));
                }}
                className="neo-input w-full"
              >
                <option value="Mithun">Mithun</option>
                <option value="Niyas">Niyas</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">To</label>
              <select
                value={settleForm.to}
                disabled
                className="neo-input w-full opacity-60"
              >
                <option value="Mithun">Mithun</option>
                <option value="Niyas">Niyas</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Amount (\u20b9)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={settleForm.amount}
                onChange={(e) => setSettleForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="neo-input w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Date</label>
              <input
                type="date"
                value={settleForm.date}
                onChange={(e) => setSettleForm((f) => ({ ...f, date: e.target.value }))}
                className="neo-input w-full"
              />
            </div>
            <div className="space-y-1 md:col-span-2 lg:col-span-2">
              <label className="text-xs text-text-secondary">Method</label>
              <select
                value={settleForm.method}
                onChange={(e) => setSettleForm((f) => ({ ...f, method: e.target.value }))}
                className="neo-input w-full"
              >
                <option>Bank Transfer</option>
                <option>Cash</option>
                <option>UPI</option>
                <option>Other</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2 lg:col-span-2">
              <label className="text-xs text-text-secondary">Note</label>
              <input
                type="text"
                value={settleForm.note}
                onChange={(e) => setSettleForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Optional note\u2026"
                className="neo-input w-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleRecordSettlement}
              disabled={savingSettle}
              className="neo-btn px-5 py-2 text-sm font-medium"
            >
              <i className="fa-solid fa-check mr-2" />
              {savingSettle ? 'Saving\u2026' : 'Confirm Settlement'}
            </button>
            <button
              onClick={() => setShowSettleForm(false)}
              className="text-sm text-text-secondary hover:text-money-paper transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Category Breakdown ── */}
      {categoryBreakdown.length > 0 && (
        <div className="glass-panel rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-medium text-money-green">
            <i className="fa-solid fa-chart-pie mr-2" />
            Category Breakdown
          </h3>
          <div className="space-y-2">
            {categoryBreakdown.map(({ category, amount }) => {
              const max = categoryBreakdown[0].amount;
              const pct = max > 0 ? (amount / max) * 100 : 0;
              return (
                <div key={category} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-24 shrink-0 truncate">
                    {category}
                  </span>
                  <div className="flex-1 h-5 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-money-green/60 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-money-paper w-20 text-right">
                    {formatINR(amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Expense Breakdown by Partner ── */}
      <div className="space-y-4">
        {['Mithun', 'Niyas', 'Company'].map((partner) => {
          const list = monthExpenses.filter((e) => e.paid_by === partner);
          if (list.length === 0) return null;
          const color =
            partner === 'Mithun'
              ? 'border-blue-500/40'
              : partner === 'Niyas'
              ? 'border-emerald-500/40'
              : 'border-money-gold/40';
          const titleColor =
            partner === 'Mithun'
              ? 'text-blue-400'
              : partner === 'Niyas'
              ? 'text-emerald-400'
              : 'text-money-gold';
          return (
            <div key={partner} className={`glass-panel rounded-xl overflow-hidden border-l-4 ${color}`}>
              <div className="px-4 py-3 bg-surface flex items-center justify-between">
                <h3 className={`text-sm font-medium ${titleColor}`}>
                  <i className="fa-solid fa-list mr-2" />
                  {partner}&apos;s Expenses
                </h3>
                <span className="text-xs font-mono text-money-paper">
                  {formatINR(list.reduce((s, e) => s + (e.amount || 0), 0))}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface border-b border-divider">
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-text-secondary">Date</th>
                      <th className="px-4 py-2 text-xs font-medium text-text-secondary">Description</th>
                      <th className="px-4 py-2 text-xs font-medium text-text-secondary">Category</th>
                      <th className="px-4 py-2 text-xs font-medium text-text-secondary text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {list.map((e, i) => (
                      <tr key={e.id || `${partner}-${i}`} className="hover:bg-surface-elevated/30">
                        <td className="px-4 py-2 text-text-secondary text-xs">
                          {new Date(e.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-2 text-money-paper text-xs">{e.description}</td>
                        <td className="px-4 py-2 text-text-secondary text-xs">{e.category}</td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-money-green">
                          {formatINR(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Settlement History ── */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-surface flex items-center justify-between">
          <h3 className="text-sm font-medium text-money-green">
            <i className="fa-solid fa-clock-rotate-left mr-2" />
            Settlement History
          </h3>
          {loadingSettleup && (
            <i className="fa-solid fa-circle-notch fa-spin text-text-secondary text-xs" />
          )}
        </div>
        {cycles.length === 0 ? (
          <div className="px-4 py-6 text-center text-text-secondary text-sm">
            <i className="fa-solid fa-inbox mr-2" />
            No settlements recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-divider">
                <tr>
                  <th className="px-4 py-2 text-xs font-medium text-text-secondary">Date</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-secondary">Method</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-secondary text-right">Mithun</th>
                  <th className="px-4 py-2 text-xs font-medium text-text-secondary text-right">Niyas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {cycles.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-elevated/30">
                    <td className="px-4 py-2 text-text-secondary text-xs">
                      {c.settled_date
                        ? new Date(c.settled_date).toLocaleDateString('en-IN')
                        : '\u2014'}
                    </td>
                    <td className="px-4 py-2 text-money-paper text-xs">
                      {c.settlement_method || '\u2014'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-blue-400">
                      {c.mithun_total ? formatINR(c.mithun_total) : '\u2014'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-emerald-400">
                      {c.niyas_total ? formatINR(c.niyas_total) : '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
