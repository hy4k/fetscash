import React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCustomers } from '@/hooks';
import { LoadingPage } from '@/components/error/LoadingPage';
import { ForeignRemittanceView } from '../../components/ForeignRemittanceView';

export default function ForeignRemittancePage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { data: customers, isLoading: customersLoading } = useCustomers();

  if (isLoading || customersLoading) return <LoadingPage />;
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
      <ForeignRemittanceView
        userId={user.id}
        customers={customers || []}
      />
    </div>
  );
}
