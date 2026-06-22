import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { LoadingPage } from '@/components/error/LoadingPage';
import { useAuth } from '@/hooks/useAuth';
import { useDataSubscription } from '@/hooks/useDataSubscription';

// Lazy load pages for code splitting
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'));
const ExpensesPage = React.lazy(() => import('@/pages/ExpensesPage'));
const CashBookPage = React.lazy(() => import('@/pages/CashBookPage'));
const CustomersPage = React.lazy(() => import('@/pages/CustomersPage'));
const InvoicesPage = React.lazy(() => import('@/pages/InvoicesPage'));
const PaybookPage = React.lazy(() => import('@/pages/PaybookPage'));
const BankReconciliationPage = React.lazy(() => import('@/pages/BankReconciliationPage'));
const GSTReturnsPage = React.lazy(() => import('@/pages/GSTReturnsPage'));
const MultiCurrencyPage = React.lazy(() => import('@/pages/MultiCurrencyPage'));
const ForeignRemittancePage = React.lazy(() => import('@/pages/ForeignRemittancePage'));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'));

function AppContent() {
  const { data: user } = useAuth();
  useDataSubscription(user?.id || null);

  return (
    <AppLayout>
      <Suspense fallback={<LoadingPage />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/cash" element={<CashBookPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/paybook" element={<PaybookPage />} />
          <Route path="/bank" element={<BankReconciliationPage />} />
          <Route path="/gst" element={<GSTReturnsPage />} />
          <Route path="/currency" element={<MultiCurrencyPage />} />
          <Route path="/remittance" element={<ForeignRemittancePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <BrowserRouter>
          <AppContent />
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: '#0f1a14',
                border: '1px solid rgba(133,187,101,0.2)',
                color: '#e0e0e0',
              },
            }}
            closeButton
          />
        </BrowserRouter>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
