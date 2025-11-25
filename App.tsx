import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { User, Expense, LocationType, Category, FetsTransaction } from './types';
import { CATEGORY_REPLENISHMENT } from './constants';
import HoloToggle from './components/HoloToggle';
import { ExpenseForm } from './components/ExpenseForm';
import { CashTransactionForm } from './components/CashTransactionForm';
import { CategoryManager } from './components/CategoryManager';
import { Modal } from './components/Modal';
import { Sidebar } from './components/Sidebar';
import { StatsCard } from './components/StatsCard';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    AreaChart, Area
} from 'recharts';

function App() {
    // --- Core State ---
    const [user, setUser] = useState<User | null>(null);
    const [location, setLocation] = useState<LocationType>('cochin');
    const [currentView, setCurrentView] = useState('dashboard');
    const [loading, setLoading] = useState(true);

    // --- Data State ---
    const [categories, setCategories] = useState<Category[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [fetsTransactions, setFetsTransactions] = useState<FetsTransaction[]>([]);
    const [cashBalance, setCashBalance] = useState(0);

    // --- UI State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'expense' | 'cash' | null>(null);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<FetsTransaction | null>(null);
    const [activeActionId, setActiveActionId] = useState<string | null>(null);

    // --- Delete Confirmation State ---
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteType, setDeleteType] = useState<'expense' | 'cash'>('expense');

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

    // --- Initialization ---
    useEffect(() => {
        const handleAuth = async () => {
            const DEMO_EMAIL = 'user@fets-finance.com';
            const DEMO_PASSWORD = 'fets-finance-password';
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
                await initializeCategories(session.user.id);
                fetchData(session.user.id, location);
            } else {
                setLoading(false);
            }
        };

        handleAuth();

        const channel = supabase.channel('public-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => {
                if (user) fetchData(user.id, location);
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

    const initializeCategories = async (userId: string) => {
        const { data } = await supabase.from('categories').select('id').eq('user_id', userId);
        if (data && data.length === 0) {
            const defaults = [CATEGORY_REPLENISHMENT, 'Office Supplies', 'Travel', 'Food & Beverage', 'Utilities', 'Maintenance', 'Salaries', 'Rent', 'Marketing'];
            await supabase.from('categories').insert(defaults.map(name => ({ user_id: userId, name })));
        }
    };

    const fetchData = async (userId: string, loc: LocationType) => {
        setLoading(true);
        const { data: cats } = await supabase.from('categories').select('*').eq('user_id', userId).order('name');
        setCategories(cats || []);

        const { data: exps } = await supabase.from('expenses').select('*').eq('user_id', userId).eq('location', loc).order('date', { ascending: false });
        setExpenses(exps || []);

        const { data: txs } = await supabase.from('fets_cash_transactions').select('*').eq('user_id', userId).eq('location', loc).order('date', { ascending: false });

        // Parse description to extract packed ID and Category
        const parsedTxs = (txs || []).map(tx => {
            const parts = tx.description.split(' ||| ');
            if (parts.length >= 3) {
                return {
                    ...tx,
                    custom_id: parts[0],
                    category: parts[1],
                    clean_description: parts.slice(2).join(' ||| ') // Join back in case description had separator
                };
            }
            return { ...tx, clean_description: tx.description, custom_id: 'N/A', category: 'Uncategorized' };
        });

        setFetsTransactions(parsedTxs);

        // Calculate Balance Client-Side
        const calculatedBalance = parsedTxs.reduce((sum, tx) => sum + tx.amount, 0);
        setCashBalance(calculatedBalance);
        setLoading(false);
    };

    // --- Handlers ---
    const handleSaveExpense = async (expData: Partial<Expense>) => {
        if (!user) return;
        const payload = { ...expData, user_id: user.id };

        // Check if category is Replenishment
        const isReplenishment = payload.category === CATEGORY_REPLENISHMENT;

        let result;
        if (editingExpense?.id) {
            result = await supabase.from('expenses').update(payload).eq('id', editingExpense.id).select().single();

            // Handle Replenishment Sync on Edit
            if (!result.error && result.data) {
                const savedExp = result.data;
                // If it IS replenishment now
                if (isReplenishment) {
                    // Upsert cash transaction
                    const { data: existingTx } = await supabase.from('fets_cash_transactions').select('id').eq('source_expense_id', savedExp.id).maybeSingle();

                    const cashPayload = {
                        user_id: user.id,
                        location: savedExp.location,
                        date: savedExp.date,
                        amount: savedExp.amount, // Positive amount for replenishment
                        description: `${savedExp.paid_by} ||| ${CATEGORY_REPLENISHMENT} ||| Replenished from Expense Register`,
                        type: 'replenishment',
                        source_expense_id: savedExp.id
                    };

                    if (existingTx) {
                        await supabase.from('fets_cash_transactions').update(cashPayload).eq('id', existingTx.id);
                    } else {
                        await supabase.from('fets_cash_transactions').insert(cashPayload);
                    }
                } else {
                    // If it was replenishment but changed to something else, remove from cash book
                    await supabase.from('fets_cash_transactions').delete().eq('source_expense_id', savedExp.id);
                }
            }
        } else {
            result = await supabase.from('expenses').insert(payload).select().single();

            // Handle Replenishment Sync on Create
            if (!result.error && result.data && isReplenishment) {
                const savedExp = result.data;
                await supabase.from('fets_cash_transactions').insert({
                    user_id: user.id,
                    location: savedExp.location,
                    date: savedExp.date,
                    amount: savedExp.amount,
                    description: `${savedExp.paid_by} ||| ${CATEGORY_REPLENISHMENT} ||| Replenished from Expense Register`,
                    type: 'replenishment',
                    source_expense_id: savedExp.id
                });
            }
        }

        if (result.error) return console.error(result.error);
        setIsModalOpen(false);
        fetchData(user.id, location);
    };

    const handleSaveCashTransaction = async (txData: Partial<FetsTransaction>) => {
        if (!user) return;
        const payload = { ...txData, user_id: user.id };

        let result;
        if (editingTransaction?.id) {
            result = await supabase.from('fets_cash_transactions').update(payload).eq('id', editingTransaction.id).select();
        } else {
            result = await supabase.from('fets_cash_transactions').insert(payload).select();
        }

        if (result.error) console.error(result.error);
        setIsModalOpen(false);
        fetchData(user.id, location);
    };

    const confirmDeleteRequest = (id: string, type: 'expense' | 'cash') => {
        setDeleteId(id);
        setDeleteType(type);
        setActiveActionId(null);
    };

    const executeDelete = async () => {
        if (!deleteId || !user) return;

        if (deleteType === 'expense') {
            const { data: expense } = await supabase.from('expenses').select('*').eq('id', deleteId).single();
            if (expense) {
                // If deleting an expense that was a replenishment, clean up cash book
                await supabase.from('fets_cash_transactions').delete().eq('source_expense_id', deleteId);
            }
            await supabase.from('expenses').delete().eq('id', deleteId);
        } else {
            await supabase.from('fets_cash_transactions').delete().eq('id', deleteId);
        }

        setDeleteId(null);
        fetchData(user.id, location);
    };

    const handleAddCategory = async (name: string) => {
        if (!user) return;
        await supabase.from('categories').insert({ user_id: user.id, name });
        fetchData(user.id, location);
    };

    const handleDeleteCategory = async (id: number) => {
        await supabase.from('categories').delete().eq('id', id);
        fetchData(user.id, location);
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

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            const matchesSearch = e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.paid_by?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.amount.toString().includes(searchQuery);
            const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
            const matchesDateStart = !dateRange.start || e.date >= dateRange.start;
            const matchesDateEnd = !dateRange.end || e.date <= dateRange.end;
            return matchesSearch && matchesCategory && matchesDateStart && matchesDateEnd;
        });
    }, [expenses, categoryFilter, searchQuery, dateRange]);

    const filteredTransactions = useMemo(() => {
        return fetsTransactions.filter(tx => {
            const desc = tx.clean_description || tx.description;
            const id = tx.custom_id || '';
            const matchesSearch = desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tx.amount.toString().includes(searchQuery);
            // Removed Type Filter Logic
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
        return Object.entries(agg)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [expenses]);

    if (loading && !user) return <div className="h-screen w-full flex items-center justify-center bg-background text-money-green font-serif tracking-widest text-xl animate-pulse">AUTHENTICATING...</div>;

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden text-money-paper">
            <Sidebar
                currentView={currentView}
                onChangeView={setCurrentView}
                locationColor={primaryColor}
            />

            <div className="flex-1 flex flex-col h-full sm:ml-72 relative overflow-hidden">
                <header className="px-8 py-6 flex justify-between items-center z-20 sticky top-0 bg-[#0c1410]/80 backdrop-blur-md border-b border-[#85bb65]/10">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-black text-money-gold capitalize tracking-widest font-serif drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                            {currentView === 'expenses' ? 'Expense Register' :
                                currentView === 'cash' ? 'Cash Book' :
                                    currentView === 'reports' ? 'Reports' :
                                        currentView === 'settings' ? 'Settings' : 'Dashboard'}
                        </h2>
                        <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-[0.2em] mt-1">
                            {location === 'cochin' ? 'Cochin' : 'Calicut'} Branch • <span className="text-money-green">Active</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="transform scale-[0.65] origin-right -mr-4 sm:mr-0">
                            <HoloToggle checked={location === 'cochin'} onChange={(c) => setLocation(c ? 'cochin' : 'calicut')} />
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-24 sm:pb-8 custom-scrollbar">

                    {/* --- DASHBOARD --- */}
                    {currentView === 'dashboard' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <StatsCard
                                    title="Total Expenses"
                                    value={`₹${totalSpend.toLocaleString('en-IN')}`}
                                    icon="fa-coins"
                                    color={primaryColor}
                                    delay={0}
                                />
                                <StatsCard
                                    title="Cash Balance"
                                    value={`₹${cashBalance.toLocaleString('en-IN')}`}
                                    icon="fa-university"
                                    color={location === 'cochin' ? '#85bb65' : '#3e5c76'}
                                    delay={0.1}
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 glass-panel rounded-2xl p-6 relative">
                                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-6">Expense Trend</h3>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="colorSplit" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(133,187,101,0.1)" vertical={false} />
                                                <XAxis dataKey="name" stroke="#546e61" tick={{ fontSize: 10, fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#546e61" tick={{ fontSize: 10, fontWeight: 'bold' }} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                                                <Tooltip contentStyle={{ backgroundColor: '#16231d', borderColor: '#85bb65', borderRadius: '4px' }} itemStyle={{ color: '#e8f5e9', fontFamily: 'serif' }} />
                                                <Area type="monotone" dataKey="value" stroke={primaryColor} strokeWidth={2} fill="url(#colorSplit)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="glass-panel rounded-2xl p-6 flex flex-col">
                                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-6">Top Categories</h3>
                                    <div className="space-y-4">
                                        {pieData.map((d, i) => (
                                            <div key={d.name} className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-money-paper">{d.name}</span>
                                                <span className="text-xs font-serif text-money-gold">₹{d.value.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- EXPENSES --- */}
                    {currentView === 'expenses' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="glass-panel rounded-2xl p-5 border border-[#85bb65]/10">
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="relative flex-1">
                                            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"></i>
                                            <input
                                                type="text"
                                                placeholder="Search description, ID, or amount..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="neo-input w-full rounded-xl py-3 pl-11 pr-4 text-sm focus:border-money-gold/50 transition-all placeholder-text-tertiary font-medium"
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowFilters(!showFilters)}
                                                className={`neo-btn w-12 h-full rounded-xl flex items-center justify-center transition-all ${showFilters ? 'text-money-gold shadow-inner' : 'text-text-secondary'}`}
                                                title="Toggle Filters"
                                            >
                                                <i className="fas fa-filter"></i>
                                            </button>
                                            <button
                                                onClick={() => { setEditingExpense(null); setModalType('expense'); setIsModalOpen(true); }}
                                                className="neo-btn text-money-gold px-6 py-3 rounded-xl font-bold border border-money-gold/20 hover:border-money-gold/50 transition-all active:scale-95 flex items-center gap-2 text-xs uppercase tracking-wider whitespace-nowrap"
                                            >
                                                <i className="fas fa-plus"></i> <span className="hidden sm:inline">Add Expense</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-300 ease-in-out overflow-hidden ${showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="relative">
                                            <label className="block text-[9px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Category</label>
                                            <select
                                                value={categoryFilter}
                                                onChange={(e) => setCategoryFilter(e.target.value)}
                                                className="neo-input w-full appearance-none rounded-xl px-4 py-2.5 text-xs font-bold text-text-secondary cursor-pointer focus:text-white"
                                            >
                                                <option value="all">All Categories</option>
                                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                            <i className="fas fa-chevron-down absolute right-3 bottom-3 text-text-tertiary pointer-events-none text-[10px]"></i>
                                        </div>

                                        <div>
                                            <label className="block text-[9px] font-bold text-text-tertiary uppercase tracking-wider mb-1">From Date</label>
                                            <input
                                                type="date"
                                                value={dateRange.start}
                                                onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
                                                className="neo-input w-full rounded-xl px-3 py-2.5 text-xs font-bold text-text-secondary"
                                            />
                                        </div>

                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1">
                                                <label className="block text-[9px] font-bold text-text-tertiary uppercase tracking-wider mb-1">To Date</label>
                                                <input
                                                    type="date"
                                                    value={dateRange.end}
                                                    onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
                                                    className="neo-input w-full rounded-xl px-3 py-2.5 text-xs font-bold text-text-secondary"
                                                />
                                            </div>
                                            <button onClick={resetFilters} className="neo-btn h-[38px] w-[38px] rounded-xl flex items-center justify-center text-text-tertiary hover:text-red-400">
                                                <i className="fas fa-undo"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel rounded-2xl overflow-hidden min-h-[400px]">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[#0c1410]/50 border-b border-[#85bb65]/20">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Date</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Ref No.</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Category</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] w-1/3">Description</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Amount</th>
                                                <th className="px-6 py-4 text-center text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#85bb65]/5">
                                            {filteredExpenses.map((exp) => (
                                                <tr key={exp.id} className="group hover:bg-[#85bb65]/5 transition-colors">
                                                    <td className="px-6 py-4 text-xs font-mono text-text-secondary">{new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}</td>
                                                    <td className="px-6 py-4 text-xs font-bold text-money-green">{exp.paid_by}</td>
                                                    <td className="px-6 py-4 text-xs font-bold text-money-paper">{exp.category}</td>
                                                    <td className="px-6 py-4 text-xs text-text-tertiary truncate max-w-xs" title={exp.description}>{exp.description}</td>
                                                    <td className="px-6 py-4 text-right font-serif font-bold text-money-gold tracking-wide text-sm">₹{exp.amount.toLocaleString('en-IN')}</td>
                                                    <td className="px-6 py-4 text-center relative">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setActiveActionId(activeActionId === exp.id ? null : exp.id!); }}
                                                            className="text-text-tertiary hover:text-white p-2 rounded-full hover:bg-white/10"
                                                        >
                                                            <i className="fas fa-ellipsis-v"></i>
                                                        </button>
                                                        {activeActionId === exp.id && (
                                                            <div className="absolute right-8 top-8 w-32 bg-[#16231d] border border-[#85bb65]/20 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in flex flex-col">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setActiveActionId(null); setEditingExpense(exp); setModalType('expense'); setIsModalOpen(true); }}
                                                                    className="px-4 py-3 text-left text-xs font-bold text-text-secondary hover:bg-white/5 hover:text-white"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); confirmDeleteRequest(exp.id!, 'expense'); }}
                                                                    className="px-4 py-3 text-left text-xs font-bold text-red-500 hover:bg-red-500/10"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- CASH --- */}
                    {currentView === 'cash' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="relative w-full rounded-2xl p-6 sm:p-10 flex flex-col sm:flex-row justify-between items-center overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.6)] border border-white/10"
                                style={{
                                    background: location === 'cochin' ? '#1b3826' : '#1b2c38',
                                    backgroundImage: `url("https://www.transparenttextures.com/patterns/black-scales.png")`
                                }}>
                                <div className="relative z-10 text-center sm:text-left">
                                    <p className="text-money-green/60 text-[10px] font-black tracking-[0.4em] uppercase mb-2">Cash on Hand</p>
                                    <h2 className="text-4xl sm:text-6xl font-black text-white font-serif tracking-tight">₹{cashBalance.toLocaleString('en-IN')}</h2>
                                </div>
                                <div className="relative z-10 mt-6 sm:mt-0">
                                    <button onClick={() => openCashModal()} className="neo-btn px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:text-money-green">
                                        <i className="fas fa-plus"></i> New Transaction
                                    </button>
                                </div>
                            </div>

                            <div className="glass-panel rounded-2xl p-5 border border-[#85bb65]/10">
                                <div className="flex gap-4">
                                    <div className="relative flex-1">
                                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"></i>
                                        <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="neo-input w-full rounded-xl py-3 pl-11 text-sm" />
                                    </div>
                                    <div className="flex-1 max-w-[200px] flex items-end">
                                        <input
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
                                            className="neo-input w-full rounded-xl px-3 py-3 text-xs font-bold text-text-secondary"
                                            placeholder="From Date"
                                        />
                                    </div>
                                    <div className="flex-1 max-w-[200px] flex items-end">
                                        <input
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
                                            className="neo-input w-full rounded-xl px-3 py-3 text-xs font-bold text-text-secondary"
                                            placeholder="To Date"
                                        />
                                    </div>
                                    <button onClick={resetFilters} className="neo-btn w-12 rounded-xl flex items-center justify-center text-text-tertiary hover:text-red-400">
                                        <i className="fas fa-undo"></i>
                                    </button>
                                </div>
                            </div>

                            <div className="glass-panel rounded-2xl overflow-hidden min-h-[400px]">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[#0c1410]/50 border-b border-[#85bb65]/20">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Date</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Ref No.</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Type</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Category</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] w-1/3">Description</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Amount</th>
                                                <th className="px-6 py-4 text-center text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#85bb65]/5">
                                            {filteredTransactions.map((tx) => (
                                                <tr key={tx.id} className="hover:bg-[#85bb65]/5">
                                                    <td className="px-6 py-4 text-xs font-mono text-text-secondary">{new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}</td>
                                                    <td className="px-6 py-4 text-xs font-bold text-money-green">{tx.custom_id}</td>
                                                    <td className="px-6 py-4 text-xs font-bold">
                                                        {tx.amount >= 0 ?
                                                            <span className="text-money-green bg-money-green/10 px-2 py-1 rounded">Dr</span> :
                                                            <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded">Cr</span>
                                                        }
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold text-money-paper">{tx.category}</td>
                                                    <td className="px-6 py-4 text-xs text-text-tertiary truncate max-w-xs">{tx.clean_description}</td>
                                                    <td className={`px-6 py-4 text-right font-serif font-bold text-sm ${tx.amount >= 0 ? 'text-money-green' : 'text-red-400'}`}>{tx.amount >= 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString('en-IN')}</td>
                                                    <td className="px-6 py-4 text-center relative">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setActiveActionId(activeActionId === tx.id ? null : tx.id!); }}
                                                            className="text-text-tertiary hover:text-white p-2 rounded-full hover:bg-white/10"
                                                        >
                                                            <i className="fas fa-ellipsis-v"></i>
                                                        </button>
                                                        {activeActionId === tx.id && (
                                                            <div className="absolute right-8 top-8 w-32 bg-[#16231d] border border-[#85bb65]/20 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in flex flex-col">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setActiveActionId(null); openCashModal(tx); }}
                                                                    className="px-4 py-3 text-left text-xs font-bold text-text-secondary hover:bg-white/5 hover:text-white"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); confirmDeleteRequest(tx.id!, 'cash'); }}
                                                                    className="px-4 py-3 text-left text-xs font-bold text-red-500 hover:bg-red-500/10"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- REPORTS --- */}
                    {currentView === 'reports' && (
                        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
                                <h3 className="font-bold text-text-secondary mb-6 text-xs uppercase tracking-widest">Expense Distribution</h3>
                                <div className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={pieData} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(133,187,101,0.1)" horizontal={false} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" stroke="#8ba696" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                            <Tooltip cursor={{ fill: 'rgba(133,187,101,0.05)' }} contentStyle={{ backgroundColor: '#16231d', borderColor: '#85bb65' }} />
                                            <Bar dataKey="value" fill={primaryColor} radius={[0, 4, 4, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="glass-panel rounded-2xl p-6 flex flex-col justify-center items-center text-center">
                                <i className="fas fa-file-contract text-4xl text-money-gold mb-4"></i>
                                <h3 className="text-lg font-black text-money-paper uppercase tracking-widest font-serif">Export Data</h3>
                                <div className="mt-8 w-full space-y-4">
                                    <button className="w-full neo-btn py-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:text-money-green">
                                        <i className="fas fa-file-csv"></i> Export CSV
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- SETTINGS --- */}
                    {currentView === 'settings' && (
                        <div className="animate-fade-in max-w-4xl mx-auto">
                            <div className="glass-panel rounded-2xl p-8">
                                <h3 className="text-xl font-black text-money-gold uppercase tracking-widest font-serif mb-8 border-b border-[#85bb65]/20 pb-4">Category Management</h3>
                                <CategoryManager
                                    categories={categories}
                                    onAdd={handleAddCategory}
                                    onDelete={handleDeleteCategory}
                                />
                            </div>
                        </div>
                    )}

                </main>
            </div>

            {/* --- Modals --- */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalType === 'expense' ? (editingExpense ? 'Modify Expense' : 'New Expense') : (editingTransaction ? 'Modify Cash Entry' : 'New Cash Entry')}
            >
                {modalType === 'expense' && (
                    <ExpenseForm
                        expense={editingExpense}
                        nextId={nextExpenseId}
                        categories={categories}
                        location={location}
                        primaryColor={primaryColor}
                        onSave={handleSaveExpense}
                        onCancel={() => setIsModalOpen(false)}
                    />
                )}
                {modalType === 'cash' && (
                    <CashTransactionForm
                        transaction={editingTransaction}
                        nextId={nextCashId}
                        categories={categories}
                        location={location}
                        primaryColor={primaryColor}
                        onSave={handleSaveCashTransaction}
                        onCancel={() => setIsModalOpen(false)}
                    />
                )}
            </Modal>

            {/* --- Delete Confirmation Modal --- */}
            <Modal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                title="Authorize Deletion"
            >
                <div className="space-y-6">
                    <p className="text-sm font-medium text-text-secondary leading-relaxed">
                        You are about to permanently remove this record from the ledger. This action cannot be reversed.
                    </p>
                    <div className="flex gap-4 justify-end pt-4 border-t border-[#85bb65]/10">
                        <button
                            onClick={() => setDeleteId(null)}
                            className="neo-btn px-6 py-3 rounded-xl text-xs font-bold text-text-secondary hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={executeDelete}
                            className="neo-btn px-6 py-3 rounded-xl text-xs font-bold text-red-500 border border-red-500/20 hover:bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        >
                            Confirm Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default App;