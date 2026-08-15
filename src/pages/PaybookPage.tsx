import React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAppStore } from '@/stores/useAppStore';
import { LoadingPage } from '@/components/error/LoadingPage';
import { PaybookView } from '../../components/PaybookView';

export default function PaybookPage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useAppStore((s) => s.location);
  const primaryColor = location === 'cochin' ? '#85bb65' : '#3e5c76';

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
      <PaybookView location={location} primaryColor={primaryColor} />
    </div>
  );
}
