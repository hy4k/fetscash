import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useInvoices, useExpenses, useCashTransactions } from '@/hooks';
import { StatsCard, RevenueChart, ExpensePieChart, QuickActions } from '@/components/dashboard';
import { LoadingPage } from '@/components/error';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency, formatMonthLabel } from '@/utils/formatters';
import { TrendingUp, FileText, CreditCard, Wallet } from 'lucide-react';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const navigate = useNavigate();

  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: expenses, isLoading: expensesLoading } = useExpenses();
  const { data: cashTxns, isLoading: cashLoading } = useCashTransactions();

  const isLoading = isAuthLoading || invoicesLoading || expensesLoading || cashLoading;

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return (
      <div className="page-enter flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-money-gold">Connection Required</h2>
          <p className="text-text-secondary">Please sign in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  const totalIncome = useMemo(() => {
    if (!invoices) return 0;
    return invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  }, [invoices]);

  const pendingInvoices = useMemo(() => {
    if (!invoices) return 0;
    return invoices.filter((inv) => inv.status === 'sent' || inv.status === 'overdue').length;
  }, [invoices]);

  const totalExpenses = useMemo(() => {
    if (!expenses) return 0;
    return expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [expenses]);

  const cashBalance = useMemo(() => {
    if (!cashTxns) return 0;
    return cashTxns.reduce((sum, txn) => sum + (txn.amount || 0), 0);
  }, [cashTxns]);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { monthIndex: d.getMonth(), year: d.getFullYear(), name: formatMonthLabel(d) };
    });

    return months.map((m) => {
      const income = (invoices || [])
        .filter((inv) => inv.status === 'paid')
        .filter((inv) => {
          const d = new Date(inv.date || inv.created_at);
          return d.getMonth() === m.monthIndex && d.getFullYear() === m.year;
        })
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      const expense = (expenses || [])
        .filter((exp) => {
          const d = new Date(exp.date || exp.created_at);
          return d.getMonth() === m.monthIndex && d.getFullYear() === m.year;
        })
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);

      return { name: m.name, income, expense };
    });
  }, [invoices, expenses]);

  const pieData = useMemo(() => {
    if (!expenses) return [];
    const categoryMap: Record<string, number> = {};
    expenses.forEach((exp) => {
      const cat = exp.category || 'Uncategorized';
      categoryMap[cat] = (categoryMap[cat] || 0) + (exp.amount || 0);
    });
    return Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [expenses]);

  return (
    <div className="page-enter space-y-8">
      <PageHeader title="Dashboard" subtitle="Overview of your business" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Income"
          value={formatCurrency(totalIncome, 'INR')}
          icon={TrendingUp}
          color="#85bb65"
          delay={0}
        />
        <StatsCard
          title="Pending Invoices"
          value={String(pendingInvoices)}
          icon={FileText}
          color="#d4af37"
          delay={0.1}
        />
        <StatsCard
          title="Total Expenses"
          value={formatCurrency(totalExpenses, 'INR')}
          icon={CreditCard}
          color="#ef4444"
          delay={0.2}
        />
        <StatsCard
          title="Cash Balance"
          value={formatCurrency(cashBalance, 'INR')}
          icon={Wallet}
          color="#3b82f6"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={chartData} />
        <ExpensePieChart data={pieData} />
      </div>

      <QuickActions
        actions={[
          { label: 'New Invoice', icon: FileText, onClick: () => navigate('/invoices/new') },
          { label: 'View Clients', icon: TrendingUp, onClick: () => navigate('/customers') },
          { label: 'Add Expense', icon: CreditCard, onClick: () => navigate('/expenses/new') },
          { label: 'Cash Book', icon: Wallet, onClick: () => navigate('/cash') },
        ]}
      />
    </div>
  );
}
