import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ForeignRemittance, Customer, BankAccount, RemittanceStatus } from '../types';
import { Modal } from './Modal';
import { isMigration003Applied } from '../utils/schemaCheck';

interface ForeignRemittanceViewProps {
  userId: string;
  customers: Customer[];
}

const PURPOSE_CODES: { code: string; label: string }[] = [
  { code: 'P0802', label: 'P0802 — Business Services / Testing' },
  { code: 'P0801', label: 'P0801 — Education & Training' },
  { code: 'P0101', label: 'P0101 — Goods Export' },
  { code: 'P0301', label: 'P0301 — Travel & Tourism' },
];

const STATUS_FLOW: RemittanceStatus[] = [
  'invoice_uploaded',
  'firc_ready',
  'firc_submitted',
  'payment_pending',
  'payment_received',
  'reconciled',
];

const STATUS_LABELS: Record<RemittanceStatus, string> = {
  invoice_uploaded: 'Invoice Uploaded',
  firc_ready: 'FIRC Ready',
  firc_submitted: 'FIRC Submitted',
  payment_pending: 'Payment Pending',
  payment_received: 'Payment Received',
  reconciled: 'Reconciled',
};

const STATUS_BADGE: Record<RemittanceStatus, string> = {
  invoice_uploaded: 'border-text-muted/30 text-text-muted',
  firc_ready: 'border-sky-400/30 text-sky-200',
  firc_submitted: 'border-amber-400/30 text-amber-200',
  payment_pending: 'border-orange-400/30 text-orange-200',
  payment_received: 'border-money-green/30 text-money-green',
  reconciled: 'border-money-gold/30 text-money-gold',
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  const t = Date.parse(d);
  return Number.isNaN(t) ? d : new Date(t).toLocaleDateString('en-GB');
}

function fmtMoney(n?: number | null, currency = 'USD') {
  const val = n ?? 0;
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'CAD' ? 'C$' : '₹';
  return `${sym}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const ForeignRemittanceView: React.FC<ForeignRemittanceViewProps> = ({
  userId,
  customers,
}) => {
  const [remittances, setRemittances] = useState<ForeignRemittance[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [schemaReady, setSchemaReady] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<RemittanceStatus | 'all'>('all');

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    customer_id: '',
    invoice_number: '',
    invoice_date: '',
    service_period: '',
    candidate_count: '',
    currency: 'USD' as string,
    foreign_amount: '',
    gst_amount: '',
    total_amount: '',
    invoice_pdf_name: '',
  });

  // FIRC modal
  const [fircOpen, setFircOpen] = useState(false);
  const [fircForm, setFircForm] = useState<Partial<ForeignRemittance>>({});

  // Payment modal
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ payment_date: '', payment_reference: '', payment_inr_amount: '' });

  const fetchRemittances = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('foreign_remittances')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) console.error('fetch remittances:', error);
    setRemittances((data as ForeignRemittance[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ready = await isMigration003Applied();
      if (!cancelled) setSchemaReady(ready);
      if (ready) {
        fetchRemittances();
        fetchBankAccounts();
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchBankAccounts = async () => {
    const { data } = await supabase.from('bank_accounts').select('*').eq('user_id', userId).eq('is_active', true);
    setBankAccounts((data as BankAccount[]) || []);
  };

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return remittances;
    return remittances.filter((r) => r.status === statusFilter);
  }, [remittances, statusFilter]);

  const totals = useMemo(() => {
    return remittances.reduce(
      (acc, r) => {
        acc.foreign += Number(r.foreign_amount || 0);
        acc.inr += Number(r.inr_amount || 0);
        acc.paid += Number(r.payment_inr_amount || 0);
        return acc;
      },
      { foreign: 0, inr: 0, paid: 0 }
    );
  }, [remittances]);

  // Helpers
  const customerName = (id: string) => customers.find((c) => c.id === id)?.name || 'Unknown';
  const accountName = (id?: string) => bankAccounts.find((a) => a.id === id)?.account_name || '—';

  const handleCreate = async () => {
    const foreignAmt = parseFloat(form.foreign_amount) || 0;
    const gstAmt = parseFloat(form.gst_amount) || 0;
    const total = parseFloat(form.total_amount) || (foreignAmt + gstAmt);
    const payload = {
      user_id: userId,
      customer_id: form.customer_id,
      invoice_number: form.invoice_number.trim(),
      invoice_date: form.invoice_date || null,
      service_period: form.service_period.trim() || null,
      candidate_count: parseInt(form.candidate_count) || null,
      currency: form.currency,
      foreign_amount: foreignAmt,
      gst_amount: gstAmt,
      total_amount: total,
      invoice_pdf_url: form.invoice_pdf_name.trim() || null,
      status: 'invoice_uploaded' as RemittanceStatus,
    };
    const { error } = await supabase.from('foreign_remittances').insert([payload]);
    if (error) { alert('Failed to create: ' + error.message); return; }
    setCreateOpen(false);
    resetCreateForm();
    fetchRemittances();
  };

  const resetCreateForm = () => {
    setForm({
      customer_id: '', invoice_number: '', invoice_date: '', service_period: '',
      candidate_count: '', currency: 'USD', foreign_amount: '', gst_amount: '', total_amount: '', invoice_pdf_name: '',
    });
  };

  const openFircModal = (r: ForeignRemittance) => {
    setFircForm({ ...r });
    setFircOpen(true);
  };

  const handleSaveFirc = async () => {
    if (!fircForm.id) return;
    const id = fircForm.id;
    const updates: any = {
      firc_number: fircForm.firc_number?.trim() || null,
      firc_date: fircForm.firc_date || null,
      ad_code: fircForm.ad_code?.trim() || null,
      purpose_code: fircForm.purpose_code || 'P0802',
      remitter_name: fircForm.remitter_name?.trim() || null,
      remitter_country: fircForm.remitter_country?.trim() || null,
      remitter_bank: fircForm.remitter_bank?.trim() || null,
      swift_code: fircForm.swift_code?.trim() || null,
      beneficiary_account_id: fircForm.beneficiary_account_id || null,
      beneficiary_name: fircForm.beneficiary_name?.trim() || null,
      exchange_rate: fircForm.exchange_rate ? parseFloat(String(fircForm.exchange_rate)) : null,
      inr_amount: fircForm.inr_amount ? parseFloat(String(fircForm.inr_amount)) : null,
      foreign_bank_charges: fircForm.foreign_bank_charges ? parseFloat(String(fircForm.foreign_bank_charges)) : 0,
      status: 'firc_ready' as RemittanceStatus,
    };
    const { error } = await supabase.from('foreign_remittances').update(updates).eq('id', id);
    if (error) { alert('Failed to save FIRC: ' + error.message); return; }
    setFircOpen(false);
    setFircForm({});
    fetchRemittances();
  };

  const openPaymentModal = (r: ForeignRemittance) => {
    setPayForm({
      payment_date: r.payment_date || '',
      payment_reference: r.payment_reference || '',
      payment_inr_amount: r.payment_inr_amount ? String(r.payment_inr_amount) : '',
    });
    setPayOpen(true);
    setFircForm({ ...r }); // hold reference
  };

  const handleSavePayment = async () => {
    if (!fircForm.id) return;
    const updates: any = {
      payment_date: payForm.payment_date || null,
      payment_reference: payForm.payment_reference.trim() || null,
      payment_inr_amount: parseFloat(payForm.payment_inr_amount) || null,
      status: 'payment_received' as RemittanceStatus,
    };
    const { error } = await supabase.from('foreign_remittances').update(updates).eq('id', fircForm.id);
    if (error) { alert('Failed to save payment: ' + error.message); return; }
    setPayOpen(false);
    setPayForm({ payment_date: '', payment_reference: '', payment_inr_amount: '' });
    fetchRemittances();
  };

  const advanceStatus = async (r: ForeignRemittance, next: RemittanceStatus) => {
    const { error } = await supabase.from('foreign_remittances').update({ status: next }).eq('id', r.id);
    if (error) alert('Update failed: ' + error.message);
    fetchRemittances();
  };

  const nextStatus = (current: RemittanceStatus): RemittanceStatus | null => {
    const idx = STATUS_FLOW.indexOf(current);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  const labelCls = 'block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5';
  const inputCls = 'neo-input w-full rounded-xl px-3 py-2 text-sm';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-money-paper tracking-tight">Foreign Remittance Tracker</h2>
          <p className="text-xs text-text-tertiary mt-1">
            Track foreign invoices, FIRC forms, and bank deposits end-to-end.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          disabled={schemaReady === false}
          className="neo-btn px-4 py-2 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20 disabled:opacity-40"
        >
          <i className="fas fa-plus mr-2"></i>Add Invoice
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
                Refresh the page after a moment, or contact your administrator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-money-gold/15">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Total Foreign Amount</p>
          <p className="text-2xl font-extrabold text-money-paper">{fmtMoney(totals.foreign, 'USD')}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-money-green/10">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Total INR (FIRC)</p>
          <p className="text-2xl font-extrabold text-money-green">{fmtMoney(totals.inr, 'INR')}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-money-gold/10">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Total Paid (INR)</p>
          <p className="text-2xl font-extrabold text-money-gold">{fmtMoney(totals.paid, 'INR')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${statusFilter === 'all' ? 'border-money-gold/40 text-money-gold bg-money-gold/10' : 'border-divider text-text-secondary'}`}
        >
          All ({remittances.length})
        </button>
        {STATUS_FLOW.map((s) => {
          const count = remittances.filter((r) => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${statusFilter === s ? 'border-money-gold/40 text-money-gold bg-money-gold/10' : 'border-divider text-text-secondary'}`}
            >
              {STATUS_LABELS[s]} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading && <div className="text-center py-10 text-text-tertiary text-sm"><i className="fas fa-circle-notch fa-spin mr-2"></i>Loading…</div>}

        {!loading && filtered.length === 0 && (
          <div className="glass-panel rounded-2xl p-10 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-surface-highlight/50 border border-divider flex items-center justify-center mb-4">
              <i className="fas fa-globe text-2xl text-text-muted"></i>
            </div>
            <p className="text-text-secondary">No foreign remittances yet</p>
            <p className="text-xs text-text-tertiary mt-2">Upload your first external invoice to get started</p>
          </div>
        )}

        {filtered.map((r) => {
          const nxt = nextStatus(r.status);
          return (
            <div key={r.id} className="glass-panel rounded-2xl p-5 border border-divider hover:border-money-gold/20 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                {/* Left: Invoice details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_BADGE[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                    <span className="text-xs text-text-muted">{r.service_period || formatDate(r.invoice_date)}</span>
                    {r.invoice_pdf_url && (
                      <span className="text-[10px] text-money-gold"><i className="fas fa-paperclip mr-1"></i>PDF attached</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-money-paper mt-2 truncate">{r.invoice_number}</h3>
                  <p className="text-sm text-text-secondary">{customerName(r.customer_id)}</p>
                  {r.candidate_count != null && (
                    <p className="text-xs text-text-muted mt-1">{r.candidate_count} candidates</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Foreign</p>
                      <p className="font-bold text-money-paper">{fmtMoney(r.foreign_amount, r.currency)}</p>
                    </div>
                    {r.gst_amount ? (
                      <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">GST</p>
                        <p className="font-bold text-text-secondary">{fmtMoney(r.gst_amount, r.currency)}</p>
                      </div>
                    ) : null}
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Total</p>
                      <p className="font-bold text-money-gold">{fmtMoney(r.total_amount, r.currency)}</p>
                    </div>
                    {r.inr_amount ? (
                      <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">INR</p>
                        <p className="font-bold text-money-green">{fmtMoney(r.inr_amount, 'INR')}</p>
                      </div>
                    ) : null}
                    {r.payment_inr_amount ? (
                      <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Paid</p>
                        <p className="font-bold text-money-green">{fmtMoney(r.payment_inr_amount, 'INR')}</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col gap-2 min-w-[180px]">
                  {r.status === 'invoice_uploaded' && (
                    <button onClick={() => openFircModal(r)} className="neo-btn px-3 py-2 rounded-xl text-xs font-bold text-sky-200 border border-sky-400/20">
                      <i className="fas fa-file-alt mr-1.5"></i>Fill FIRC Form
                    </button>
                  )}
                  {(r.status === 'firc_ready' || r.status === 'firc_submitted') && (
                    <button onClick={() => openFircModal(r)} className="neo-btn px-3 py-2 rounded-xl text-xs font-bold text-sky-200 border border-sky-400/20">
                      <i className="fas fa-edit mr-1.5"></i>Edit FIRC
                    </button>
                  )}
                  {r.status === 'firc_ready' && nxt && (
                    <button onClick={() => advanceStatus(r, nxt)} className="neo-btn px-3 py-2 rounded-xl text-xs font-bold text-amber-200 border border-amber-400/20">
                      <i className="fas fa-paper-plane mr-1.5"></i>Mark Submitted
                    </button>
                  )}
                  {r.status === 'payment_pending' && (
                    <button onClick={() => openPaymentModal(r)} className="neo-btn px-3 py-2 rounded-xl text-xs font-bold text-money-green border border-money-green/20">
                      <i className="fas fa-check mr-1.5"></i>Record Payment
                    </button>
                  )}
                  {r.status === 'payment_received' && nxt && (
                    <button onClick={() => advanceStatus(r, nxt)} className="neo-btn px-3 py-2 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20">
                      <i className="fas fa-check-double mr-1.5"></i>Mark Reconciled
                    </button>
                  )}
                  {r.status === 'reconciled' && (
                    <span className="px-3 py-2 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20 text-center">
                      <i className="fas fa-check-circle mr-1.5"></i>Complete
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {(r.firc_number || r.ad_code || r.remitter_name || r.swift_code) && (
                <div className="mt-4 pt-4 border-t border-divider grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {r.firc_number && (
                    <div><span className="text-text-muted uppercase font-bold">FIRC #</span><p className="text-money-paper">{r.firc_number}</p></div>
                  )}
                  {r.ad_code && (
                    <div><span className="text-text-muted uppercase font-bold">AD Code</span><p className="text-money-paper">{r.ad_code}</p></div>
                  )}
                  {r.purpose_code && (
                    <div><span className="text-text-muted uppercase font-bold">Purpose</span><p className="text-money-paper">{r.purpose_code}</p></div>
                  )}
                  {r.remitter_name && (
                    <div><span className="text-text-muted uppercase font-bold">Remitter</span><p className="text-money-paper">{r.remitter_name}</p></div>
                  )}
                  {r.remitter_bank && (
                    <div><span className="text-text-muted uppercase font-bold">Remitter Bank</span><p className="text-money-paper">{r.remitter_bank}</p></div>
                  )}
                  {r.swift_code && (
                    <div><span className="text-text-muted uppercase font-bold">SWIFT</span><p className="text-money-paper">{r.swift_code}</p></div>
                  )}
                  {r.beneficiary_account_id && (
                    <div><span className="text-text-muted uppercase font-bold">Credited to</span><p className="text-money-paper">{accountName(r.beneficiary_account_id)}</p></div>
                  )}
                  {r.payment_reference && (
                    <div><span className="text-text-muted uppercase font-bold">Bank Ref</span><p className="text-money-paper">{r.payment_reference}</p></div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => { setCreateOpen(false); resetCreateForm(); }} title="New Foreign Invoice" maxWidthClass="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Client <span className="text-red-400">*</span></label>
              <select value={form.customer_id} onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))} className={inputCls}>
                <option value="">Select client</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Invoice Number <span className="text-red-400">*</span></label>
              <input value={form.invoice_number} onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))} placeholder="INV-2024-001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Invoice Date</label>
              <input type="date" value={form.invoice_date} onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Service Period</label>
              <input value={form.service_period} onChange={(e) => setForm((f) => ({ ...f, service_period: e.target.value }))} placeholder="May 2024" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Candidates Appeared</label>
              <input type="number" value={form.candidate_count} onChange={(e) => setForm((f) => ({ ...f, candidate_count: e.target.value }))} placeholder="45" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className={inputCls}>
                {['USD', 'EUR', 'GBP', 'CAD'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Foreign Amount <span className="text-red-400">*</span></label>
              <input type="number" step="0.01" value={form.foreign_amount} onChange={(e) => setForm((f) => ({ ...f, foreign_amount: e.target.value }))} placeholder="5000.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>GST / Tax</label>
              <input type="number" step="0.01" value={form.gst_amount} onChange={(e) => setForm((f) => ({ ...f, gst_amount: e.target.value }))} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Total Amount <span className="text-red-400">*</span></label>
              <input type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))} placeholder={String((parseFloat(form.foreign_amount)||0)+(parseFloat(form.gst_amount)||0))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Invoice PDF (filename)</label>
              <input value={form.invoice_pdf_name} onChange={(e) => setForm((f) => ({ ...f, invoice_pdf_name: e.target.value }))} placeholder="invoice_may2024.pdf" className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setCreateOpen(false); resetCreateForm(); }} className="neo-btn px-5 py-2.5 rounded-xl text-xs font-bold text-text-secondary">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={!form.customer_id || !form.invoice_number.trim()}
              className="neo-btn px-6 py-2.5 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20 disabled:opacity-40"
            >
              Save Invoice
            </button>
          </div>
        </div>
      </Modal>

      {/* FIRC Modal */}
      <Modal isOpen={fircOpen} onClose={() => { setFircOpen(false); setFircForm({}); }} title="FIRC Details" maxWidthClass="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>FIRC Number</label>
              <input value={fircForm.firc_number || ''} onChange={(e) => setFircForm((f) => ({ ...f, firc_number: e.target.value }))} placeholder="FIRC-2024-001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>FIRC Date</label>
              <input type="date" value={fircForm.firc_date || ''} onChange={(e) => setFircForm((f) => ({ ...f, firc_date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>AD Code</label>
              <input value={fircForm.ad_code || ''} onChange={(e) => setFircForm((f) => ({ ...f, ad_code: e.target.value }))} placeholder="6789056" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Purpose Code</label>
              <select value={fircForm.purpose_code || 'P0802'} onChange={(e) => setFircForm((f) => ({ ...f, purpose_code: e.target.value }))} className={inputCls}>
                {PURPOSE_CODES.map((p) => (
                  <option key={p.code} value={p.code}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Remitter Name</label>
              <input value={fircForm.remitter_name || ''} onChange={(e) => setFircForm((f) => ({ ...f, remitter_name: e.target.value }))} placeholder="Prometric Testing Services" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Remitter Country</label>
              <input value={fircForm.remitter_country || ''} onChange={(e) => setFircForm((f) => ({ ...f, remitter_country: e.target.value }))} placeholder="USA" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Remitter Bank</label>
              <input value={fircForm.remitter_bank || ''} onChange={(e) => setFircForm((f) => ({ ...f, remitter_bank: e.target.value }))} placeholder="Wells Fargo" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>SWIFT Code</label>
              <input value={fircForm.swift_code || ''} onChange={(e) => setFircForm((f) => ({ ...f, swift_code: e.target.value }))} placeholder="WFBIUS6S" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Beneficiary Account</label>
              <select value={fircForm.beneficiary_account_id || ''} onChange={(e) => setFircForm((f) => ({ ...f, beneficiary_account_id: e.target.value || undefined }))} className={inputCls}>
                <option value="">Select account</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.account_name} ({a.currency})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Beneficiary Name</label>
              <input value={fircForm.beneficiary_name || ''} onChange={(e) => setFircForm((f) => ({ ...f, beneficiary_name: e.target.value }))} placeholder="Forum Testing & Educational Services" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Exchange Rate</label>
              <input type="number" step="0.000001" value={fircForm.exchange_rate || ''} onChange={(e) => setFircForm((f) => ({ ...f, exchange_rate: e.target.value }))} placeholder="83.000000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>INR Amount</label>
              <input type="number" step="0.01" value={fircForm.inr_amount || ''} onChange={(e) => setFircForm((f) => ({ ...f, inr_amount: e.target.value }))} placeholder="415000.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Foreign Bank Charges</label>
              <input type="number" step="0.01" value={fircForm.foreign_bank_charges || ''} onChange={(e) => setFircForm((f) => ({ ...f, foreign_bank_charges: e.target.value }))} placeholder="25.00" className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setFircOpen(false); setFircForm({}); }} className="neo-btn px-5 py-2.5 rounded-xl text-xs font-bold text-text-secondary">Cancel</button>
            <button onClick={handleSaveFirc} className="neo-btn px-6 py-2.5 rounded-xl text-xs font-bold text-sky-200 border border-sky-400/20">Save FIRC Details</button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={payOpen} onClose={() => { setPayOpen(false); setPayForm({ payment_date: '', payment_reference: '', payment_inr_amount: '' }); }} title="Record Bank Deposit" maxWidthClass="max-w-md">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Payment Date</label>
            <input type="date" value={payForm.payment_date} onChange={(e) => setPayForm((f) => ({ ...f, payment_date: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Bank Reference / UTR</label>
            <input value={payForm.payment_reference} onChange={(e) => setPayForm((f) => ({ ...f, payment_reference: e.target.value }))} placeholder="UTR123456789" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>INR Amount Received</label>
            <input type="number" step="0.01" value={payForm.payment_inr_amount} onChange={(e) => setPayForm((f) => ({ ...f, payment_inr_amount: e.target.value }))} placeholder="414975.00" className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setPayOpen(false); setPayForm({ payment_date: '', payment_reference: '', payment_inr_amount: '' }); }} className="neo-btn px-5 py-2.5 rounded-xl text-xs font-bold text-text-secondary">Cancel</button>
            <button onClick={handleSavePayment} className="neo-btn px-6 py-2.5 rounded-xl text-xs font-bold text-money-green border border-money-green/20">Record Payment</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ForeignRemittanceView;
