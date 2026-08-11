import { Routes, Route } from 'react-router'
import { AccountProvider } from '@/lib/AccountContext'
import { AppShell } from '@/layouts/AppShell'
import Overview from '@/pages/Overview'
import Transactions from '@/pages/Transactions'
import Invoices from '@/pages/Invoices'
import Cashbook from '@/pages/Cashbook'
import Reports from '@/pages/Reports'
import Gst from '@/pages/Gst'
import Clients from '@/pages/Clients'
import Products from '@/pages/Products'

export default function App() {
  return (
    <AccountProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Overview />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/products" element={<Products />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/cashbook" element={<Cashbook />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/gst" element={<Gst />} />
        </Route>
      </Routes>
    </AccountProvider>
  )
}
