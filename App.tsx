import React, { useState, useEffect, useMemo, useRef } from 'react';
import { resolveWorkspaceUserId } from './utils/workspaceUser';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, Expense, LocationType, Category, FetsTransaction, Customer, Invoice, Payment, ProductRow } from './types';
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
import { PaybookView } from './components/PaybookView';
import { SettingsView } from './components/SettingsView';
import { StatsCard } from './components/StatsCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

// Main views for the application
type ViewType = 'dashboard' | 'expenses' | 'cash' | 'customers' | 'invoices' | 'import' | 'settings';

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
  /** Sub-screen when main view is Invoices: register vs monthly rollup. */
  const [invoiceScreenTab, setInvoiceScreenTab] = useState<'invoices' | 'monthly_revenue'>('invoices');
  const [loading, setLoading] = useState(false);

  // --- Data State ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [fetsTransactions, setFetsTransactions] = useState<FetsTransaction[]>([]);
  const [cashBalance, setCashBalance] = useState(0);

  // --- NEW: Customer & Invoice State ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [globalExpenseCount, setGlobalExpenseCount] = useState(0);
  const [globalCashCount, setGlobalCashCount] = useState(0);

  // --- UI State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'expense' | 'cash' | 'customer' | 'invoice' | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<FetsTransaction | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  // --- Delete Confirmation State ---
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'expense' | 'cash' | 'customer' | 'invoice'>('expense');

  // --- Filter State ---
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(true);
  const [expenseSection, setExpenseSection] = useState<'register' | 'paybook'>('paybook');

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

  const workspaceBootstrapDone = useRef(false);

  // No Supabase Auth: clear any persisted session, resolve workspace `user_id`, seed defaults once.
  useEffect(() => {
    const run = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      if (workspaceBootstrapDone.current) return;
      workspaceBootstrapDone.current = true;
      setLoading(true);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      const userId = await resolveWorkspaceUserId();
      if (!userId) {
        setUser(null);
        setLoading(false);
        return;
      }
      setUser({ id: userId });
      await initializeData(userId);
    };
    void run();
  }, []);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) return;
    fetchAllData(user.id, location);
  }, [user?.id, location]);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) return;
    const channel = supabase
      .channel('public-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchAllData(user.id, location);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, location]);

  useEffect(() => {
    const handleClickOutside = () => setActiveActionId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

    // Fetch customers, then ensure any invoice customer_id also appears (handles legacy or mixed user_id rows)
    const { data: custsRaw } = await supabase.from('customers').select('*').eq('user_id', userId).order('name');
    let mergedCusts: Customer[] = custsRaw || [];

    // Fetch invoices then join service_lines
    const { data: invs } = await supabase.from('invoices').select('*').eq('user_id', userId).order('invoice_date', { ascending: false });
    const invoiceCustIds = [
      ...new Set(
        (invs || [])
          .map((inv: Invoice) => inv.customer_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const haveCust = new Set(mergedCusts.map((c) => c.id));
    const missingCustIds = invoiceCustIds.filter((id) => !haveCust.has(id));
    if (missingCustIds.length > 0) {
      const { data: extraCust } = await supabase.from('customers').select('*').in('id', missingCustIds);
      mergedCusts = [...mergedCusts, ...(extraCust || [])].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );
    }
    setCustomers(mergedCusts);

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

    const { data: prodData, error: prodErr } = await supabase.from('products').select('*').order('name');
    if (prodErr) console.error('products fetch:', prodErr);
    setProducts((prodData as ProductRow[]) || []);

    const [geC, gcC, gxC, gzC] = await Promise.all([
      supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('location', 'cochin'),
      supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('location', 'calicut'),
      supabase.from('fets_cash_transactions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('location', 'cochin'),
      supabase.from('fets_cash_transactions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('location', 'calicut'),
    ]);
    setGlobalExpenseCount((geC.count || 0) + (gcC.count || 0));
    setGlobalCashCount((gxC.count || 0) + (gzC.count || 0));

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

  const handleAddProduct = async (row: Omit<ProductRow, 'id' | 'created_at'>) => {
    if (!user) return;
    const { error } = await supabase.from('products').insert(row as Record<string, unknown>);
    if (error) console.error('Error adding product:', error);
    fetchAllData(user.id, location);
  };

  const handleUpdateProduct = async (id: string, updates: Partial<ProductRow>) => {
    if (!user) return;
    const { error } = await supabase.from('products').update(updates).eq('id', id);
    if (error) console.error('Error updating product:', error);
    fetchAllData(user.id, location);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!user) return;
    await supabase.from('products').delete().eq('id', id);
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
    
    closeMainModal();
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
    
    closeMainModal();
    fetchAllData(user.id, location);
  };

  const closeMainModal = () => {
    setIsModalOpen(false);
    setModalType(null);
    setEditingExpense(null);
    setEditingTransaction(null);
    setEditingInvoice(null);
    setEditingCustomer(null);
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

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen w-full bg-background text-money-paper flex items-center justify-center p-6">
        <div className="max-w-lg w-full glass-panel rounded-2xl p-8 border border-red-500/30 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <i className="fas fa-plug"></i>
            </div>
            <h1 className="text-xl font-black text-red-400 uppercase tracking-widest font-serif">Connection required</h1>
          </div>
          <p className="text-sm text-text-secondary mb-5 leading-relaxed">
            The app cannot reach your backend until the environment is configured. Add your project URL and API key where this app reads
            its settings (usually a local <code className="text-money-green px-1.5 py-0.5 rounded bg-money-green/10">.env</code> file), then restart the dev or preview server.
          </p>
          <pre className="text-[11px] leading-relaxed bg-surface p-4 rounded-xl border border-divider text-money-green overflow-x-auto whitespace-pre-wrap font-mono shadow-inner">
            {`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here`}
          </pre>
          <p className="text-xs text-text-tertiary mt-4">
            Use the project base URL only (host ending in <code className="text-money-green bg-money-green/10 px-1 rounded">.supabase.co</code>), not the REST API path.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-money-paper">
      <Sidebar
        currentView={currentView}
        onChangeView={(v) => {
          const id = v as ViewType;
          if (id === 'invoices') setInvoiceScreenTab('invoices');
          setCurrentView(id);
        }}
        locationColor={primaryColor}
      />

      <div className="flex-1 flex flex-col h-full sm:ml-72 relative overflow-hidden">
        <header className="px-6 sm:px-8 py-5 flex justify-between items-center z-20 sticky top-0 bg-background/70 backdrop-blur-xl border-b border-divider">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-money-gold capitalize tracking-widest font-serif">
              {currentView === 'dashboard' ? 'Dashboard' :
               currentView === 'expenses' ? (expenseSection === 'paybook' ? 'Paybook' : 'Expense Register') :
               currentView === 'cash' ? 'Cash Book' :
               currentView === 'customers' ? 'Clients' :
               currentView === 'invoices'
                 ? invoiceScreenTab === 'monthly_revenue'
                   ? 'Invoices · Monthly revenue'
                   : 'Invoices'
               : currentView === 'import' ? 'Data Import' : 'Settings'}
            </h2>
            <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-[0.2em] mt-1">
              Forum Testing & Educational Services <span className="mx-1.5 opacity-40">•</span> {location === 'cochin' ? 'Cochin' : 'Calicut'} <span className="mx-1.5 opacity-40">•</span> GST {COMPANY_INFO.gstNumber}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">Total Income (FY)</p>
              <p className="text-sm font-extrabold text-money-green">${(totalIncome / 100000).toFixed(2)}L</p>
            </div>
            <div className="transform scale-[0.7] origin-right">
              <HoloToggle checked={location === 'cochin'} onChange={(c) => setLocation(c ? 'cochin' : 'calicut')} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-24 sm:pb-8 custom-scrollbar">

          {isSupabaseConfigured && !user && !loading && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
            >
              We couldn’t attach this session to your main operating account, so the dashboard, clients, and day-book may stay empty.
              Paybook can still be used. If this persists, your administrator should check account linking settings.
            </div>
          )}

          {/* --- DASHBOARD --- */}
          {currentView === 'dashboard' && (
            <div className="space-y-8 page-enter">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title="Total Income" value={`$${(totalIncome / 1000).toFixed(1)}k`} icon="fa-wallet" color="#85bb65" delay={0} />
                <StatsCard title="Pending Invoices" value={pendingInvoices.length.toString()} icon="fa-file-invoice" color="#d4af37" delay={0.05} />
                <StatsCard title="Total Expenses" value={`₹${totalSpend.toLocaleString('en-IN')}`} icon="fa-coins" color={primaryColor} delay={0.1} />
                <StatsCard title="Cash Balance" value={`₹${cashBalance.toLocaleString('en-IN')}`} icon="fa-university" color="#3e5c76" delay={0.15} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-[0.2em]">Income vs Expenses</h3>
                    <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-money-green"></span> Income</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span> Expense</span>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueChartData}>
                        <defs>
                          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#85bb65" stopOpacity={0.25} /><stop offset="95%" stopColor="#85bb65" stopOpacity={0} /></linearGradient>
                          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(133,187,101,0.06)" />
                        <XAxis dataKey="name" stroke="#4a6354" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis stroke="#4a6354" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f1a14', borderColor: 'rgba(133,187,101,0.2)', borderRadius: '12px', fontSize: 12 }} />
                        <Area type="monotone" dataKey="income" stroke="#85bb65" fill="url(#incomeGrad)" strokeWidth={2} />
                        <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-[0.2em] mb-6">Expense Breakdown</h3>
                  <div className="h-[300px]">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="45%"
                            outerRadius={85}
                            innerRadius={50}
                            dataKey="value"
                            nameKey="name"
                            paddingAngle={4}
                            stroke="none"
                          >
                            {pieData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={['#85bb65', '#d4af37', '#3e5c76', '#ef4444', '#a78bfa'][index % 5]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f1a14', borderColor: 'rgba(133,187,101,0.2)', borderRadius: '12px', fontSize: 12 }}
                            formatter={(value: number, name: string) => [`₹${value.toLocaleString('en-IN')}`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-text-tertiary gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-divider flex items-center justify-center">
                          <i className="fas fa-chart-pie text-2xl text-text-muted"></i>
                        </div>
                        <p className="text-sm">No expense data yet</p>
                      </div>
                    )}
                  </div>
                  {pieData.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {pieData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: ['#85bb65', '#d4af37', '#3e5c76', '#ef4444', '#a78bfa'][index % 5] }}></span>
                            <span className="text-text-secondary truncate max-w-[140px]">{entry.name}</span>
                          </div>
                          <span className="text-money-gold font-bold">₹{entry.value.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-panel rounded-2xl p-6 border border-money-gold/15">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-4 rounded-full bg-money-gold/60"></div>
                  <h3 className="text-xs font-bold text-money-gold uppercase tracking-[0.2em]">Quick Actions</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => { setEditingCustomer(null); setEditingInvoice(null); setModalType('invoice'); setIsModalOpen(true); }}
                    className="neo-btn px-5 py-3 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20 flex items-center gap-2 hover:border-money-gold/40">
                    <i className="fas fa-plus"></i> New Invoice
                  </button>
                  <button onClick={() => setCurrentView('customers')}
                    className="neo-btn px-5 py-3 rounded-xl text-xs font-bold text-text-secondary flex items-center gap-2 hover:text-money-green">
                    <i className="fas fa-users"></i> View Clients
                  </button>
                  <button onClick={() => setCurrentView('import')}
                    className="neo-btn px-5 py-3 rounded-xl text-xs font-bold text-text-secondary flex items-center gap-2 hover:text-money-green">
                    <i className="fas fa-file-import"></i> Import Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- EXPENSES --- */}
          {currentView === 'expenses' && (
            <div className="space-y-6 page-enter">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-[11px] text-text-tertiary max-w-xl sm:order-last leading-relaxed">
                  <strong className="text-money-green/90">Paybook</strong> is payroll, payslips, and sundry vouchers.{' '}
                  <strong className="text-text-secondary">Expense register</strong> is the branch day-book of posted expenses.
                </p>
                <div className="flex p-1 rounded-xl bg-surface border border-divider w-fit">
                  <button
                    type="button"
                    onClick={() => setExpenseSection('register')}
                    className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      expenseSection === 'register'
                        ? 'active text-money-gold bg-money-green/5 border border-money-green/15'
                        : 'text-text-tertiary hover:text-money-green'
                    }`}
                  >
                    <i className="fas fa-list-ul mr-2 opacity-80" />
                    Expense register
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseSection('paybook')}
                    className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      expenseSection === 'paybook'
                        ? 'active text-money-gold bg-money-green/5 border border-money-green/15'
                        : 'text-text-tertiary hover:text-money-green'
                    }`}
                  >
                    <i className="fas fa-book mr-2 opacity-80" />
                    Paybook
                  </button>
                </div>
              </div>

              {expenseSection === 'paybook' ? (
                <PaybookView location={location} primaryColor={primaryColor} />
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                      <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"></i>
                      <input type="text" placeholder="Search expenses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="neo-input w-full rounded-xl py-3 pl-11 text-sm" />
                    </div>
                    <button onClick={() => { setEditingExpense(null); setModalType('expense'); setIsModalOpen(true); }}
                      className="neo-btn px-5 py-3 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20 flex items-center justify-center gap-2 hover:border-money-gold/40">
                      <i className="fas fa-plus"></i> Add Expense
                    </button>
                  </div>

                  <div className="glass-panel rounded-2xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-surface-highlight/50 border-b border-divider">
                        <tr>
                          <th className="px-5 py-3.5 text-left text-[10px] font-black text-text-tertiary uppercase tracking-wider">Date</th>
                          <th className="px-5 py-3.5 text-left text-[10px] font-black text-text-tertiary uppercase tracking-wider">ID</th>
                          <th className="px-5 py-3.5 text-left text-[10px] font-black text-text-tertiary uppercase tracking-wider">Category</th>
                          <th className="px-5 py-3.5 text-left text-[10px] font-black text-text-tertiary uppercase tracking-wider">Description</th>
                          <th className="px-5 py-3.5 text-right text-[10px] font-black text-text-tertiary uppercase tracking-wider">Amount</th>
                          <th className="px-5 py-3.5 text-center text-[10px] font-black text-text-tertiary uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider">
                        {filteredExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-3.5 text-xs text-text-secondary">{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                            <td className="px-5 py-3.5 text-xs font-bold text-money-green">{exp.paid_by}</td>
                            <td className="px-5 py-3.5 text-xs"><span className="px-2 py-0.5 rounded-md bg-surface-elevated border border-divider text-[10px]">{exp.category}</span></td>
                            <td className="px-5 py-3.5 text-xs text-text-secondary truncate max-w-xs">{exp.description}</td>
                            <td className="px-5 py-3.5 text-right font-bold text-money-gold text-sm">₹{exp.amount.toLocaleString()}</td>
                            <td className="px-5 py-3.5 text-center">
                              <button onClick={() => { setEditingExpense(exp); setModalType('expense'); setIsModalOpen(true); }}
                                className="w-8 h-8 rounded-lg hover:bg-money-gold/5 text-text-tertiary hover:text-money-gold mr-1 transition-colors"><i className="fas fa-edit text-xs"></i></button>
                              <button onClick={() => confirmDeleteRequest(exp.id!, 'expense')} className="w-8 h-8 rounded-lg hover:bg-red-500/5 text-text-tertiary hover:text-red-400 transition-colors"><i className="fas fa-trash text-xs"></i></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredExpenses.length === 0 && (
                      <div className="text-center py-14 text-text-tertiary flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-divider flex items-center justify-center">
                          <i className="fas fa-receipt text-xl text-text-muted"></i>
                        </div>
                        <p className="text-sm">No expenses found</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* --- CASH --- */}
          {currentView === 'cash' && (
            <div className="space-y-6 page-enter">
              {/* Cash Balance Card */}
              <div className="glass-panel rounded-2xl p-6 border border-money-green/10 flex justify-between items-center relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0f2418 0%, #080f0c 100%)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-10 bg-money-green pointer-events-none"></div>
                <div className="relative z-10">
                  <p className="text-[10px] text-money-green/50 uppercase tracking-[0.2em] font-semibold mb-1">Current Cash Balance</p>
                  <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-sans tracking-tight">₹{cashBalance.toLocaleString('en-IN')}</h3>
                </div>
                <button onClick={() => openCashModal()} className="neo-btn px-5 py-3 rounded-xl text-xs font-bold text-money-gold relative z-10 hover:border-money-gold/30">
                  <i className="fas fa-plus mr-2"></i>New Transaction
                </button>
              </div>

              {/* Cash Transactions Table */}
              <div className="glass-panel rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-surface-highlight/50 border-b border-divider">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-[10px] font-black text-text-tertiary uppercase tracking-wider">Date</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-black text-text-tertiary uppercase tracking-wider">Ref ID</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-black text-text-tertiary uppercase tracking-wider">Category</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-black text-text-tertiary uppercase tracking-wider">Description</th>
                      <th className="px-5 py-3.5 text-right text-[10px] font-black text-text-tertiary uppercase tracking-wider">Amount</th>
                      <th className="px-5 py-3.5 text-center text-[10px] font-black text-text-tertiary uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5 text-xs text-text-secondary">{new Date(tx.date).toLocaleDateString('en-GB')}</td>
                        <td className="px-5 py-3.5 text-xs font-bold text-money-green">{tx.custom_id}</td>
                        <td className="px-5 py-3.5 text-xs"><span className="px-2 py-0.5 rounded-md bg-surface-elevated border border-divider text-[10px]">{tx.category}</span></td>
                        <td className="px-5 py-3.5 text-xs text-text-secondary">{tx.clean_description}</td>
                        <td className={`px-5 py-3.5 text-right font-bold text-sm ${tx.amount >= 0 ? 'text-money-green' : 'text-red-400'}`}>
                          {tx.amount >= 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button onClick={() => openCashModal(tx)} className="w-8 h-8 rounded-lg hover:bg-money-gold/5 text-text-tertiary hover:text-money-gold mr-1 transition-colors"><i className="fas fa-edit text-xs"></i></button>
                          <button onClick={() => confirmDeleteRequest(tx.id!, 'cash')} className="w-8 h-8 rounded-lg hover:bg-red-500/5 text-text-tertiary hover:text-red-400 transition-colors"><i className="fas fa-trash text-xs"></i></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTransactions.length === 0 && (
                  <div className="text-center py-14 text-text-tertiary flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-divider flex items-center justify-center">
                      <i className="fas fa-book text-xl text-text-muted"></i>
                    </div>
                    <p className="text-sm">No cash transactions yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- CUSTOMERS --- */}
          {currentView === 'customers' && (
            <div className="page-enter">
              <CustomerList
                customers={customers}
                onAdd={handleAddCustomer}
                onUpdate={handleUpdateCustomer}
                onDelete={handleDeleteCustomer}
                primaryColor={primaryColor}
              />
            </div>
          )}

          {/* --- INVOICES --- */}
          {currentView === 'invoices' && (
            <div className="page-enter">
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
                screenTab={invoiceScreenTab}
                onScreenTabChange={setInvoiceScreenTab}
              />
            </div>
          )}

          {/* --- DATA IMPORT --- */}
          {currentView === 'import' && (
            <div className="page-enter">
              <DataImport
                userId={user?.id || ''}
                onCustomersImported={handleImportCustomers}
                onInvoicesImported={handleImportInvoices}
                primaryColor={primaryColor}
              />
            </div>
          )}

          {/* --- SETTINGS --- */}
          {currentView === 'settings' && user && (
            <div className="page-enter">
              <SettingsView
              companyInfo={COMPANY_INFO}
              location={location}
              onLocationChange={setLocation}
              totalIncomePaid={totalIncome}
              invoicesCount={invoices.length}
              clientsCount={customers.length}
              expensesCountThisBranch={expenses.length}
              cashTxnsCountThisBranch={fetsTransactions.length}
              expensesCountAllBranches={globalExpenseCount}
              cashTxnsCountAllBranches={globalCashCount}
              products={products}
              categories={categories}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              primaryColor={primaryColor}
              onQuickNewInvoice={() => {
                setEditingInvoice(null);
                setModalType('invoice');
                setIsModalOpen(true);
              }}
              onQuickNewExpense={() => {
                setCurrentView('expenses');
                setExpenseSection('register');
                setEditingExpense(null);
                setModalType('expense');
                setIsModalOpen(true);
              }}
              onQuickAddClient={() => {
                setEditingCustomer(null);
                setModalType('customer');
                setIsModalOpen(true);
              }}
              onQuickCashBook={() => setCurrentView('cash')}
              onOpenMonthlyRevenue={() => {
                setInvoiceScreenTab('monthly_revenue');
                setCurrentView('invoices');
              }}
              onOpenClients={() => setCurrentView('customers')}
              onOpenImport={() => setCurrentView('import')}
            />
            </div>
          )}
        </main>
      </div>

      {/* --- Modals --- */}
      <Modal isOpen={isModalOpen} onClose={closeMainModal}
        title={modalType === 'expense' ? (editingExpense ? 'Edit Expense' : 'New Expense') :
               modalType === 'cash' ? (editingTransaction ? 'Edit Cash Entry' : 'New Cash Entry') :
               modalType === 'invoice' ? (editingInvoice ? 'Edit Invoice' : 'New Invoice') : 'Add Client'}>
        {modalType === 'expense' && (
          <ExpenseForm expense={editingExpense} nextId={nextExpenseId} categories={categories} location={location}
            primaryColor={primaryColor} onSave={handleSaveExpense} onCancel={closeMainModal} />
        )}
        {modalType === 'cash' && (
          <CashTransactionForm transaction={editingTransaction} nextId={nextCashId} categories={categories} location={location}
            primaryColor={primaryColor} onSave={handleSaveCashTransaction} onCancel={closeMainModal} />
        )}
        {modalType === 'invoice' && user && (
          <InvoiceForm
            invoice={editingInvoice}
            customers={customers}
            userId={user.id}
            location={location}
            primaryColor={primaryColor}
            onSave={async (data) => {
              if (editingInvoice) await handleUpdateInvoice(editingInvoice.id!, data);
              else await handleAddInvoice(data);
              closeMainModal();
            }}
            onCancel={closeMainModal}
          />
        )}
        {modalType === 'customer' && (
          <CustomerForm
            customer={editingCustomer}
            primaryColor={primaryColor}
            onSave={async (data) => {
              if (editingCustomer) await handleUpdateCustomer(editingCustomer.id!, data);
              else await handleAddCustomer(data);
              closeMainModal();
            }}
            onCancel={closeMainModal}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Delete">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <i className="fas fa-trash-alt text-red-400 text-sm"></i>
            </div>
            <div>
              <p className="text-sm text-text-secondary leading-relaxed">This action cannot be undone. The selected record will be permanently removed from the system.</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteId(null)} className="neo-btn px-5 py-2.5 rounded-xl text-xs font-bold text-text-secondary hover:text-money-paper">Cancel</button>
            <button onClick={executeDelete} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500/80 hover:bg-red-500 border border-red-500/30 transition-colors shadow-[0_0_20px_rgba(239,68,68,0.15)]">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;