import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CurrencyRate, MonthlyCurrencyReportRow } from '../types';
import { Modal } from './Modal';
import { isMigration002Applied } from '../utils/schemaCheck';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'CAD'] as const;

type CurrencyCode = (typeof CURRENCIES)[number];

interface MultiCurrencyReportViewProps {
  userId: string;
}

const formatCurrencyAmount = (amount: number, currency: string) => {
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
  };
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const INR_FMT = (n: number) =>
  `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const MONTH_ORDER = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const MultiCurrencyReportView: React.FC<MultiCurrencyReportViewProps> = ({
  userId,
}) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [reportRows, setReportRows] = useState<MonthlyCurrencyReportRow[]>([]);
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaReady, setSchemaReady] = useState<boolean | null>(null);

  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>('USD');
  const [targetCurrency, setTargetCurrency] = useState<CurrencyCode>('INR');
  const [rateValue, setRateValue] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportRes, ratesRes] = await Promise.all([
        supabase.rpc('monthly_revenue_report', {
          p_user_id: userId,
          p_year: year,
        }),
        supabase
          .from('currency_rates')
          .select('*')
          .eq('user_id', userId)
          .order('effective_date', { ascending: false })
          .limit(200),
      ]);

      if (reportRes.error) throw new Error(reportRes.error.message);
      if (ratesRes.error) throw new Error(ratesRes.error.message);

      setReportRows((reportRes.data as MonthlyCurrencyReportRow[]) || []);
      setCurrencyRates((ratesRes.data as CurrencyRate[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [userId, year]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ready = await isMigration002Applied();
      if (!cancelled) setSchemaReady(ready);
      if (ready) load();
    })();
    return () => { cancelled = true; };
  }, [load]);

  const sortedRows = useMemo(() => {
    const order = new Map(MONTH_ORDER.map((m, i) => [m, i]));
    return [...reportRows].sort((a, b) => {
      const ai = order.get(a.month) ?? 99;
      const bi = order.get(b.month) ?? 99;
      if (ai !== bi) return ai - bi;
      return a.currency.localeCompare(b.currency);
    });
  }, [reportRows]);

  const totals = useMemo(() => {
    let revenue = 0;
    let paid = 0;
    reportRows.forEach((r) => {
      revenue += Number(r.inr_equivalent || 0);
      const ratio =
        Number(r.total_revenue || 0) > 0
          ? Number(r.paid_amount || 0) / Number(r.total_revenue)
          : 0;
      paid += Number(r.inr_equivalent || 0) * ratio;
    });
    const pending = revenue - paid;
    return { revenue, paid, pending };
  }, [reportRows]);

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(rateValue);
    if (!rateNum || rateNum <= 0) return;
    if (baseCurrency === targetCurrency) return;

    setSavingRate(true);
    const { error: saveErr } = await supabase.from('currency_rates').insert({
      user_id: userId,
      base_currency: baseCurrency,
      target_currency: targetCurrency,
      rate: rateNum,
      effective_date: effectiveDate,
      source: 'manual',
      notes: notes.trim() || null,
    });
    setSavingRate(false);

    if (saveErr) {
      alert(saveErr.message);
      return;
    }

    setRateModalOpen(false);
    setRateValue('');
    setNotes('');
    load();
  };

  const yearOptions = useMemo(
    () => Array.from({ length: 7 }, (_, i) => currentYear - 3 + i),
    [currentYear]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-money-gold/15">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-money-paper">
              Multi-Currency Revenue Report
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Yearly summary with INR conversion
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-text-secondary">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="neo-input rounded-xl px-3 py-2 text-sm bg-surface border border-divider text-money-paper"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              onClick={() => setRateModalOpen(true)}
              disabled={schemaReady === false}
              className="neo-btn px-4 py-2.5 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20 disabled:opacity-40"
            >
              Manage Rates
            </button>
          </div>
        </div>

        {schemaReady === false && (
          <div className="mt-4 glass-panel rounded-2xl p-5 border border-amber-500/30 bg-amber-500/10 text-amber-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <i className="fas fa-database text-amber-300"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-200 mb-1">Database schema not ready</h3>
                <p className="text-sm text-amber-100/80 leading-relaxed">
                  The Multi-Currency Report feature requires migration 002 to be applied in Supabase.
                  Open the Supabase SQL Editor and run the migration file, then refresh this page.
                </p>
                <p className="mt-3 text-xs font-mono text-amber-200/70 bg-amber-950/30 border border-amber-500/20 rounded-lg px-3 py-2">
                  migrations/002_bank_gst_multicurrency.sql
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="rounded-xl bg-surface-elevated border border-divider p-4">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-bold">
              Total Revenue
            </p>
            <p className="text-xl font-bold text-money-paper mt-1">
              {INR_FMT(totals.revenue)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-elevated border border-divider p-4">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-bold">
              Total Paid
            </p>
            <p className="text-xl font-bold text-money-green mt-1">
              {INR_FMT(totals.paid)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-elevated border border-divider p-4">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-bold">
              Total Pending
            </p>
            <p className="text-xl font-bold text-amber-200 mt-1">
              {INR_FMT(totals.pending)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-elevated border border-money-gold/15 p-4">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-bold">
              Total INR Equivalent
            </p>
            <p className="text-xl font-bold text-money-gold mt-1">
              {INR_FMT(totals.revenue)}
            </p>
          </div>
        </div>
      </div>

      {/* Report table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-text-secondary text-sm">
            Loading report…
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-400 text-sm">{error}</div>
        ) : sortedRows.length === 0 ? (
          <div className="text-center py-12 text-text-secondary text-sm px-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated border border-divider">
              <i className="fas fa-file-invoice-dollar text-2xl text-text-tertiary" />
            </div>
            <p>
              No multi-currency invoice data for{' '}
              <strong className="text-money-paper">{year}</strong>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-highlight/50 border-b border-divider">
                <tr className="text-[10px] uppercase text-text-tertiary tracking-wider text-left">
                  <th className="px-5 py-3 font-bold">Month</th>
                  <th className="px-5 py-3 font-bold">Currency</th>
                  <th className="px-5 py-3 font-bold">Invoices</th>
                  <th className="px-5 py-3 font-bold text-right">Total Revenue</th>
                  <th className="px-5 py-3 font-bold text-right">Paid</th>
                  <th className="px-5 py-3 font-bold text-right">Pending</th>
                  <th className="px-5 py-3 font-bold text-right">INR Equivalent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {sortedRows.map((row, idx) => (
                  <tr
                    key={`${row.month}-${row.currency}-${idx}`}
                    className="hover:bg-surface-highlight/30 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-money-paper font-medium">
                      {row.month}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-surface-elevated border border-divider text-[10px] font-bold text-text-secondary">
                        {row.currency}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {row.invoice_count}
                    </td>
                    <td className="px-5 py-3.5 text-right text-money-paper font-medium">
                      {formatCurrencyAmount(row.total_revenue, row.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-money-green">
                      {formatCurrencyAmount(row.paid_amount, row.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-amber-200">
                      {formatCurrencyAmount(row.pending_amount, row.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-money-gold font-medium">
                      {INR_FMT(row.inr_equivalent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rates panel */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-divider">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-money-paper">Currency Rates</h3>
          <button
            onClick={() => setRateModalOpen(true)}
            className="neo-btn px-4 py-2 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20"
          >
            Add Rate
          </button>
        </div>
        {currencyRates.length === 0 ? (
          <p className="text-sm text-text-secondary">No rates stored yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-highlight/50 border-b border-divider">
                <tr className="text-[10px] uppercase text-text-tertiary tracking-wider text-left">
                  <th className="px-4 py-3 font-bold">Base</th>
                  <th className="px-4 py-3 font-bold">Target</th>
                  <th className="px-4 py-3 font-bold text-right">Rate</th>
                  <th className="px-4 py-3 font-bold">Effective Date</th>
                  <th className="px-4 py-3 font-bold">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {currencyRates.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-surface-highlight/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-money-paper">
                      {r.base_currency}
                    </td>
                    <td className="px-4 py-3 text-money-paper">
                      {r.target_currency}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-money-green">
                      {Number(r.rate).toFixed(6)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {r.effective_date}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {r.source || 'manual'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add rate modal */}
      <Modal
        isOpen={rateModalOpen}
        onClose={() => setRateModalOpen(false)}
        title="Add Currency Rate"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleAddRate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5">
                Base Currency
              </label>
              <select
                value={baseCurrency}
                onChange={(e) =>
                  setBaseCurrency(e.target.value as CurrencyCode)
                }
                className="neo-input w-full rounded-xl px-3 py-2.5 text-sm bg-surface border border-divider text-money-paper"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5">
                Target Currency
              </label>
              <select
                value={targetCurrency}
                onChange={(e) =>
                  setTargetCurrency(e.target.value as CurrencyCode)
                }
                className="neo-input w-full rounded-xl px-3 py-2.5 text-sm bg-surface border border-divider text-money-paper"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5">
              Rate
            </label>
            <input
              type="number"
              step="0.000001"
              min="0.000001"
              required
              value={rateValue}
              onChange={(e) => setRateValue(e.target.value)}
              className="neo-input w-full rounded-xl px-3 py-2.5 text-sm bg-surface border border-divider text-money-paper"
              placeholder="0.000000"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5">
              Effective Date
            </label>
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="neo-input w-full rounded-xl px-3 py-2.5 text-sm bg-surface border border-divider text-money-paper"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="neo-input w-full rounded-xl px-3 py-2.5 text-sm bg-surface border border-divider text-money-paper"
              placeholder="Optional"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRateModalOpen(false)}
              className="neo-btn px-5 py-2.5 rounded-xl text-xs font-bold text-text-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                savingRate ||
                !rateValue ||
                baseCurrency === targetCurrency
              }
              className="neo-btn px-5 py-2.5 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20 disabled:opacity-50"
            >
              Save Rate
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
