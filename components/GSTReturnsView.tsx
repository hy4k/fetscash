import React, { useEffect, useMemo, useState } from 'react';
import { Invoice, Customer } from '../types';
import { supabase } from '../supabaseClient';
import { Modal } from './Modal';
import { isMigration002Applied } from '../utils/schemaCheck';

// Local GST types (mirror DB columns)
type GSTReturnType = 'GSTR1' | 'GSTR3B';
type GSTReturnStatus = 'draft' | 'ready' | 'filed' | 'pending';

interface GSTReturn {
  id: string;
  user_id: string;
  return_period: string; // MM-YYYY
  return_type: GSTReturnType;
  filing_due_date?: string | null;
  filed_date?: string | null;
  filed_reference?: string | null;
  status: GSTReturnStatus;
  taxable_value_igst: number;
  taxable_value_cgst: number;
  taxable_value_sgst: number;
  tax_igst: number;
  tax_cgst: number;
  tax_sgst: number;
  total_tax: number;
  total_invoices: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface GSTReturnItem {
  id: string;
  gst_return_id: string;
  invoice_id?: string | null;
  invoice_number?: string | null;
  customer_name?: string | null;
  taxable_value: number;
  igst: number;
  cgst: number;
  sgst: number;
  total_tax: number;
  total_amount: number;
  created_at?: string;
}

export interface GSTReturnsViewProps {
  userId: string;
  invoices: Invoice[];
  customers: Customer[];
}

const formatCurrency = (amount: number) => {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const statusBadgeClass = (status: GSTReturnStatus) => {
  switch (status) {
    case 'filed':
      return 'border-money-green/30 text-money-green';
    case 'ready':
      return 'border-sky-400/30 text-sky-200';
    case 'pending':
      return 'border-amber-400/30 text-amber-200';
    case 'draft':
    default:
      return 'border-text-muted/30 text-text-muted';
  }
};

export const GSTReturnsView: React.FC<GSTReturnsViewProps> = ({ userId }) => {
  const [gstReturns, setGstReturns] = useState<GSTReturn[]>([]);
  const [returnItems, setReturnItems] = useState<GSTReturnItem[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<GSTReturn | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [schemaReady, setSchemaReady] = useState<boolean | null>(null);

  const [newPeriod, setNewPeriod] = useState('');
  const [newType, setNewType] = useState<GSTReturnType>('GSTR1');
  const [populateOnCreate, setPopulateOnCreate] = useState(true);

  const fetchReturns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gst_returns')
      .select('*')
      .eq('user_id', userId)
      .order('return_period', { ascending: false });
    if (error) {
      console.error('Failed to fetch GST returns:', error);
      alert('Failed to fetch GST returns');
    } else {
      setGstReturns((data as GSTReturn[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const ready = await isMigration002Applied();
      if (!cancelled) setSchemaReady(ready);
      if (ready) fetchReturns();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchItems = async (returnId: string) => {
    setItemsLoading(true);
    const { data, error } = await supabase
      .from('gst_return_items')
      .select('*')
      .eq('gst_return_id', returnId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to fetch GST return items:', error);
      alert('Failed to fetch return items');
    } else {
      setReturnItems((data as GSTReturnItem[]) || []);
    }
    setItemsLoading(false);
  };

  const handlePopulate = async (id: string) => {
    const { error } = await supabase.rpc('populate_gst_return', { p_gst_return_id: id });
    if (error) {
      console.error('populate_gst_return failed:', error);
      alert('Failed to populate GST return');
      return false;
    }
    return true;
  };

  const handleRefresh = async (gstReturn: GSTReturn) => {
    const ok = await handlePopulate(gstReturn.id);
    if (ok) {
      await fetchReturns();
      if (selectedReturn?.id === gstReturn.id) {
        await fetchItems(gstReturn.id);
      }
    }
  };

  const handleViewItems = async (gstReturn: GSTReturn) => {
    setSelectedReturn(gstReturn);
    await fetchItems(gstReturn.id);
  };

  const handleCreate = async () => {
    if (!/^\d{2}-\d{4}$/.test(newPeriod)) {
      alert('Enter period as MM-YYYY, e.g. 03-2024');
      return;
    }

    const { data, error } = await supabase
      .from('gst_returns')
      .insert({
        user_id: userId,
        return_period: newPeriod,
        return_type: newType,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create GST return:', error);
      alert('Failed to create GST return');
      return;
    }

    const created = data as GSTReturn;

    if (populateOnCreate) {
      await handlePopulate(created.id);
      await fetchReturns();
      const refreshed = gstReturns.find((r) => r.id === created.id);
      handleViewItems(refreshed || created);
    } else {
      await fetchReturns();
    }

    setCreateModalOpen(false);
    setNewPeriod('');
    setNewType('GSTR1');
    setPopulateOnCreate(true);
  };

  const handleMarkFiled = async (gstReturn: GSTReturn) => {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('gst_returns')
      .update({ status: 'filed', filed_date: today })
      .eq('id', gstReturn.id);
    if (error) {
      console.error('Failed to mark filed:', error);
      alert('Failed to mark return as filed');
      return;
    }
    await fetchReturns();
    if (selectedReturn?.id === gstReturn.id) {
      setSelectedReturn({ ...gstReturn, status: 'filed', filed_date: today });
    }
  };

  const totalTaxableValue = useMemo(
    () => returnItems.reduce((s, i) => s + Number(i.taxable_value || 0), 0),
    [returnItems]
  );
  const totalIgst = useMemo(() => returnItems.reduce((s, i) => s + Number(i.igst || 0), 0), [returnItems]);
  const totalCgst = useMemo(() => returnItems.reduce((s, i) => s + Number(i.cgst || 0), 0), [returnItems]);
  const totalSgst = useMemo(() => returnItems.reduce((s, i) => s + Number(i.sgst || 0), 0), [returnItems]);
  const totalTax = useMemo(() => returnItems.reduce((s, i) => s + Number(i.total_tax || 0), 0), [returnItems]);
  const totalAmount = useMemo(
    () => returnItems.reduce((s, i) => s + Number(i.total_amount || 0), 0),
    [returnItems]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-money-gold tracking-wider uppercase font-serif">GST Returns</h2>
          <p className="text-xs text-text-tertiary mt-1">GSTR1 and GSTR3B filing tracker.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          disabled={schemaReady === false}
          className="neo-btn px-5 py-2.5 rounded-xl text-xs font-bold text-money-gold uppercase tracking-wider flex items-center gap-2 disabled:opacity-40"
        >
          <i className="fas fa-plus"></i>
          Create GST Return
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
                The GST Returns feature requires migration 002 to be applied in Supabase.
                Open the Supabase SQL Editor and run the migration file, then refresh this page.
              </p>
              <p className="mt-3 text-xs font-mono text-amber-200/70 bg-amber-950/30 border border-amber-500/20 rounded-lg px-3 py-2">
                migrations/002_bank_gst_multicurrency.sql
              </p>
            </div>
          </div>
        </div>
      )}

      {loading && gstReturns.length === 0 && (
        <div className="text-center py-12 text-text-tertiary text-sm">Loading GST returns…</div>
      )}

      {!loading && gstReturns.length === 0 && (
        <div className="glass-panel rounded-2xl p-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-surface-highlight/50 border border-divider flex items-center justify-center mb-4">
            <i className="fas fa-file-invoice-dollar text-2xl text-text-muted"></i>
          </div>
          <p className="text-text-secondary">No GST returns yet</p>
          <p className="text-xs text-text-tertiary mt-2">Create a return to get started</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {gstReturns.map((g) => (
          <div
            key={g.id}
            className="glass-panel rounded-2xl p-5 border border-money-gold/15 hover:border-money-gold/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-text-tertiary uppercase tracking-wider font-bold">Period</div>
                <div className="text-lg font-bold text-money-paper">{g.return_period}</div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusBadgeClass(
                    g.status
                  )}`}
                >
                  {g.status}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-surface-highlight/60 text-[10px] font-bold text-text-secondary border border-divider">
                  {g.return_type}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-surface-elevated/40 rounded-xl p-3 border border-divider">
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">IGST</div>
                <div className="text-sm font-bold text-money-paper mt-0.5">{formatCurrency(g.tax_igst)}</div>
              </div>
              <div className="bg-surface-elevated/40 rounded-xl p-3 border border-divider">
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">CGST</div>
                <div className="text-sm font-bold text-money-paper mt-0.5">{formatCurrency(g.tax_cgst)}</div>
              </div>
              <div className="bg-surface-elevated/40 rounded-xl p-3 border border-divider">
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">SGST</div>
                <div className="text-sm font-bold text-money-paper mt-0.5">{formatCurrency(g.tax_sgst)}</div>
              </div>
              <div className="bg-surface-elevated/40 rounded-xl p-3 border border-divider">
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Total Tax</div>
                <div className="text-sm font-bold text-money-green mt-0.5">{formatCurrency(g.total_tax)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-divider">
              <div className="text-xs text-text-secondary">
                <span className="text-text-muted uppercase tracking-wider font-bold mr-2">Invoices</span>
                <span className="font-bold text-money-paper">{g.total_invoices}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleViewItems(g)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-text-secondary hover:text-money-green hover:bg-money-green/10 border border-transparent hover:border-money-green/20 transition-all"
                >
                  <i className="fas fa-eye mr-1.5"></i>
                  View items
                </button>
                <button
                  type="button"
                  onClick={() => handleRefresh(g)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-text-secondary hover:text-sky-200 hover:bg-sky-400/10 border border-transparent hover:border-sky-400/20 transition-all"
                >
                  <i className="fas fa-sync-alt mr-1.5"></i>
                  Refresh
                </button>
                {g.status !== 'filed' && (
                  <button
                    type="button"
                    onClick={() => handleMarkFiled(g)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-text-secondary hover:text-money-gold hover:bg-money-gold/10 border border-transparent hover:border-money-gold/20 transition-all"
                  >
                    <i className="fas fa-check mr-1.5"></i>
                    Mark filed
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View Items Modal */}
      <Modal
        isOpen={!!selectedReturn}
        onClose={() => {
          setSelectedReturn(null);
          setReturnItems([]);
        }}
        title={selectedReturn ? `GST Items — ${selectedReturn.return_period} · ${selectedReturn.return_type}` : 'GST Items'}
        maxWidthClass="max-w-5xl"
      >
        {selectedReturn && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-surface-elevated/40 rounded-xl p-3 border border-divider">
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Taxable Value</div>
                <div className="text-sm font-bold text-money-paper mt-0.5">{formatCurrency(totalTaxableValue)}</div>
              </div>
              <div className="bg-surface-elevated/40 rounded-xl p-3 border border-divider">
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">IGST</div>
                <div className="text-sm font-bold text-money-paper mt-0.5">{formatCurrency(totalIgst)}</div>
              </div>
              <div className="bg-surface-elevated/40 rounded-xl p-3 border border-divider">
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">CGST</div>
                <div className="text-sm font-bold text-money-paper mt-0.5">{formatCurrency(totalCgst)}</div>
              </div>
              <div className="bg-surface-elevated/40 rounded-xl p-3 border border-divider">
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">SGST</div>
                <div className="text-sm font-bold text-money-paper mt-0.5">{formatCurrency(totalSgst)}</div>
              </div>
              <div className="bg-surface-elevated/40 rounded-xl p-3 border border-divider">
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Total Tax</div>
                <div className="text-sm font-bold text-money-green mt-0.5">{formatCurrency(totalTax)}</div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-highlight/50 border-b border-divider">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em]">Invoice #</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em]">Customer</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em]">Taxable Value</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em]">IGST</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em]">CGST</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em]">SGST</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em]">Total Tax</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-text-tertiary uppercase tracking-[0.15em]">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {itemsLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-text-tertiary text-sm">Loading items…</td>
                      </tr>
                    ) : returnItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center">
                          <p className="text-text-secondary">No items found</p>
                          <p className="text-xs text-text-tertiary mt-1">Click Refresh to populate from invoices</p>
                        </td>
                      </tr>
                    ) : (
                      returnItems.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-money-green">{item.invoice_number || '—'}</td>
                          <td className="px-4 py-3 text-xs text-money-paper">{item.customer_name || '—'}</td>
                          <td className="px-4 py-3 text-xs text-right tabular-nums text-text-secondary">
                            {formatCurrency(item.taxable_value)}
                          </td>
                          <td className="px-4 py-3 text-xs text-right tabular-nums text-text-secondary">
                            {formatCurrency(item.igst)}
                          </td>
                          <td className="px-4 py-3 text-xs text-right tabular-nums text-text-secondary">
                            {formatCurrency(item.cgst)}
                          </td>
                          <td className="px-4 py-3 text-xs text-right tabular-nums text-text-secondary">
                            {formatCurrency(item.sgst)}
                          </td>
                          <td className="px-4 py-3 text-xs text-right tabular-nums font-bold text-money-green">
                            {formatCurrency(item.total_tax)}
                          </td>
                          <td className="px-4 py-3 text-xs text-right tabular-nums font-serif font-bold text-money-gold">
                            {formatCurrency(item.total_amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => selectedReturn && handleRefresh(selectedReturn)}
                className="neo-btn px-5 py-2.5 rounded-xl text-xs font-bold text-money-gold uppercase tracking-wider"
              >
                <i className="fas fa-sync-alt mr-2"></i>
                Refresh Items
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create GST Return"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5">
              Return Period (MM-YYYY)
            </label>
            <input
              type="text"
              placeholder="03-2024"
              value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value)}
              className="neo-input w-full rounded-xl py-2.5 px-4 text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5">
              Return Type
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as GSTReturnType)}
              className="neo-input w-full rounded-xl py-2.5 px-4 text-sm cursor-pointer"
            >
              <option value="GSTR1">GSTR1</option>
              <option value="GSTR3B">GSTR3B</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={populateOnCreate}
              onChange={(e) => setPopulateOnCreate(e.target.checked)}
              className="accent-money-green w-4 h-4"
            />
            <span className="text-sm text-text-secondary">Populate items from invoices after create</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-text-secondary hover:text-money-paper transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="neo-btn px-6 py-2.5 rounded-xl text-xs font-bold text-money-gold uppercase tracking-wider"
            >
              Create Return
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
