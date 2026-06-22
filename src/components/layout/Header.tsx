import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { COMPANY_INFO } from '@/constants';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/expenses': 'Expense Register',
  '/cash': 'Cash Book',
  '/customers': 'Clients',
  '/invoices': 'Invoices',
  '/paybook': 'Paybook',
  '/bank': 'Bank Reconciliation',
  '/gst': 'GST Returns',
  '/currency': 'Multi-Currency Report',
  '/remittance': 'Foreign Remittance',
  '/settings': 'Settings',
};

export function Header() {
  const location = useLocation();
  const currentLocation = useAppStore((s) => s.location);
  const title = pageTitles[location.pathname] || 'Dashboard';
  const primaryColor = currentLocation === 'cochin' ? '#85bb65' : '#3e5c76';

  return (
    <header className="px-6 sm:px-8 py-5 flex justify-between items-center z-20 sticky top-0 bg-background/70 backdrop-blur-xl border-b border-divider">
      <div className="flex flex-col">
        <h2 className="text-2xl font-black text-money-gold capitalize tracking-widest font-serif">
          {title}
        </h2>
        <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-[0.2em] mt-1">
          {COMPANY_INFO.name} <span className="mx-1.5 opacity-40">•</span> {currentLocation === 'cochin' ? 'Cochin' : 'Calicut'} <span className="mx-1.5 opacity-40">•</span> GST {COMPANY_INFO.gstNumber}
        </p>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right hidden sm:block">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">Branch</p>
          <p className="text-sm font-extrabold" style={{ color: primaryColor }}>
            {currentLocation === 'cochin' ? 'Cochin' : 'Calicut'}
          </p>
        </div>
      </div>
    </header>
  );
}
