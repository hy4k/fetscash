import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { BankAccount, BankTransaction, Invoice, Expense, Payment } from '../types';
import { Modal } from './Modal';
import { isMigration002Applied } from '../utils/schemaCheck';

interface BankReconciliationViewProps {
  userId: string;
  invoices: Invoice[];
  expenses: Expense[];
  payments: Payment[];
}

interface TransactionRow extends BankTransaction {
  matched_payment_id?: string | null;
}

type CandidateType = 'invoice' | 'payment' | 'expense';

interface CandidateItem {
  id: string;
  type: CandidateType;
  label: string;
  date?: string;
  amount: number;
  currency?: string;
  reference?: string;
}

interface ColumnMapping {
  date: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
  reference: string;
}

const CURRENCIES: BankAccount['currency'][] = ['INR', 'USD', 'EUR', 'GBP', 'CAD'];
const ACCOUNT_TYPES: BankAccount['account_type'][] = ['Current', 'Savings', 'FCNR', 'NRE', 'NRO'];

function formatMoney(n: number | undefined | null, currency = 'INR') {
  const val = n ?? 0;
  return `${currency} ${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string | undefined | null) {
  if (!d) return '—';
  const t = Date.parse(d);
  if (Number.isNaN(t)) return d;
  return new Date(t).toLocaleDateString('en-GB');
}

function parseAmount(v: string | number | null | undefined): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const cleaned = String(v).replace(/[₹$,\s]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeHeader(h: string) {
  return h
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  // Very simple CSV parser that respects quoted fields
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];
      if (ch === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    rows.push(values);
  }
  return rows;
}

function inferMapping(headers: string[]): Partial<ColumnMapping> {
  const map: Partial<ColumnMapping> = {};
  const normalized = headers.map(normalizeHeader);
  const find = (candidates: string[]) => {
    for (const c of candidates) {
      const idx = normalized.indexOf(c);
      if (idx >= 0) return headers[idx];
    }
    return '';
  };
  map.date = find(['date', 'transactiondate', 'txndate', 'value date', 'valueDate', 'postingdate']);
  map.description = find(['description', 'narration', 'particulars', 'details', 'transactiondescription', 'remarks']);
  map.debit = find(['debit', 'debitamount', 'withdrawal', 'outflow', 'dr']);
  map.credit = find(['credit', 'creditamount', 'deposit', 'inflow', 'cr']);
  map.balance = find(['balance', 'balanceamount', 'runningbalance']);
  map.reference = find(['reference', 'referencenumber', 'ref', 'cheque', 'chequeno', 'utr', 'transactionid']);
  return map;
}

function parseDate(value: string): string {
  const v = value.trim();
  if (!v) return new Date().toISOString().split('T')[0];
  // ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // mm/dd/yyyy
  const mdy = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    const parsed = new Date(v);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  const t = Date.parse(v);
  if (!Number.isNaN(t)) return new Date(t).toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
}

export const BankReconciliationView: React.FC<BankReconciliationViewProps> = ({
  userId,
  invoices,
  expenses,
  payments,
}) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [currentMatchTx, setCurrentMatchTx] = useState<TransactionRow | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaReady, setSchemaReady] = useState<boolean | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    account_name: '',
    bank_name: '',
    account_number: '',
    currency: 'INR' as BankAccount['currency'],
    account_type: 'Current' as BankAccount['account_type'],
    opening_balance: '',
  });

  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '',
    description: '',
    debit: '',
    credit: '',
    balance: '',
    reference: '',
  });

  const fetchAccounts = async () => {
    const { data, error: err } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
      return;
    }
    setBankAccounts((data as BankAccount[] | null) ?? []);
    if ((data as BankAccount[] | null)?.length && !selectedAccountId) {
      setSelectedAccountId((data as BankAccount[])[0].id);
    }
  };

  const fetchTransactions = async () => {
    const { data, error: err } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });
    if (err) {
      setError(err.message);
      return;
    }
    setTransactions((data as TransactionRow[] | null) ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const ready = await isMigration002Applied();
      if (!cancelled) setSchemaReady(ready);
      if (ready) {
        await fetchAccounts();
        await fetchTransactions();
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const selectedAccount = useMemo(
    () => bankAccounts.find((a) => a.id === selectedAccountId),
    [bankAccounts, selectedAccountId]
  );

  const filteredTransactions = useMemo(
    () =>
      selectedAccountId
        ? transactions.filter((t) => t.bank_account_id === selectedAccountId)
        : transactions,
    [transactions, selectedAccountId]
  );

  const unreconciled = useMemo(
    () => filteredTransactions.filter((t) => !t.is_reconciled),
    [filteredTransactions]
  );

  const stats = useMemo(() => {
    const totalDebit = unreconciled.reduce((sum, t) => sum + (t.debit || 0), 0);
    const totalCredit = unreconciled.reduce((sum, t) => sum + (t.credit || 0), 0);
    return {
      count: unreconciled.length,
      debit: totalDebit,
      credit: totalCredit,
    };
  }, [unreconciled]);

  const handleAddAccount = async () => {
    setError(null);
    const opening = parseAmount(addForm.opening_balance);
    const payload = {
      user_id: userId,
      account_name: addForm.account_name.trim(),
      bank_name: addForm.bank_name.trim(),
      account_number: addForm.account_number.trim(),
      currency: addForm.currency,
      account_type: addForm.account_type,
      opening_balance: opening,
      current_balance: opening,
      as_of_date: new Date().toISOString().split('T')[0],
      is_active: true,
    };
    const { error: err } = await supabase.from('bank_accounts').insert([payload]);
    if (err) {
      setError(err.message);
      return;
    }
    setAddForm({
      account_name: '',
      bank_name: '',
      account_number: '',
      currency: 'INR',
      account_type: 'Current',
      opening_balance: '',
    });
    setShowAddForm(false);
    await fetchAccounts();
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm('Delete this bank account and all its transactions?')) return;
    const { error: err } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (err) {
      setError(err.message);
      return;
    }
    if (selectedAccountId === id) setSelectedAccountId('');
    await fetchAccounts();
    await fetchTransactions();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    handleParseCSV(text);
  };

  const handleParseCSV = (text: string) => {
    const rows = parseCSV(text);
    if (rows.length < 2) {
      setParsedRows([]);
      setHeaders([]);
      return;
    }
    const hdrs = rows[0];
    setHeaders(hdrs);
    setParsedRows(rows.slice(1));
    const inferred = inferMapping(hdrs);
    setMapping({
      date: inferred.date ?? '',
      description: inferred.description ?? '',
      debit: inferred.debit ?? '',
      credit: inferred.credit ?? '',
      balance: inferred.balance ?? '',
      reference: inferred.reference ?? '',
    });
  };

  const colIndex = (headerName: string) =>
    headerName ? headers.findIndex((h) => h === headerName) : -1;

  const handleImportCSV = async () => {
    if (!selectedAccountId) {
      setError('Select a bank account first.');
      return;
    }
    if (!mapping.date || !mapping.description) {
      setError('Map at least Date and Description columns.');
      return;
    }
    setError(null);
    const idxDate = colIndex(mapping.date);
    const idxDesc = colIndex(mapping.description);
    const idxDebit = colIndex(mapping.debit);
    const idxCredit = colIndex(mapping.credit);
    const idxBalance = colIndex(mapping.balance);
    const idxRef = colIndex(mapping.reference);

    const toInsert: any[] = [];
    for (const row of parsedRows) {
      const debit = idxDebit >= 0 ? parseAmount(row[idxDebit]) : 0;
      const credit = idxCredit >= 0 ? parseAmount(row[idxCredit]) : 0;
      const balance = idxBalance >= 0 ? parseAmount(row[idxBalance]) : 0;
      const description = idxDesc >= 0 ? row[idxDesc] : '';
      if (!description && !debit && !credit) continue;
      toInsert.push({
        user_id: userId,
        bank_account_id: selectedAccountId,
        transaction_date: parseDate(idxDate >= 0 ? row[idxDate] : ''),
        description,
        reference_number: idxRef >= 0 ? row[idxRef] : null,
        debit,
        credit,
        balance: balance || null,
        transaction_type: credit > 0 ? 'income' : debit > 0 ? 'expense' : 'unknown',
        is_reconciled: false,
        raw_data: row.join(','),
      });
    }

    if (toInsert.length === 0) {
      setError('No valid rows to import.');
      return;
    }

    const { error: err } = await supabase.from('bank_transactions').insert(toInsert);
    if (err) {
      setError(err.message);
      return;
    }
    setCsvText('');
    setParsedRows([]);
    setHeaders([]);
    setUploadModalOpen(false);
    await fetchTransactions();
  };

  const buildCandidates = (tx: TransactionRow): CandidateItem[] => {
    const txAmount = (tx.debit || 0) > 0 ? tx.debit! : tx.credit || 0;
    const tolerance = Math.max(0.01, txAmount * 0.01);
    const list: CandidateItem[] = [];
    const isDebit = (tx.debit || 0) > 0;

    if (!isDebit) {
      invoices.forEach((inv) => {
        if (Math.abs(inv.total_amount - txAmount) <= tolerance) {
          list.push({
            id: inv.id,
            type: 'invoice',
            label: `${inv.invoice_number} — ${inv.customer?.name ?? 'Customer'}`,
            date: inv.invoice_date,
            amount: inv.total_amount,
            currency: inv.currency,
          });
        }
      });
      payments.forEach((p) => {
        if (Math.abs(p.amount - txAmount) <= tolerance) {
          list.push({
            id: p.id,
            type: 'payment',
            label: `Payment ${p.reference_number || p.id.slice(0, 8)} — ${p.bank_name}`,
            date: p.payment_date,
            amount: p.amount,
            currency: p.invoice?.currency ?? 'INR',
          });
        }
      });
    }
    expenses.forEach((ex) => {
      if (ex.amount != null && Math.abs(ex.amount - txAmount) <= tolerance) {
        list.push({
          id: ex.id as string,
          type: 'expense',
          label: `${ex.category} — ${ex.description}`,
          date: ex.date,
          amount: ex.amount,
          currency: 'INR',
        });
      }
    });
    return list.sort((a, b) => (a.date && b.date ? a.date.localeCompare(b.date) : 0));
  };

  const openMatchModal = (tx: TransactionRow) => {
    setCurrentMatchTx(tx);
    setMatchModalOpen(true);
  };

  const handleSelectMatch = async (candidate: CandidateItem) => {
    if (!currentMatchTx) return;
    const update: any = { is_reconciled: true };
    if (candidate.type === 'invoice') update.matched_invoice_id = candidate.id;
    else if (candidate.type === 'payment') update.matched_payment_id = candidate.id;
    else update.matched_expense_id = candidate.id;

    const { error: err } = await supabase
      .from('bank_transactions')
      .update(update)
      .eq('id', currentMatchTx.id);
    if (err) {
      setError(err.message);
      return;
    }
    setMatchModalOpen(false);
    setCurrentMatchTx(null);
    await fetchTransactions();
  };

  const handleUnreconcile = async (tx: TransactionRow) => {
    const { error: err } = await supabase
      .from('bank_transactions')
      .update({
        is_reconciled: false,
        matched_invoice_id: null,
        matched_payment_id: null,
        matched_expense_id: null,
      })
      .eq('id', tx.id);
    if (err) {
      setError(err.message);
      return;
    }
    await fetchTransactions();
  };

  const labelCls = 'block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5';
  const inputCls = 'neo-input w-full rounded-xl px-3 py-2 text-sm';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-money-paper tracking-tight">
            Bank Reconciliation
          </h2>
          <p className="text-xs text-text-tertiary mt-1">
            Match bank statement lines against invoices, payments, and expenses.
          </p>
        </div>
        <button
          onClick={() => setUploadModalOpen(true)}
          disabled={schemaReady === false}
          className="neo-btn px-4 py-2 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20 disabled:opacity-40"
        >
          <i className="fas fa-upload mr-2"></i>Upload Statement
        </button>
      </div>

      {schemaReady === false && (
        <div className="glass-panel rounded-2xl p-6 border border-amber-500/30 bg-amber-500/10 text-amber-100">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <i className="fas fa-database text-amber-300"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-200 mb-1">Database schema not ready</h3>
              <p className="text-sm text-amber-100/80 leading-relaxed">
                The Bank Reconciliation feature requires migration 002 to be applied in Supabase.
                Open the Supabase SQL Editor and run the migration file, then refresh this page.
              </p>
              <p className="mt-3 text-xs font-mono text-amber-200/70 bg-amber-950/30 border border-amber-500/20 rounded-lg px-3 py-2">
                migrations/002_bank_gst_multicurrency.sql
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="glass-panel rounded-xl p-4 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <i className="fas fa-exclamation-circle"></i>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-xs underline text-text-secondary">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-money-gold/15">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Unreconciled</p>
          <p className="text-2xl font-extrabold text-money-paper">{stats.count}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-money-green/10">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Unreconciled Debits</p>
          <p className="text-2xl font-extrabold text-red-400">{formatMoney(stats.debit, selectedAccount?.currency ?? 'INR')}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-money-green/10">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Unreconciled Credits</p>
          <p className="text-2xl font-extrabold text-money-green">{formatMoney(stats.credit, selectedAccount?.currency ?? 'INR')}</p>
        </div>
      </div>

      {/* Accounts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Bank Accounts</h3>
          <button
            onClick={() => setShowAddForm((s) => !s)}
            className="text-xs font-bold text-money-gold hover:underline"
          >
            {showAddForm ? 'Cancel' : '+ Add Account'}
          </button>
        </div>

        {showAddForm && (
          <div className="glass-panel rounded-2xl p-4 border border-money-gold/15">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Account Name</label>
                <input
                  value={addForm.account_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, account_name: e.target.value }))}
                  placeholder="e.g. Federal Bank - Current"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Bank Name</label>
                <input
                  value={addForm.bank_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, bank_name: e.target.value }))}
                  placeholder="e.g. Federal Bank"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Account Number</label>
                <input
                  value={addForm.account_number}
                  onChange={(e) => setAddForm((f) => ({ ...f, account_number: e.target.value }))}
                  placeholder="****1234"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Currency</label>
                <select
                  value={addForm.currency}
                  onChange={(e) => setAddForm((f) => ({ ...f, currency: e.target.value as BankAccount['currency'] }))}
                  className={inputCls}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Account Type</label>
                <select
                  value={addForm.account_type}
                  onChange={(e) => setAddForm((f) => ({ ...f, account_type: e.target.value as BankAccount['account_type'] }))}
                  className={inputCls}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Opening Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={addForm.opening_balance}
                  onChange={(e) => setAddForm((f) => ({ ...f, opening_balance: e.target.value }))}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={handleAddAccount}
                disabled={!addForm.account_name.trim() || !addForm.bank_name.trim()}
                className="neo-btn px-5 py-2 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20 disabled:opacity-50"
              >
                Save Account
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((acc) => {
            const active = acc.id === selectedAccountId;
            return (
              <div
                key={acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
                className={`glass-panel rounded-2xl p-4 cursor-pointer transition-all border ${
                  active ? 'border-money-gold/50 bg-surface-elevated' : 'border-divider hover:border-money-gold/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-money-paper">{acc.account_name}</p>
                    <p className="text-xs text-text-tertiary">{acc.bank_name}</p>
                    <p className="text-[10px] text-text-muted mt-1">{acc.account_number}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAccount(acc.id);
                    }}
                    className="text-text-tertiary hover:text-red-400 text-xs"
                    title="Delete account"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
                <div className="mt-4">
                  <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Current Balance</p>
                  <p className="text-xl font-extrabold text-money-green">
                    {formatMoney(acc.current_balance, acc.currency)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
            {selectedAccount ? `${selectedAccount.account_name} — Transactions` : 'All Transactions'}
          </h3>
          <span className="text-xs text-text-muted">{filteredTransactions.length} rows</span>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-divider">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface-highlight/50 border-b border-divider">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-text-tertiary uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left font-bold text-text-tertiary uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left font-bold text-text-tertiary uppercase tracking-wider">Ref</th>
                  <th className="px-4 py-3 text-right font-bold text-text-tertiary uppercase tracking-wider">Debit</th>
                  <th className="px-4 py-3 text-right font-bold text-text-tertiary uppercase tracking-wider">Credit</th>
                  <th className="px-4 py-3 text-right font-bold text-text-tertiary uppercase tracking-wider">Balance</th>
                  <th className="px-4 py-3 text-center font-bold text-text-tertiary uppercase tracking-wider">Reconciled?</th>
                  <th className="px-4 py-3 text-right font-bold text-text-tertiary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">
                      <i className="fas fa-circle-notch fa-spin mr-2"></i>Loading...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                      No transactions yet. Upload a statement to get started.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-highlight/30 transition-colors">
                      <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
                      <td className="px-4 py-3 text-money-paper">{tx.description}</td>
                      <td className="px-4 py-3 text-text-muted">{tx.reference_number || '—'}</td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {(tx.debit || 0) > 0 ? formatMoney(tx.debit, selectedAccount?.currency ?? 'INR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-money-green">
                        {(tx.credit || 0) > 0 ? formatMoney(tx.credit, selectedAccount?.currency ?? 'INR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary">
                        {tx.balance != null ? formatMoney(tx.balance, selectedAccount?.currency ?? 'INR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {tx.is_reconciled ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-money-green bg-money-green/10 border border-money-green/20 px-2 py-1 rounded-full">
                            <i className="fas fa-check"></i> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-200 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
                            <i className="fas fa-question"></i> No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {!tx.is_reconciled ? (
                          <button
                            onClick={() => openMatchModal(tx)}
                            className="neo-btn px-3 py-1.5 rounded-lg text-[10px] font-bold text-money-gold border border-money-gold/20 mr-2"
                          >
                            Match
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnreconcile(tx)}
                            className="neo-btn px-3 py-1.5 rounded-lg text-[10px] font-bold text-text-secondary border border-divider mr-2"
                          >
                            Unmatch
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload Bank Statement" maxWidthClass="max-w-4xl">
        <div className="space-y-4">
          {!selectedAccountId && (
            <div className="text-sm text-red-400 bg-red-500/5 border border-red-500/20 rounded-xl p-3">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              Select a bank account before importing.
            </div>
          )}

          <div>
            <label className={labelCls}>CSV File</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="block w-full text-xs text-text-secondary file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-surface-highlight file:text-money-gold hover:file:bg-surface-elevated"
            />
          </div>

          <div>
            <label className={labelCls}>Or paste CSV text</label>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                handleParseCSV(e.target.value);
              }}
              placeholder="Date,Description,Debit,Credit,Balance&#10;2024-01-15,Vendor payment,1000.00,,50000.00"
              className="neo-input w-full rounded-xl p-3 text-xs font-mono resize-none"
            />
          </div>

          {headers.length > 0 && (
            <div className="glass-panel rounded-xl p-4 border border-money-gold/15 space-y-3">
              <h4 className="text-xs font-bold text-money-gold uppercase tracking-wider">Column Mapping</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(['date', 'description', 'debit', 'credit', 'balance', 'reference'] as (keyof ColumnMapping)[]).map((key) => (
                  <div key={key}>
                    <label className="block text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">
                      {key}
                    </label>
                    <select
                      value={mapping[key]}
                      onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                      className="neo-input w-full rounded-lg px-2 py-1.5 text-xs"
                    >
                      <option value="">— ignore —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsedRows.length > 0 && (
            <div className="glass-panel rounded-xl overflow-hidden max-h-64 overflow-y-auto border border-divider">
              <table className="w-full text-[10px]">
                <thead className="bg-surface-highlight/50 border-b border-divider sticky top-0">
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-bold text-text-tertiary uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {parsedRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      {row.map((cell, cidx) => (
                        <td key={cidx} className="px-3 py-2 text-text-secondary truncate max-w-xs">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 10 && (
                <p className="text-center text-[10px] text-text-muted py-2">+ {parsedRows.length - 10} more rows</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setUploadModalOpen(false);
                setCsvText('');
                setParsedRows([]);
                setHeaders([]);
                setMapping({ date: '', description: '', debit: '', credit: '', balance: '', reference: '' });
              }}
              className="neo-btn px-4 py-2 rounded-xl text-xs font-bold text-text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleImportCSV}
              disabled={parsedRows.length === 0 || !selectedAccountId}
              className="neo-btn px-5 py-2 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20 disabled:opacity-50"
            >
              Import {parsedRows.length > 0 ? `${parsedRows.length} rows` : 'Rows'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Match Modal */}
      <Modal
        isOpen={matchModalOpen}
        onClose={() => {
          setMatchModalOpen(false);
          setCurrentMatchTx(null);
        }}
        title="Match Transaction"
        maxWidthClass="max-w-2xl"
      >
        <div className="space-y-4">
          {currentMatchTx && (
            <div className="glass-panel rounded-xl p-4 border border-money-gold/15">
              <p className="text-xs text-text-tertiary uppercase tracking-wider font-bold">Selected transaction</p>
              <p className="text-sm text-money-paper mt-1">{currentMatchTx.description}</p>
              <div className="flex gap-4 mt-2">
                <span className="text-xs text-text-secondary">{formatDate(currentMatchTx.transaction_date)}</span>
                {(currentMatchTx.debit || 0) > 0 ? (
                  <span className="text-xs font-bold text-red-400">
                    Debit {formatMoney(currentMatchTx.debit, selectedAccount?.currency ?? 'INR')}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-money-green">
                    Credit {formatMoney(currentMatchTx.credit, selectedAccount?.currency ?? 'INR')}
                  </span>
                )}
              </div>
            </div>
          )}

          {currentMatchTx && buildCandidates(currentMatchTx).length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              <i className="fas fa-search mr-2"></i>
              No matching invoices, payments, or expenses found for this amount.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {currentMatchTx &&
                buildCandidates(currentMatchTx).map((c) => (
                  <button
                    key={`${c.type}-${c.id}`}
                    onClick={() => handleSelectMatch(c)}
                    className="w-full text-left glass-panel rounded-xl p-3 border border-divider hover:border-money-gold/40 hover:bg-surface-elevated transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span
                          className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mr-2 ${
                            c.type === 'invoice'
                              ? 'text-money-green border-money-green/20 bg-money-green/10'
                              : c.type === 'payment'
                              ? 'text-money-gold border-money-gold/20 bg-money-gold/10'
                              : 'text-amber-200 border-amber-500/20 bg-amber-500/10'
                          }`}
                        >
                          {c.type}
                        </span>
                        <span className="text-sm font-bold text-money-paper">{c.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-money-paper">{formatMoney(c.amount, c.currency ?? 'INR')}</p>
                        <p className="text-[10px] text-text-muted">{formatDate(c.date)}</p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                setMatchModalOpen(false);
                setCurrentMatchTx(null);
              }}
              className="neo-btn px-4 py-2 rounded-xl text-xs font-bold text-text-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BankReconciliationView;
