import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { User, Expense, LocationType, Category, FetsTransaction, Customer, Invoice, Payment } from './types';
import { CATEGORY_REPLENISHMENT } from './constants';
import HoloToggle from './components/HoloToggle';
import { ExpenseForm } from './components/ExpenseForm';
import { CashTransactionForm } from './components/CashTransactionForm';
import { CategoryManager } from './components/CategoryManager';
import { CustomerList } from './components/CustomerList';
import { CustomerForm } from './components/CustomerForm';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceForm } from './components/InvoiceForm';
import { DataImport } from './components/DataImport';
import { Modal } from './components/Modal';
import { Sidebar } from './components/Sidebar';
import { StatsCard } from './components/StatsCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

// Main views for the application
type ViewType = 'dashboard' | 'expenses' | 'cash' | 'customers' | 'invoices' | 'reports' | 'import' | 'settings';

// Company info for invoices
const COMPANY_INFO = {
  name: 'Forum Testing & Educational Services',
  gstNumber: '32AAIFF5955B1ZO',
  address: 'Cochin, Kerala, India',
  phone: '',
  email: '',
};

function App() {
  // --- Core State ---
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useState<LocationType>('cochin');
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [loading, setLoading] = useState(true);

  // --- Data State ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [fetsTransactions, setFetsTransactions] = useState<FetsTransaction[]>([]);
  const [cashBalance, setCashBalance] = useState(0);

  // --- NEW: Customer & Invoice State ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // --- UI State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'expense' | 'cash' | 'customer' | 'invoice' | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<FetsTransaction | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  // --- Delete Confirmation State ---
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'expense' | 'cash' | 'customer' | 'invoice'>('expense');

  // --- Filter State ---
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(true);

  // --- Theme ---
  const primaryColor = location === 'cochin' ? '#85bb65' : '#3e5c76';

  // --- ID Generation Helper ---
  const generateNextId = (prefix: string, items: { custom_id?: string, paid_by?: string }[]) => {
    const maxNum = items.reduce((max, item) => {
      const idStr = item.custom_id || item.paid_by;
      if (idStr && idStr.startsWith(prefix)) {
        const numStr = idStr.replace(prefix, '');
        const num = parseInt(numStr, 10);
        return !isNaN(num) && num > max ? num : max;
      }
      return max;
    }, 0);
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(2, '0')}`;
  };

  const nextExpenseId = useMemo(() =>
    generateNextId(location === 'cochin' ? 'ECK' : 'ECL', expenses),
    [expenses, location]);

  const nextCashId = useMemo(() =>
    generateNextId(location === 'cochin' ? 'CCK' : 'CCL', fetsTransactions),
    [fetsTransactions, location]);

  // --- Invoice Number Generator ---
  // Format: {BranchLetter}{CustomerCode}-{Sequence}
  // e.g. CP-10 = Calicut + Prometric, sequence 10
  // Branch: C = Calicut, K = Cochin (Kochi)
  // CustomerCode: First letter of each significant word, max 2 chars, uppercase
  const getInvoicePrefix = (customerId: string, loc: LocationType): string => {
    const branchLetter = loc === 'calicut' ? 'C' : 'K';
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return `${branchLetter}X`;
    // Build 1-2 char customer code from initials of significant words
    const words = customer.name
      .replace(/\bpvt\b|\bltd\b|\bllc\b|\binc\b|\bservices\b|\btesting\b|\bvue\b/gi, '')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 1);
    const code = words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
    return `${branchLetter}${code || 'X'}`;
  };

  const generateInvoiceNumber = async (customerId: string, loc: LocationType): Promise<string> => {
    const prefix = getInvoicePrefix(customerId, loc);
    // Count existing invoices with this prefix to determine next sequence
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `${prefix}-%`);
    if (error) console.error('Error generating invoice number:', error);
    // Parse the highest existing sequence for this prefix
    const maxSeq = (data || []).reduce((max: number, row: any) => {
      const parts = row.invoice_number?.split('-');
      const seq = parts ? parseInt(parts[parts.length - 1], 10) : 0;
      return !isNaN(seq) && seq > max ? seq : max;
    }, 0);
    return `${prefix}-${maxSeq + 1}`;
  };

  // --- Initialization ---
  useEffect(() => {
    const handleAuth = async () => {
      const DEMO_EMAIL = 'user@forum-testing.com';
      const DEMO_PASSWORD = 'forum-testing-password';
      let { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
        if (error) {
          const { data: upData, error: upError } = await supabase.auth.signUp({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
          if (!upError && upData.session) session = upData.session;
        } else {
          session = data.session;
        }
      }

      if (session) {
        setUser({ id: session.user.id, email: session.user.email });
        await initializeData(session.user.id);
        fetchAllData(session.user.id, location);
      } else {
        setLoading(false);
      }
    };

    handleAuth();

    const channel = supabase.channel('public-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        if (user) fetchAllData(user.id, location);
      })
      .subscribe();

    const handleClickOutside = () => setActiveActionId(null);
    document.addEventListener('click', handleClickOutside);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [user?.id, location]);

  useEffect(() => {
    resetFilters();
  }, [currentView, location]);

  // --- Data Initialization ---
  const initializeData = async (userId: string) => {
    // Initialize default categories
    const { data: cats } = await supabase.from('categories').select('id').eq('user_id', userId);
    if (cats && cats.length === 0) {
      const defaults = [CATEGORY_REPLENISHMENT, 'Office Supplies', 'Travel', 'Food & Beverage', 'Utilities', 'Maintenance', 'Salaries', 'Rent', 'Marketing', 'Bank Charges'];
      await supabase.from('categories').insert(defaults.map(name => ({ user_id: userId, name })));
    }

    // Initialize default customers (Prometric, Pearson Vue, etc.)
    const { data: existingCustomers } = await supabase.from('customers').select('id').eq('user_id', userId);
    if (existingCustomers && existingCustomers.length === 0) {
      const defaultCustomers = [
        { name: 'Prometric Testing Services', country: 'USA', currency: 'USD', email: 'accounts@prometric.com', payment_terms: 30, status: 'active' },
        { name: 'Pearson VUE', country: 'USA', currency: 'USD', email: 'ap@pearsonvue.com', payment_terms: 45, status: 'active' },
        { name: 'PSI Services LLC', country: 'USA', currency: 'USD', email: 'invoices@psiexams.com', payment_terms: 30, status: 'active' },
        { name: 'CELPIP', country: 'Canada', currency: 'CAD', email: 'admin@celpip.ca', payment_terms: 30, status: 'active' },
        { name: 'ITTS India Pvt Ltd', country: 'India', currency: 'INR', email: 'info@itts.in', payment_terms: 30, gst_number: '27AABCI1234C1Z5', status: 'active' },
      ];
      await supabase.from('customers').insert(defaultCustomers.map(c => ({ ...c, user_id: userId })));
    }
  };

  // --- Fetch All Data ---
  const fetchAllData = async (userId: string, loc: LocationType) => {
    setLoading(true);

    // Fetch categories
    const { data: cats } = await supabase.from('categories').select('*').eq('user_id', userId).order('name');
    setCategories(cats || []);

    // Fetch expenses
    const { data: exps } = await supabase.from('expenses').select('*').eq('user_id', userId).eq('location', loc).order('date', { ascending: false });
    setExpenses(exps || []);

    // Fetch cash transactions
    const { data: txs } = await supabase.from('fets_cash_transactions').select('*').eq('user_id', userId).eq('location', loc).order('date', { ascending: false });
    const parsedTxs = (txs || []).map(tx => {
      const parts = tx.description.split(' ||| ');
      if (parts.length >= 3) {
        return { ...tx, custom_id: parts[0], category: parts[1], clean_description: parts.slice(2).join(' ||| ') };
      }
      return { ...tx, clean_description: tx.description, custom_id: 'N/A', category: 'Uncategorized' };
    });
    setFetsTransactions(parsedTxs);
    setCashBalance(parsedTxs.reduce((sum, tx) => sum + tx.amount, 0));

    // Fetch customers
    const { data: custs } = await supabase.from('customers').select('*').eq('user_id', userId).order('name');
    setCustomers(custs || []);

    // Fetch invoices then join service_lines
    const { data: invs } = await supabase.from('invoices').select('*').eq('user_id', userId).order('invoice_date', { ascending: false });
    const invoiceIds = (invs || []).map((inv: any) => inv.id);
    let serviceLinesByInvoice: Record<string, any[]> = {};
    if (invoiceIds.length > 0) {
      const { data: allLines } = await supabase.from('service_lines').select('*').in('invoice_id', invoiceIds);
      (allLines || []).forEach((line: any) => {
        if (!serviceLinesByInvoice[line.invoice_id]) serviceLinesByInvoice[line.invoice_id] = [];
        serviceLinesByInvoice[line.invoice_id].push(line);
      });
    }
    setInvoices((invs || []).map((inv: any) => ({ ...inv, service_lines: serviceLinesByInvoice[inv.id] || [] })));

    setLoading(false);
  };

  // --- HANDLERS: Customers ---
  const handleAddCustomer = async (customerData: Omit<Customer, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    const { error } = await supabase.from('customers').insert({ ...customerData, user_id: user.id });
    if (error) console.error('Error adding customer:', error);
    fetchAllData(user.id, location);
  };

  const handleUpdateCustomer = async (id: string, updates: Partial<Customer>) => {
    if (!user) return;
    const { error } = await supabase.from('customers').update(updates).eq('id', id);
    if (error) console.error('Error updating customer:', error);
    fetchAllData(user.id, location);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!user) return;
    // Check if customer has invoices
    const hasInvoices = invoices.some(inv => inv.customer_id === id);
    if (hasInvoices) {
      alert('Cannot delete customer with existing invoices. Please delete invoices first.');
      return;
    }
    await supabase.from('customers').delete().eq('id', id);
    fetchAllData(user.id, location);
  };

  // --- HANDLERS: Invoices ---
  const handleAddInvoice = async (invoiceData: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    // service_lines is NOT a column on the invoices table — strip it before insert
    const { service_lines, ...invoicePayload } = invoiceData as any;

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        ...invoicePayload,
        user_id: user.id,
        invoice_number: invoicePayload.invoice_number || await generateInvoiceNumber(invoicePayload.customer_id, location),
      })
      .select('id')
      .single();

    if (error) { console.error('Error adding invoice:', error); return; }

    // Insert service lines with invoice_id FK
    if (data?.id && Array.isArray(service_lines) && service_lines.length > 0) {
      const lines = service_lines.map((line: any) => ({
        invoice_id: data.id,
        description: line.description,
        quantity: line.quantity ?? 1,
        rate: line.rate,
        amount: line.amount,
        currency: line.currency ?? invoicePayload.currency,
      }));
      const { error: lineError } = await supabase.from('service_lines').insert(lines);
      if (lineError) console.error('Error saving service lines:', lineError);
    }

    fetchAllData(user.id, location);
  };

  const handleUpdateInvoice = async (id: string, updates: Partial<Invoice>) => {
    if (!user) return;

    // Strip service_lines from the invoice update payload
    const { service_lines, ...invoiceUpdates } = updates as any;

    const { error } = await supabase.from('invoices').update(invoiceUpdates).eq('id', id);
    if (error) { console.error('Error updating invoice:', error); return; }

    // Replace service lines: delete existing rows, insert new ones
    if (Array.isArray(service_lines)) {
      await supabase.from('service_lines').delete().eq('invoice_id', id);
      if (service_lines.length > 0) {
        const lines = service_lines.map((line: any) => ({
          invoice_id: id,
          description: line.description,
          quantity: line.quantity ?? 1,
          rate: line.rate,
          amount: line.amount,
          currency: line.currency ?? invoiceUpdates.currency,
        }));
        const { error: lineError } = await supabase.from('service_lines').insert(lines);
        if (lineError) console.error('Error updating service lines:', lineError);
      }
    }

    fetchAllData(user.id, location);
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!user) return;
    // service_lines cascade-delete via FK ON DELETE CASCADE
    await supabase.from('invoices').delete().eq('id', id);
    fetchAllData(user.id, location);
  };

  const handleRecordPayment = async (invoiceId: string, paymentData: Omit<any, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;

    try {
      // Insert payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          ...paymentData,
          invoice_id: invoiceId,
          user_id: user.id,
        }])
        .select()
        .single();

      if (paymentError) {
        console.error('Payment insertion error:', paymentError);
        alert('Failed to record payment. Please try again.');
        return;
      }

      // Find the invoice to get its total amount
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) return;

      // Calculate new paid amount and status
      const newPaidAmount = (invoice.paid_amount || 0) + paymentData.amount;
      const newStatus = newPaidAmount >= invoice.total_amount ? 'paid' : 'partially_paid';

      // Update invoice with payment details
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          paid_date: paymentData.payment_date,
          payment_reference: paymentData.reference_number,
          status: newStatus,
        })
        .eq('id', invoiceId);

      if (updateError) {
        console.error('Invoice update error:', updateError);
        alert('Payment recorded but failed to update invoice. Please refresh.');
        return;
      }

      // Refresh all data
      fetchAllData(user.id, location);
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('An unexpected error occurred while recording the payment.');
    }
  };

  // --- HANDLERS: Import ---
  const handleImportCustomers = async (customersToImport: any[]) => {
    if (!user) return;
    const withUserId = customersToImport.map(c => ({ ...c, user_id: user.id }));
    const { error } = await supabase.from('customers').insert(withUserId);
    if (error) console.error('Import error:', error);
    fetchAllData(user.id, location);
  };

  const handleImportInvoices = async (invoicesToImport: any[]) => {
    if (!user) return;
    // Map customer names to IDs
    const withUserId = invoicesToImport.map(inv => {
      const customer = customers.find(c => c.name.toLowerCase() === inv.customer_name?.toLowerCase());
      return { ...inv, customer_id: customer?.id || '', user_id: user?.id };
    }).filter(inv => inv.customer_id);
    
    const { error } = await supabase.from('invoices').insert(withUserId);
    if (error) console.error('Import error:', error);
    fetchAllData(user.id, location);
  };

  // --- Existing expense handlers (simplified) ---
  const handleSaveExpense = async (expData: Partial<Expense>) => {
    if (!user) return;
    const payload = { ...expData, user_id: user.id };
    const isReplenishment = payload.category === CATEGORY_REPLENISHMENT;

    if (editingExpense?.id) {
      await supabase.from('expenses').update(payload).eq('id', editingExpense.id);
    } else {
      await supabase.from('expenses').insert(payload);
    }
    
    setIsModalOpen(false);
    fetchAllData(user.id, location);
  };

  const handleSaveCashTransaction = async (txData: Partial<FetsTransaction>) => {
    if (!user) return;
    const payload = { ...txData, user_id: user.id };
    
    if (editingTransaction?.id) {
      await supabase.from('fets_cash_transactions').update(payload).eq('id', editingTransaction.id);
    } else {
      await supabase.from('fets_cash_transactions').insert(payload);
    }
    
    setIsModalOpen(false);
    fetchAllData(user.id, location);
  };

  const confirmDeleteRequest = (id: string, type: 'expense' | 'cash' | 'customer' | 'invoice') => {
    setDeleteId(id);
    setDeleteType(type);
    setActiveActionId(null);
  };

  const executeDelete = async () => {
    if (!deleteId || !user) return;

    if (deleteType === 'expense') {
      await supabase.from('fets_cash_transactions').delete().eq('source_expense_id', deleteId);
      await supabase.from('expenses').delete().eq('id', deleteId);
    } else if (deleteType === 'cash') {
      await supabase.from('fets_cash_transactions').delete().eq('id', deleteId);
    } else if (deleteType === 'customer') {
      await handleDeleteCustomer(deleteId);
    } else if (deleteType === 'invoice') {
      await handleDeleteInvoice(deleteId);
    }

    setDeleteId(null);
    fetchAllData(user.id, location);
  };

  const handleAddCategory = async (name: string) => {
    if (!user) return;
    await supabase.from('categories').insert({ user_id: user.id, name });
    fetchAllData(user.id, location);
  };

  const handleDeleteCategory = async (id: number) => {
    await supabase.from('categories').delete().eq('id', id);
    fetchAllData(user.id, location);
  };

  const openCashModal = (tx: FetsTransaction | null = null) => {
    setEditingTransaction(tx);
    setModalType('cash');
    setIsModalOpen(true);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setDateRange({ start: '', end: '' });
  };

  // --- Computed Data ---
  const totalSpend = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const totalIncome = useMemo(() => invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0), [invoices]);
  const pendingInvoices = useMemo(() => invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue'), [invoices]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = e.description?.toLowerCase().includes(searchQuery.toLowerCase()) || e.paid_by?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      const matchesDateStart = !dateRange.start || e.date >= dateRange.start;
      const matchesDateEnd = !dateRange.end || e.date <= dateRange.end;
      return matchesSearch && matchesCategory && matchesDateStart && matchesDateEnd;
    });
  }, [expenses, categoryFilter, searchQuery, dateRange]);

  const filteredTransactions = useMemo(() => {
    return fetsTransactions.filter(tx => {
      const desc = tx.clean_description || tx.description;
      const matchesSearch = desc.toLowerCase().includes(searchQuery.toLowerCase()) || (tx.custom_id || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDateStart = !dateRange.start || tx.date >= dateRange.start;
      const matchesDateEnd = !dateRange.end || tx.date <= dateRange.end;
      return matchesSearch && matchesDateStart && matchesDateEnd;
    });
  }, [fetsTransactions, searchQuery, dateRange]);

  // Chart Data
  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short' });
      data[key] = 0;
    }
    expenses.forEach(e => {
      const d = new Date(e.date);
      const key = d.toLocaleString('default', { month: 'short' });
      if (data[key] !== undefined) data[key] += e.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const pieData = useMemo(() => {
    const agg: Record<string, number> = {};
    expenses.forEach(e => { agg[e.category] = (agg[e.category] || 0) + e.amount; });
    return Object.entries(agg).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [expenses]);

  // Revenue chart data
  const revenueChartData = useMemo(() => {
    const data: Record<string, { income: number, expense: number }> = {};
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short' });
      data[key] = { income: 0, expense: 0 };
    }
    invoices.filter(inv => inv.status === 'paid').forEach(inv => {
      const d = new Date(inv.invoice_date);
      const key = d.toLocaleString('default', { month: 'short' });
      if (data[key]) data[key].income += inv.total_amount;
    });
    expenses.forEach(e => {
      const d = new Date(e.date);
      const key = d.toLocaleString('default', { month: 'short' });
      if (data[key]) data[key].expense += e.amount;
    });
    return Object.entries(data).map(([name, { income, expense }]) => ({ name, income, expense }));
  }, [invoices, expenses]);

  if (loading && !user) return <div className="h-screen w-full flex items-center justify-center bg-background text-money-green font-serif tracking-widest text-xl animate-pulse">AUTHENTICATING...</div>;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-money-paper">
      <Sidebar
        currentView={currentView}
        onChangeView={(v) => setCurrentView(v as ViewType)}
        locationColor={primaryColor}
      />

      <div className="flex-1 flex flex-col h-full sm:ml-72 relative overflow-hidden">
        <header className="px-8 py-6 flex justify-between items-center z-20 sticky top-0 bg-[#0c1410]/80 backdrop-blur-md border-b border-[#85bb65]/10">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-money-gold capitalize tracking-widest font-serif">
              {currentView === 'dashboard' ? 'Dashboard' :
               currentView === 'expenses' ? 'Expense Register' :
               currentView === 'cash' ? 'Cash Book' :
               currentView === 'customers' ? 'Clients' :
               currentView === 'invoices' ? 'Invoices' :
               currentView === 'reports' ? 'Reports' :
               currentView === 'import' ? 'Data Import' : 'Settings'}
            </h2>
            <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-[0.2em] mt-1">
              Forum Testing & Educational Services • {location === 'cochin' ? 'Cochin' : 'Calicut'} • GST: {COMPANY_INFO.gstNumber}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-text-secondary">Total Income (FY)</p>
              <p className="text-sm font-bold text-money-green">${(totalIncome / 100000).toFixed(2)}L</p>
            </div>
            <div className="transform scale-[0.65] origin-right -mr-4 sm:mr-0">
              <HoloToggle checked={location === 'cochin'} onChange={(c) => setLocation(c ? 'cochin' : 'calicut')} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-24 sm:pb-8 custom-scrollbar">

          {/* --- DASHBOARD --- */}
          {currentView === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title="Total Income" value={`$${(totalIncome / 1000).toFixed(1)}k`} icon="fa-wallet" color="#85bb65" delay={0} />
                <StatsCard title="Pending Invoices" value={pendingInvoices.length.toString()} icon="fa-file-invoice" color="#d4af37" delay={0.05} />
                <StatsCard title="Total Expenses" value={`₹${totalSpend.toLocaleString('en-IN')}`} icon="fa-coins" color={primaryColor} delay={0.1} />
                <StatsCard title="Cash Balance" value={`₹${cashBalance.toLocaleString('en-IN')}`} icon="fa-university" color="#3e5c76" delay={0.15} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-6">Income vs Expenses</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueChartData}>
                        <defs>
                          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#85bb65" stopOpacity={0.3} /><stop offset="95%" stopColor="#85bb65" stopOpacity={0} /></linearGradient>
                          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(133,187,101,0.1)" />
                        <XAxis dataKey="name" stroke="#546e61" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis stroke="#546e61" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                        <Tooltip contentStyle={{ backgroundColor: '#16231d', borderColor: '#85bb65' }} />
                        <Area type="monotone" dataKey="income" stroke="#85bb65" fill="url(#incomeGrad)" strokeWidth={2} />
                        <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-6">Expense Breakdown</h3>
                  <div className="h-[300px]">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="45%"
                            outerRadius={90}
                            innerRadius={45}
                            dataKey="value"
                            nameKey="name"
                            paddingAngle={3}
                          >
                            {pieData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={['#85bb65', '#d4af37', '#3e5c76', '#ef4444', '#a78bfa'][index % 5]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#16231d', borderColor: '#85bb65', fontSize: 12 }}
                            formatter={(value: number, name: string) => [`₹${value.toLocaleString('en-IN')}`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-text-tertiary text-sm">
                        No expense data yet
                      </div>
                    )}
                  </div>
                  {pieData.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {pieData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: ['#85bb65', '#d4af37', '#3e5c76', '#ef4444', '#a78bfa'][index % 5] }}></span>
                            <span className="text-text-secondary truncate max-w-[120px]">{entry.name}</span>
                          </div>
                          <span className="text-money-gold font-bold">₹{entry.value.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-panel rounded-2xl p-6 border border-money-gold/20">
                <h3 className="text-sm font-bold text-money-gold uppercase tracking-widest mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => { setEditingInvoice(null); setModalType('invoice'); setIsModalOpen(true); }}
                    className="neo-btn px-6 py-3 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20 flex items-center gap-2">
                    <i className="fas fa-plus"></i> New Invoice
                  </button>
                  <button onClick={() => setCurrentView('customers')}
                    className="neo-btn px-6 py-3 rounded-xl text-xs font-bold text-text-secondary flex items-center gap-2">
                    <i className="fas fa-users"></i> View Clients
                  </button>
                  <button onClick={() => setCurrentView('import')}
                    className="neo-btn px-6 py-3 rounded-xl text-xs font-bold text-text-secondary flex items-center gap-2">
                    <i className="fas fa-file-import"></i> Import Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- EXPENSES (Existing) --- */}
          {currentView === 'expenses' && (
            <div className="space-y-6">
              {/* Header with add button */}
              <div className="flex justify-between items-center">
                <div className="relative flex-1 max-w-md">
                  <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"></i>
                  <input type="text" placeholder="Search expenses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="neo-input w-full rounded-xl py-3 pl-11 text-sm" />
                </div>
                <button onClick={() => { setEditingExpense(null); setModalType('expense'); setIsModalOpen(true); }}
                  className="neo-btn px-6 py-3 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20 flex items-center gap-2">
                  <i className="fas fa-plus"></i> Add Expense
                </button>
              </div>

              {/* Expenses Table */}
              <div className="glass-panel rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#0c1410]/50 border-b border-[#85bb65]/20">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase">Date</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase">ID</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase">Category</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase">Description</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-text-tertiary uppercase">Amount</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-text-tertiary uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#85bb65]/5">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-[#85bb65]/5">
                        <td className="px-6 py-4 text-xs">{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                        <td className="px-6 py-4 text-xs font-bold text-money-green">{exp.paid_by}</td>
                        <td className="px-6 py-4 text-xs">{exp.category}</td>
                        <td className="px-6 py-4 text-xs text-text-secondary truncate max-w-xs">{exp.description}</td>
                        <td className="px-6 py-4 text-right font-bold text-money-gold">₹{exp.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => { setEditingExpense(exp); setModalType('expense'); setIsModalOpen(true); }}
                            className="text-text-tertiary hover:text-money-gold mr-2"><i className="fas fa-edit"></i></button>
                          <button onClick={() => confirmDeleteRequest(exp.id!, 'expense')} className="text-text-tertiary hover:text-red-400"><i className="fas fa-trash"></i></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredExpenses.length === 0 && (
                  <div className="text-center py-12 text-text-secondary">
                    <i className="fas fa-receipt text-3xl mb-4"></i><p>No expenses found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- CASH (Existing) --- */}
          {currentView === 'cash' && (
            <div className="space-y-6">
              {/* Cash Balance Card */}
              <div className="glass-panel rounded-2xl p-6 border border-[#85bb65]/20 flex justify-between items-center"
                style={{ background: 'linear-gradient(135deg, #1b3826 0%, #0c1410 100%)' }}>
                <div>
                  <p className="text-xs text-money-green/60 uppercase tracking-wider">Current Cash Balance</p>
                  <h3 className="text-4xl font-bold text-white font-serif">₹{cashBalance.toLocaleString('en-IN')}</h3>
                </div>
                <button onClick={() => openCashModal()} className="neo-btn px-6 py-3 rounded-xl text-xs font-bold text-money-gold">
                  <i className="fas fa-plus mr-2"></i>New Transaction
                </button>
              </div>

              {/* Cash Transactions Table */}
              <div className="glass-panel rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#0c1410]/50 border-b border-[#85bb65]/20">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase">Date</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase">Ref ID</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase">Category</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase">Description</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-text-tertiary uppercase">Amount</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-text-tertiary uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#85bb65]/5">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#85bb65]/5">
                        <td className="px-6 py-4 text-xs">{new Date(tx.date).toLocaleDateString('en-GB')}</td>
                        <td className="px-6 py-4 text-xs font-bold text-money-green">{tx.custom_id}</td>
                        <td className="px-6 py-4 text-xs">{tx.category}</td>
                        <td className="px-6 py-4 text-xs text-text-secondary">{tx.clean_description}</td>
                        <td className={`px-6 py-4 text-right font-bold ${tx.amount >= 0 ? 'text-money-green' : 'text-red-400'}`}>
                          {tx.amount >= 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => openCashModal(tx)} className="text-text-tertiary hover:text-money-gold mr-2"><i className="fas fa-edit"></i></button>
                          <button onClick={() => confirmDeleteRequest(tx.id!, 'cash')} className="text-text-tertiary hover:text-red-400"><i className="fas fa-trash"></i></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- CUSTOMERS (NEW) --- */}
          {currentView === 'customers' && (
            <CustomerList
              customers={customers}
              onAdd={handleAddCustomer}
              onUpdate={handleUpdateCustomer}
              onDelete={handleDeleteCustomer}
              primaryColor={primaryColor}
            />
          )}

          {/* --- INVOICES (NEW) --- */}
          {currentView === 'invoices' && (
            <InvoiceList
              invoices={invoices}
              customers={customers}
              userId={user?.id || ''}
              location={location}
              onAdd={handleAddInvoice}
              onUpdate={handleUpdateInvoice}
              onDelete={handleDeleteInvoice}
              onRecordPayment={handleRecordPayment}
              primaryColor={primaryColor}
            />
          )}

          {/* --- DATA IMPORT (NEW) --- */}
          {currentView === 'import' && (
            <DataImport
              userId={user?.id || ''}
              onCustomersImported={handleImportCustomers}
              onInvoicesImported={handleImportInvoices}
              primaryColor={primaryColor}
            />
          )}

          {/* --- REPORTS (Placeholder) --- */}
          {currentView === 'reports' && (
            <div className="space-y-6">
              <div className="glass-panel rounded-2xl p-8 text-center">
                <i className="fas fa-chart-line text-5xl text-text-tertiary mb-4"></i>
                <h3 className="text-xl font-bold text-money-paper mb-2">Financial Reports</h3>
                <p className="text-text-secondary mb-6">Comprehensive P&L, Balance Sheet and GST reports coming in Phase 2</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  <div className="glass-panel rounded-xl p-4">
                    <i className="fas fa-file-invoice-dollar text-2xl text-money-gold mb-2"></i>
                    <p className="text-sm font-bold">Income Report</p>
                    <p className="text-xs text-text-secondary">By customer/month</p>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <i className="fas fa-calculator text-2xl text-money-green mb-2"></i>
                    <p className="text-sm font-bold">GST Summary</p>
                    <p className="text-xs text-text-secondary">GSTR-1 / GSTR-3B</p>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <i className="fas fa-balance-scale text-2xl text-text-tertiary mb-2"></i>
                    <p className="text-sm font-bold">Balance Sheet</p>
                    <p className="text-xs text-text-secondary">Assets vs Liabilities</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- SETTINGS (Existing + Enhanced) --- */}
          {currentView === 'settings' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Company Settings */}
              <div className="glass-panel rounded-2xl p-8">
                <h3 className="text-xl font-black text-money-gold uppercase tracking-widest font-serif mb-6 border-b border-[#85bb65]/20 pb-4">Company Information</h3>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <label className="text-text-tertiary text-xs uppercase">Company Name</label>
                    <p className="font-bold text-money-paper">{COMPANY_INFO.name}</p>
                  </div>
                  <div>
                    <label className="text-text-tertiary text-xs uppercase">GST Number</label>
                    <p className="font-bold text-money-green">{COMPANY_INFO.gstNumber}</p>
                  </div>
                  <div>
                    <label className="text-text-tertiary text-xs uppercase">Bank</label>
                    <p className="font-bold text-money-paper">Federal Bank</p>
                  </div>
                  <div>
                    <label className="text-text-tertiary text-xs uppercase">Total Clients</label>
                    <p className="font-bold text-money-paper">{customers.length}</p>
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="glass-panel rounded-2xl p-8">
                <h3 className="text-xl font-black text-money-gold uppercase tracking-widest font-serif mb-6 border-b border-[#85bb65]/20 pb-4">Expense Categories</h3>
                <CategoryManager categories={categories} onAdd={handleAddCategory} onDelete={handleDeleteCategory} />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- Modals --- */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={modalType === 'expense' ? (editingExpense ? 'Edit Expense' : 'New Expense') :
               modalType === 'cash' ? (editingTransaction ? 'Edit Cash Entry' : 'New Cash Entry') :
               modalType === 'invoice' ? (editingInvoice ? 'Edit Invoice' : 'New Invoice') : 'Add Client'}>
        {modalType === 'expense' && (
          <ExpenseForm expense={editingExpense} nextId={nextExpenseId} categories={categories} location={location}
            primaryColor={primaryColor} onSave={handleSaveExpense} onCancel={() => setIsModalOpen(false)} />
        )}
        {modalType === 'cash' && (
          <CashTransactionForm transaction={editingTransaction} nextId={nextCashId} categories={categories} location={location}
            primaryColor={primaryColor} onSave={handleSaveCashTransaction} onCancel={() => setIsModalOpen(false)} />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Delete">
        <div className="space-y-6">
          <p className="text-sm text-text-secondary">This action cannot be undone. Are you sure?</p>
          <div className="flex gap-4 justify-end">
            <button onClick={() => setDeleteId(null)} className="neo-btn px-6 py-3 rounded-xl text-xs font-bold text-text-secondary">Cancel</button>
            <button onClick={executeDelete} className="neo-btn px-6 py-3 rounded-xl text-xs font-bold text-red-500 border border-red-500/20">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;