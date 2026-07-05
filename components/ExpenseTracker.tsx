import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Expense, LocationType, PartnerType } from '../types';
import {
  formatINR,
  groupExpensesByMonth,
  computeMonthlyReconciliation,
} from '../utils/reconciliation';
import {
  canonicalMonthFromDate,
  prettyPeriodLabel,
  rollingCanonicalMonths,
} from '../utils/paybookMonth';

// ─── Constants ───────────────────────────────────────────────
const CATEGORIES = [
  'Travel',
  'Food',
  'Stationery',
  'Maintenance',
  'Marketing',
  'Rent',
  'Electricity',
  'Miscellaneous',
] as const;

const LOCATIONS: LocationType[] = ['Cochin', 'Calicut'];
const PARTNERS: PartnerType[] = ['Mithun', 'Niyas', 'Company'];

interface ExpenseTrackerProps {
  location: LocationType;
  userId?: string;
}

// ─── Component ───────────────────────────────────────────────
export default function ExpenseTracker({ location, userId }: ExpenseTrackerProps) {
  // ── Data ────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Form ────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    amount: string;
    description: string;
    date: string;
    location: LocationType;
    paid_by: PartnerType;
    category: string;
  }>({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    location: location,
    paid_by: 'Mithun',
    category: 'Miscellaneous',
  });

  // ── Recurring ───────────────────────────────────────────
  const [recurring, setRecurring] = useState({
    rentCochin: '30000',
    rentCalicut: '20000',
    electricity: '5000',
  });
  const [postingRecurring, setPostingRecurring] = useState(false);

  // ── Filters ─────────────────────────────────────────────
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [filterPartner, setFilterPartner] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Fetch ───────────────────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });
    if (!error && data) {
      setExpenses(data as Expense[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchExpenses]);

  // ── Form helpers ────────────────────────────────────────
  const resetForm = useCallback(() => {
    setForm({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      location: location,
      paid_by: 'Mithun',
      category: 'Miscellaneous',
    });
    setEditingId(null);
  }, [location]);

  const openEdit = useCallback((expense: Expense) => {
    setForm({
      amount: String(expense.amount),
      description: expense.description,
      date: expense.date,
      location: expense.location,
      paid_by: expense.paid_by,
      category: expense.category,
    });
    setEditingId(expense.id || null);
    setShowForm(true);
  }, []);

  // ── Save ────────────────────────────────────────────────
  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return;
    if (!form.description.trim()) return;

    setSaving(true);
    const payload = {
      amount,
      description: form.description.trim(),
      date: form.date,
      location: form.location,
      paid_by: form.paid_by,
      category: form.category,
      user_id: userId || null,
    };

    if (editingId) {
      await supabase.from('expenses').update(payload).eq('id', editingId);
    } else {
      await supabase.from('expenses').insert(payload);
    }

    setSaving(false);
    resetForm();
    setShowForm(false);
    fetchExpenses();
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    fetchExpenses();
  };

  // ── Recurring post ──────────────────────────────────────
  const handlePostRecurring = async () => {
    if (!window.confirm('Post recurring expenses for this month?')) return;
    setPostingRecurring(true);

    const month = canonicalMonthFromDate();
    const today = new Date().toISOString().split('T')[0];

    const items: Omit<Expense, 'id' | 'created_at'>[] = [
      {
        amount: parseFloat(recurring.rentCochin) || 0,
        description: `Rent \u2014 Cochin (${month})`,
        date: today,
        location: 'Cochin' as LocationType,
        paid_by: 'Company' as PartnerType,
        category: 'Rent',
        is_recurring: true,
      },
      {
        amount: parseFloat(recurring.rentCalicut) || 0,
        description: `Rent \u2014 Calicut (${month})`,
        date: today,
        location: 'Calicut' as LocationType,
        paid_by: 'Company' as PartnerType,
        category: 'Rent',
        is_recurring: true,
      },
      {
        amount: parseFloat(recurring.electricity) || 0,
        description: `Electricity (${month})`,
        date: today,
        location: location as LocationType,
        paid_by: 'Company' as PartnerType,
        category: 'Electricity',
        is_recurring: true,
      },
    ].filter((i) => i.amount > 0);

    for (const item of items) {
      await supabase.from('expenses').insert({ ...item, user_id: userId || null });
    }

    setPostingRecurring(false);
    fetchExpenses();
  };

  // ── Filtering ───────────────────────────────────────────
  const allMonths = useMemo(() => {
    const months = Object.keys(groupExpensesByMonth(expenses));
    return rollingCanonicalMonths(12).filter((m) => months.includes(m));
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchMonth = filterMonth
        ? canonicalMonthFromDate(new Date(e.date)) === filterMonth
        : true;
      const matchLoc = filterLocation ? e.location === filterLocation : true;
      const matchPartner = filterPartner ? e.paid_by === filterPartner : true;
      const matchCat = filterCategory ? e.category === filterCategory : true;
      const matchSearch = searchQuery
        ? e.description.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchMonth && matchLoc && matchPartner && matchCat && matchSearch;
    });
  }, [expenses, filterMonth, filterLocation, filterPartner, filterCategory, searchQuery]);

  const filteredTotal = useMemo(
    () => filtered.reduce((s, e) => s + (e.amount || 0), 0),
    [filtered]
  );

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="w-full space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-money-paper">Expense Tracker</h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm((p) => !p);
          }}
          className="neo-btn flex items-center gap-2 px-4 py-2 text-sm font-medium"
        >
          <i className={`fa-solid ${showForm ? 'fa-chevron-up' : 'fa-plus'}`} />
          {showForm ? 'Close' : 'Add Expense'}
        </button>
      </div>

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <div className="glass-panel rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-money-green">
            {editingId ? 'Edit Expense' : 'New Expense'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Amount */}
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Amount (\u20b9)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="neo-input w-full"
              />
            </div>
            {/* Description */}
            <div className="space-y-1 md:col-span-2 lg:col-span-2">
              <label className="text-xs text-text-secondary">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What was this for?"
                className="neo-input w-full"
              />
            </div>
            {/* Date */}
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="neo-input w-full"
              />
            </div>
            {/* Location */}
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Location</label>
              <select
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value as LocationType }))
                }
                className="neo-input w-full"
              >
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            {/* Paid By */}
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Paid By</label>
              <select
                value={form.paid_by}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paid_by: e.target.value as PartnerType }))
                }
                className="neo-input w-full"
              >
                {PARTNERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="neo-input w-full"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="neo-btn px-5 py-2 text-sm font-medium">
              <i className="fa-solid fa-save mr-2" />
              {saving ? 'Saving\u2026' : editingId ? 'Update' : 'Save Expense'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="text-sm text-text-secondary hover:text-money-paper transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Recurring Expenses ── */}
      <div className="glass-panel rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-money-green">
            <i className="fa-solid fa-rotate mr-2" />
            Recurring Expenses
          </h3>
          <button
            onClick={handlePostRecurring}
            disabled={postingRecurring}
            className="neo-btn px-4 py-2 text-xs font-medium"
          >
            <i className="fa-solid fa-paper-plane mr-2" />
            {postingRecurring ? 'Posting\u2026' : 'Post Monthly Recurring'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-text-secondary">Rent \u2014 Cochin (\u20b9)</label>
            <input
              type="number"
              value={recurring.rentCochin}
              onChange={(e) =>
                setRecurring((r) => ({ ...r, rentCochin: e.target.value }))
              }
              className="neo-input w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-secondary">Rent \u2014 Calicut (\u20b9)</label>
            <input
              type="number"
              value={recurring.rentCalicut}
              onChange={(e) =>
                setRecurring((r) => ({ ...r, rentCalicut: e.target.value }))
              }
              className="neo-input w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-secondary">Electricity (\u20b9)</label>
            <input
              type="number"
              value={recurring.electricity}
              onChange={(e) =>
                setRecurring((r) => ({ ...r, electricity: e.target.value }))
              }
              className="neo-input w-full"
            />
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="glass-panel rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-text-secondary">
            <i className="fa-solid fa-filter text-xs" />
            <span className="text-xs font-medium">Filters</span>
          </div>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="neo-input text-xs py-1.5 px-3"
          >
            <option value="">All Months</option>
            {allMonths.map((m) => (
              <option key={m} value={m}>
                {prettyPeriodLabel(m)}
              </option>
            ))}
          </select>
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="neo-input text-xs py-1.5 px-3"
          >
            <option value="">All Locations</option>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={filterPartner}
            onChange={(e) => setFilterPartner(e.target.value)}
            className="neo-input text-xs py-1.5 px-3"
          >
            <option value="">All Partners</option>
            {PARTNERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="neo-input text-xs py-1.5 px-3"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex-1 min-w-[160px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description\u2026"
              className="neo-input w-full text-xs py-1.5 px-3"
            />
          </div>
          <button
            onClick={() => {
              setFilterMonth('');
              setFilterLocation('');
              setFilterPartner('');
              setFilterCategory('');
              setSearchQuery('');
            }}
            className="text-xs text-text-secondary hover:text-money-paper transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Expense List ── */}
      <div className="glass-panel rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-secondary text-sm">
            <i className="fa-solid fa-circle-notch fa-spin mr-2" />
            Loading expenses\u2026
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-text-secondary text-sm">
            <i className="fa-solid fa-receipt mr-2" />
            No expenses found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface border-b border-divider">
                  <tr>
                    <th className="px-4 py-3 font-medium text-text-secondary">Date</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">Description</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">Category</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">Location</th>
                    <th className="px-4 py-3 font-medium text-text-secondary">Paid By</th>
                    <th className="px-4 py-3 font-medium text-text-secondary text-right">Amount</th>
                    <th className="px-4 py-3 font-medium text-text-secondary text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {filtered.map((e) => (
                    <tr
                      key={e.id || `${e.date}-${e.description}`}
                      className="hover:bg-surface-elevated/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-money-paper">
                        {new Date(e.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-money-paper">
                        {e.description}
                        {e.is_recurring && (
                          <span className="ml-2 text-[10px] text-money-green bg-money-green/10 px-1.5 py-0.5 rounded">
                            RECURRING
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{e.category}</td>
                      <td className="px-4 py-3 text-text-secondary">{e.location}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            e.paid_by === 'Mithun'
                              ? 'bg-blue-500/10 text-blue-400'
                              : e.paid_by === 'Niyas'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-money-gold/10 text-money-gold'
                          }`}
                        >
                          {e.paid_by}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-money-green">
                        {formatINR(e.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(e)}
                            className="text-text-secondary hover:text-money-gold transition-colors"
                            title="Edit"
                          >
                            <i className="fa-solid fa-pen text-xs" />
                          </button>
                          <button
                            onClick={() => e.id && handleDelete(e.id)}
                            className="text-text-secondary hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <i className="fa-solid fa-trash text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Footer summary */}
            <div className="border-t border-divider bg-surface px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-text-secondary">
                {filtered.length} expense{filtered.length !== 1 ? 's' : ''}
              </span>
              <span className="text-sm font-medium text-money-green">
                Total: <span className="font-mono">{formatINR(filteredTotal)}</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
