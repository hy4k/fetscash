import { Routes, Route, Navigate } from 'react-router'
import { AccountProvider } from '@/lib/AccountContext'
import { AppShell } from '@/layouts/AppShell'
import Overview from '@/pages/Overview'
import Invoices from '@/pages/Invoices'
import BankLedger from '@/pages/BankLedger'
import FetsCash from '@/pages/FetsCash'
import Reports from '@/pages/Reports'
import Gst from '@/pages/Gst'
import Clients from '@/pages/Clients'
import Products from '@/pages/Products'
import SettingsPage from '@/pages/Settings'

export default function App() {
  return (
    <AccountProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Overview />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/ledger" element={<BankLedger />} />
          <Route path="/cash" element={<FetsCash />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/gst" element={<Gst />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* Managed from the Settings mini-dashboard */}
          <Route path="/clients" element={<Clients />} />
          <Route path="/products" element={<Products />} />
          {/* Legacy paths */}
          <Route path="/treasury" element={<Navigate to="/ledger" replace />} />
          <Route path="/transactions" element={<Navigate to="/ledger" replace />} />
          <Route path="/cashbook" element={<Navigate to="/cash" replace />} />
        </Route>
      </Routes>
    </AccountProvider>
  )
}
