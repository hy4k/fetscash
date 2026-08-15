import React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { LoadingPage } from '@/components/error/LoadingPage';
import { MultiCurrencyReportView } from '../../components/MultiCurrencyReportView';

export default function MultiCurrencyPage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return <LoadingPage />;
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
      <MultiCurrencyReportView userId={user.id} />
    </div>
  );
}
