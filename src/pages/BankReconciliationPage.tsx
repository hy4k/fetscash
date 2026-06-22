import React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useInvoices, useExpenses, usePayments } from '@/hooks';
import { LoadingPage } from '@/components/error/LoadingPage';
import { BankReconciliationView } from '../../components/BankReconciliationView';

export default function BankReconciliationPage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: expenses, isLoading: expensesLoading } = useExpenses();
  const { data: payments, isLoading: paymentsLoading } = usePayments();

  if (isLoading || invoicesLoading || expensesLoading || paymentsLoading) return <LoadingPage />;
  if (!user) {
    return (
      <div className="page-enter flex items-center justify-center min-h-[60vh]">
        <div className="text-text-secondary text-center">
          <p>Connection required</p>
          <p className="text-xs text-text-tertiary mt-1">Please configure Supabase to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <BankReconciliationView
        userId={user.id}
        invoices={invoices || []}
        expenses={expenses || []}
        payments={payments || []}
      />
    </div>
  );
}
