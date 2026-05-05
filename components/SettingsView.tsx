import React, { useEffect, useMemo, useState } from 'react';
import type { Category, LocationType, ProductRow } from '../types';
import { CategoryManager } from './CategoryManager';

export type SettingsNavId =
  | 'overview'
  | 'company'
  | 'categories'
  | 'data'
  | 'preferences'
  | 'account'
  | 'products';

type CompanyInfoBlock = {
  name: string;
  gstNumber: string;
  address: string;
  phone: string;
  email: string;
};

function formatIncomeLabel(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '₹0.00L';
  const lakhs = amount / 100000;
  return `₹${lakhs.toFixed(2)}L`;
}

function branchLabel(loc: LocationType): string {
  return loc === 'calicut' ? 'CALICUT' : 'COCHIN';
}

const navItem = (active: boolean) =>
  `w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-[11px] font-bold uppercase tracking-wider transition-all border ${
    active
      ? 'bg-money-green/15 border-money-green/35 text-money-green shadow-[inset_0_0_0_1px_rgba(133,187,101,0.12)]'
      : 'border-transparent text-text-secondary hover:bg-[#0c1410]/80 hover:text-money-paper'
  }`;

const quickCard =
  'glass-panel rounded-2xl p-5 border border-[#85bb65]/12 hover:border-money-gold/25 hover:shadow-[0_0_24px_rgba(212,175,55,0.08)] transition-all text-left group cursor-pointer';

const statMini = 'glass-panel rounded-xl px-4 py-4 border border-[#85bb65]/10 text-center';

interface SettingsViewProps {
  companyInfo: CompanyInfoBlock;
  location: LocationType;
  onLocationChange: (loc: LocationType) => void;
  totalIncomePaid: number;
  invoicesCount: number;
  clientsCount: number;
  expensesCountThisBranch: number;
  cashTxnsCountThisBranch: number;
  expensesCountAllBranches: number;
  cashTxnsCountAllBranches: number;
  products: ProductRow[];
  categories: Category[];
  onAddCategory: (name: string, color?: string) => void;
  onDeleteCategory: (id: string) => void;
  onAddProduct: (row: Omit<ProductRow, 'id' | 'created_at'>) => Promise<void>;
  onUpdateProduct: (id: string, updates: Partial<ProductRow>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  primaryColor: string;
  onQuickNewInvoice: () => void;
  onQuickNewExpense: () => void;
  onQuickAddClient: () => void;
  onQuickCashBook: () => void;
  onOpenMonthlyRevenue: () => void;
  onOpenClients: () => void;
  onOpenImport: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  companyInfo,
  location,
  onLocationChange,
  totalIncomePaid,
  invoicesCount,
  clientsCount,
  expensesCountThisBranch,
  cashTxnsCountThisBranch,
  expensesCountAllBranches,
  cashTxnsCountAllBranches,
  products,
  categories,
  onAddCategory,
  onDeleteCategory,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  primaryColor,
  onQuickNewInvoice,
  onQuickNewExpense,
  onQuickAddClient,
  onQuickCashBook,
  onOpenMonthlyRevenue,
  onOpenClients,
  onOpenImport,
}) => {
  const [section, setSection] = useState<SettingsNavId>('overview');
  const [scope, setScope] = useState<'global' | LocationType>(() => location);

  useEffect(() => {
    if (scope === 'global') return;
    if (scope !== location) setScope(location);
  }, [location, scope]);

  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: '',
    description: '',
    price: '' as string,
    stock: '' as string,
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productBusy, setProductBusy] = useState(false);

  const headerBranchLine = useMemo(() => {
    const b =
      scope === 'global'
        ? 'ALL BRANCHES'
        : branchLabel(scope);
    return `${companyInfo.name.toUpperCase()} • ${b} • GST: ${companyInfo.gstNumber}`;
  }, [companyInfo, scope]);

  const expenseCount = scope === 'global' ? expensesCountAllBranches : expensesCountThisBranch;
  const cashCount = scope === 'global' ? cashTxnsCountAllBranches : cashTxnsCountThisBranch;

  const setBranchScope = (loc: LocationType) => {
    setScope(loc);
    onLocationChange(loc);
  };

  const setGlobalScope = () => {
    setScope('global');
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      sku: '',
      category: '',
      description: '',
      price: '',
      stock: '',
    });
    setEditingProductId(null);
  };

  const loadProductIntoForm = (p: ProductRow) => {
    setEditingProductId(p.id);
    setProductForm({
      name: p.name,
      sku: p.sku || '',
      category: p.category || '',
      description: p.description || '',
      price: p.price != null ? String(p.price) : '',
      stock: p.stock_quantity != null ? String(p.stock_quantity) : '',
    });
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(productForm.price) || 0;
    const stockRaw = productForm.stock.trim();
    const stock_quantity = stockRaw === '' ? null : parseInt(stockRaw, 10);
    if (stock_quantity !== null && Number.isNaN(stock_quantity)) {
      alert('Stock must be a whole number.');
      return;
    }
    if (!productForm.name.trim()) {
      alert('Name is required.');
      return;
    }
    setProductBusy(true);
    try {
      if (editingProductId) {
        await onUpdateProduct(editingProductId, {
          name: productForm.name.trim(),
          sku: productForm.sku.trim() || null,
          category: productForm.category.trim() || null,
          description: productForm.description.trim() || null,
          price,
          stock_quantity,
        });
      } else {
        await onAddProduct({
          name: productForm.name.trim(),
          sku: productForm.sku.trim() || null,
          category: productForm.category.trim() || null,
          description: productForm.description.trim() || null,
          price,
          stock_quantity,
        });
      }
      resetProductForm();
    } finally {
      setProductBusy(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    setProductBusy(true);
    try {
      await onDeleteProduct(id);
      if (editingProductId === id) resetProductForm();
    } finally {
      setProductBusy(false);
    }
  };

  const sidebarNav: { id: SettingsNavId; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'fa-bolt' },
    { id: 'company', label: 'Company info', icon: 'fa-building' },
    { id: 'categories', label: 'Categories', icon: 'fa-tags' },
    { id: 'data', label: 'Data & export', icon: 'fa-database' },
    { id: 'preferences', label: 'Preferences', icon: 'fa-sliders-h' },
    { id: 'account', label: 'Account', icon: 'fa-user-circle' },
    { id: 'products', label: 'Products', icon: 'fa-box-open' },
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-8 animate-fade-in">
      {/* Top header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-money-gold tracking-tight">Settings</h1>
          <p className="text-[11px] text-text-tertiary mt-3 max-w-2xl leading-relaxed uppercase tracking-wide">
            {headerBranchLine}
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-3">
          <p className="text-sm font-bold text-money-green whitespace-nowrap">
            Total income (paid) <span className="tabular-nums">{formatIncomeLabel(totalIncomePaid)}</span>
          </p>
          <div className="flex items-center gap-2 neo-btn px-4 py-2.5 rounded-full border border-[#85bb65]/20 text-xs font-bold text-money-paper">
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px]"
              style={{ backgroundColor: primaryColor }}
            >
              <i className="fas fa-location-dot" />
            </span>
            {scope === 'global' ? 'All branches' : branchLabel(location)}
          </div>
        </div>
      </div>

      {/* Location scope tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 rounded-2xl bg-[#0c1410]/90 border border-[#85bb65]/15">
          {(['global', 'cochin', 'calicut'] as const).map((key) => {
            const active =
              key === 'global' ? scope === 'global' : scope === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => (key === 'global' ? setGlobalScope() : setBranchScope(key))}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  active
                    ? 'bg-[#1a2820] text-money-gold border border-[#85bb65]/25 shadow-inner'
                    : 'text-text-tertiary hover:text-money-green border border-transparent'
                }`}
              >
                {key === 'global' ? 'Global' : key === 'cochin' ? 'Cochin' : 'Calicut'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar */}
        <aside className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-[#85bb65]/12">
            <div className="flex items-center gap-2 mb-1">
              <i className="fas fa-cog text-money-gold" />
              <span className="text-sm font-black text-money-paper uppercase tracking-widest">Settings</span>
            </div>
            <p className="text-[10px] text-text-tertiary leading-relaxed">
              Configure your FETS Cash experience
            </p>
          </div>
          <nav className="space-y-1">
            {sidebarNav.map((item) => (
              <button
                key={item.id}
                type="button"
                className={navItem(section === item.id)}
                onClick={() => setSection(item.id)}
              >
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm bg-black/30 border border-[#85bb65]/10"
                  style={{ color: section === item.id ? primaryColor : undefined }}
                >
                  <i className={`fas ${item.icon}`} />
                </span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-8">
          {section === 'overview' && (
            <>
              <section>
                <h2 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.25em] mb-4">
                  Quick actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <button type="button" className={quickCard} onClick={onQuickNewInvoice}>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-300 text-xl mb-3 border border-amber-500/20">
                      <i className="fas fa-file-invoice" />
                    </div>
                    <p className="text-sm font-bold text-money-paper">New invoice</p>
                    <p className="text-[10px] text-text-tertiary mt-1">Create invoice</p>
                  </button>
                  <button type="button" className={quickCard} onClick={onQuickNewExpense}>
                    <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center text-red-300 text-xl mb-3 border border-red-500/20">
                      <i className="fas fa-receipt" />
                    </div>
                    <p className="text-sm font-bold text-money-paper">New expense</p>
                    <p className="text-[10px] text-text-tertiary mt-1">Record expense</p>
                  </button>
                  <button type="button" className={quickCard} onClick={onQuickAddClient}>
                    <div className="w-12 h-12 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-300 text-xl mb-3 border border-sky-500/20">
                      <i className="fas fa-user-plus" />
                    </div>
                    <p className="text-sm font-bold text-money-paper">Add client</p>
                    <p className="text-[10px] text-text-tertiary mt-1">New client</p>
                  </button>
                  <button type="button" className={quickCard} onClick={onQuickCashBook}>
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/15 flex items-center justify-center text-yellow-200 text-xl mb-3 border border-yellow-500/25">
                      <i className="fas fa-landmark" />
                    </div>
                    <p className="text-sm font-bold text-money-paper">Bank / cash book</p>
                    <p className="text-[10px] text-text-tertiary mt-1">Cash entries &amp; INR</p>
                  </button>
                  <button type="button" className={quickCard} onClick={onOpenMonthlyRevenue}>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-300 text-xl mb-3 border border-emerald-500/20">
                      <i className="fas fa-chart-line" />
                    </div>
                    <p className="text-sm font-bold text-money-paper">Monthly revenue</p>
                    <p className="text-[10px] text-text-tertiary mt-1">From invoices by client</p>
                  </button>
                  <button type="button" className={quickCard} onClick={() => setSection('products')}>
                    <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-300 text-xl mb-3 border border-violet-500/20">
                      <i className="fas fa-boxes-stacked" />
                    </div>
                    <p className="text-sm font-bold text-money-paper">Products</p>
                    <p className="text-[10px] text-text-tertiary mt-1">Manage catalog</p>
                  </button>
                </div>
              </section>

              <section>
                <h2 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.25em] mb-4">
                  System overview
                  {scope === 'global' && (
                    <span className="normal-case text-text-tertiary font-normal ml-2">
                      — expenses &amp; cash are all branches; clients &amp; invoices are workspace-wide
                    </span>
                  )}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className={statMini}>
                    <p className="text-[9px] uppercase text-text-tertiary font-bold">Invoices</p>
                    <p className="text-2xl font-bold text-sky-300 tabular-nums mt-1">{invoicesCount}</p>
                  </div>
                  <div className={statMini}>
                    <p className="text-[9px] uppercase text-text-tertiary font-bold">Clients</p>
                    <p className="text-2xl font-bold text-sky-300 tabular-nums mt-1">{clientsCount}</p>
                  </div>
                  <div className={statMini}>
                    <p className="text-[9px] uppercase text-text-tertiary font-bold">Expenses</p>
                    <p className="text-2xl font-bold text-red-400 tabular-nums mt-1">{expenseCount}</p>
                  </div>
                  <div className={statMini}>
                    <p className="text-[9px] uppercase text-text-tertiary font-bold">Cash txns</p>
                    <p className="text-2xl font-bold text-amber-200 tabular-nums mt-1">{cashCount}</p>
                  </div>
                  <div className={statMini}>
                    <p className="text-[9px] uppercase text-text-tertiary font-bold">Products</p>
                    <p className="text-2xl font-bold text-money-gold tabular-nums mt-1">{products.length}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onOpenClients}
                    className="neo-btn px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-money-green border border-money-green/25"
                  >
                    Open clients
                  </button>
                  <button
                    type="button"
                    onClick={() => setSection('products')}
                    className="neo-btn px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-text-secondary border border-[#85bb65]/15"
                  >
                    Manage products
                  </button>
                </div>
              </section>
            </>
          )}

          {section === 'company' && (
            <div className="glass-panel rounded-2xl p-8 border border-[#85bb65]/12">
              <h3 className="text-xl font-black text-money-gold uppercase tracking-widest font-serif mb-6 border-b border-[#85bb65]/20 pb-4">
                Company information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div>
                  <label className="text-text-tertiary text-xs uppercase">Company name</label>
                  <p className="font-bold text-money-paper mt-1">{companyInfo.name}</p>
                </div>
                <div>
                  <label className="text-text-tertiary text-xs uppercase">GST</label>
                  <p className="font-bold text-money-green mt-1">{companyInfo.gstNumber}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-text-tertiary text-xs uppercase">Address</label>
                  <p className="font-bold text-money-paper mt-1">{companyInfo.address}</p>
                </div>
                {(companyInfo.phone || companyInfo.email) && (
                  <div className="sm:col-span-2 flex flex-wrap gap-6">
                    {companyInfo.phone && (
                      <div>
                        <label className="text-text-tertiary text-xs uppercase">Phone</label>
                        <p className="font-bold text-money-paper mt-1">{companyInfo.phone}</p>
                      </div>
                    )}
                    {companyInfo.email && (
                      <div>
                        <label className="text-text-tertiary text-xs uppercase">Email</label>
                        <p className="font-bold text-money-paper mt-1">{companyInfo.email}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-text-tertiary mt-6 leading-relaxed">
                Invoice PDFs and remittances use this profile. To change it, update the constants in your app configuration
                (ask your developer).
              </p>
            </div>
          )}

          {section === 'categories' && (
            <div className="glass-panel rounded-2xl p-8 border border-[#85bb65]/12">
              <h3 className="text-xl font-black text-money-gold uppercase tracking-widest font-serif mb-6 border-b border-[#85bb65]/20 pb-4">
                Expense categories
              </h3>
              <CategoryManager categories={categories} onAdd={onAddCategory} onDelete={onDeleteCategory} />
            </div>
          )}

          {section === 'data' && (
            <div className="glass-panel rounded-2xl p-8 border border-[#85bb65]/12 space-y-4">
              <h3 className="text-xl font-black text-money-gold uppercase tracking-widest font-serif border-b border-[#85bb65]/20 pb-4">
                Data &amp; export
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Import clients and invoices from spreadsheets, or prepare data for reporting workflows.
              </p>
              <button
                type="button"
                onClick={onOpenImport}
                className="neo-btn px-6 py-3 rounded-xl text-xs font-bold text-money-gold border border-money-gold/25 uppercase tracking-wider"
              >
                <i className="fas fa-file-import mr-2" />
                Open data import
              </button>
            </div>
          )}

          {section === 'preferences' && (
            <div className="glass-panel rounded-2xl p-8 border border-[#85bb65]/12">
              <h3 className="text-xl font-black text-money-gold uppercase tracking-widest font-serif mb-4">
                Preferences
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Branch selection uses the toggle in the header. Dashboard charts and expense register follow the active branch;
                clients, invoices, and products are shared across branches for this workspace.
              </p>
            </div>
          )}

          {section === 'account' && (
            <div className="glass-panel rounded-2xl p-8 border border-[#85bb65]/12">
              <h3 className="text-xl font-black text-money-gold uppercase tracking-widest font-serif mb-4">
                Account
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Session and workspace access are managed by your Supabase-linked account. Use Clients and Invoices in the
                sidebar for day-to-day records.
              </p>
            </div>
          )}

          {section === 'products' && (
            <div className="space-y-6">
              <div className="glass-panel rounded-2xl p-6 border border-[#85bb65]/12">
                <h3 className="text-lg font-black text-money-gold uppercase tracking-widest font-serif mb-2">
                  Products
                </h3>
                <p className="text-xs text-text-tertiary mb-6">
                  Catalog items available across the app. Line items on invoices can mirror these names for consistency.
                </p>

                <form onSubmit={handleProductSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase text-text-tertiary font-bold">Name</label>
                    <input
                      className="neo-input w-full rounded-xl p-3 text-sm mt-1"
                      value={productForm.name}
                      onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Product name"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-text-tertiary font-bold">SKU</label>
                    <input
                      className="neo-input w-full rounded-xl p-3 text-sm mt-1"
                      value={productForm.sku}
                      onChange={(e) => setProductForm((f) => ({ ...f, sku: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-text-tertiary font-bold">Category</label>
                    <input
                      className="neo-input w-full rounded-xl p-3 text-sm mt-1"
                      value={productForm.category}
                      onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-text-tertiary font-bold">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      className="neo-input w-full rounded-xl p-3 text-sm mt-1"
                      value={productForm.price}
                      onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-text-tertiary font-bold">Stock</label>
                    <input
                      type="number"
                      className="neo-input w-full rounded-xl p-3 text-sm mt-1"
                      value={productForm.stock}
                      onChange={(e) => setProductForm((f) => ({ ...f, stock: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase text-text-tertiary font-bold">Description</label>
                    <textarea
                      className="neo-input w-full rounded-xl p-3 text-sm mt-1 min-h-[80px]"
                      value={productForm.description}
                      onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={productBusy}
                      className="neo-btn px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-money-gold border border-money-gold/25"
                    >
                      {editingProductId ? 'Save changes' : 'Add product'}
                    </button>
                    {editingProductId && (
                      <button
                        type="button"
                        onClick={resetProductForm}
                        className="neo-btn px-6 py-3 rounded-xl text-xs font-bold text-text-secondary"
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                </form>

                <div className="overflow-x-auto rounded-xl border border-[#85bb65]/10">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#0c1410]/90 text-[9px] uppercase text-text-tertiary border-b border-[#85bb65]/20">
                        <th className="text-left px-4 py-3 font-black tracking-wider">Name</th>
                        <th className="text-left px-4 py-3 font-black tracking-wider">SKU</th>
                        <th className="text-left px-4 py-3 font-black tracking-wider">Category</th>
                        <th className="text-right px-4 py-3 font-black tracking-wider">Price</th>
                        <th className="text-right px-4 py-3 font-black tracking-wider">Stock</th>
                        <th className="text-center px-4 py-3 font-black tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#85bb65]/10">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-[#85bb65]/5">
                          <td className="px-4 py-3 font-medium text-money-paper">{p.name}</td>
                          <td className="px-4 py-3 font-mono text-text-tertiary">{p.sku || '—'}</td>
                          <td className="px-4 py-3 text-text-secondary">{p.category || '—'}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{Number(p.price).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{p.stock_quantity ?? '—'}</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => loadProductIntoForm(p)}
                              className="p-2 rounded-lg text-text-tertiary hover:text-money-gold"
                              title="Edit"
                            >
                              <i className="fas fa-edit" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-2 rounded-lg text-text-tertiary hover:text-red-400"
                              title="Delete"
                            >
                              <i className="fas fa-trash" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {products.length === 0 && (
                    <div className="text-center py-10 text-text-secondary text-sm">No products yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
