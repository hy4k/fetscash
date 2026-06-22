import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import {
  LayoutDashboard, Receipt, Wallet, Users, FileText, BookOpen, Landmark, Calculator,
  DollarSign, Globe, Settings, ChevronLeft, ChevronRight, MapPin
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/expenses', icon: Receipt, label: 'Expenses' },
  { path: '/cash', icon: Wallet, label: 'Cash Book' },
  { path: '/customers', icon: Users, label: 'Clients' },
  { path: '/invoices', icon: FileText, label: 'Invoices' },
  { path: '/paybook', icon: BookOpen, label: 'Paybook' },
  { path: '/bank', icon: Landmark, label: 'Bank' },
  { path: '/gst', icon: Calculator, label: 'GST' },
  { path: '/currency', icon: DollarSign, label: 'Currency' },
  { path: '/remittance', icon: Globe, label: 'Remittance' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const location = useLocation();
  const { isSidebarOpen, toggleSidebar, location: currentLocation, setLocation } = useAppStore();

  const primaryColor = currentLocation === 'cochin' ? '#85bb65' : '#3e5c76';

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 bg-background border-r border-divider transition-all duration-300 flex flex-col ${
        isSidebarOpen ? 'w-72' : 'w-20'
      }`}
    >
      {/* Logo area */}
      <div className="px-6 py-5 border-b border-divider flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-money-gold/10 border border-money-gold/20 flex items-center justify-center shrink-0">
          <span className="text-money-gold font-bold text-lg">F</span>
        </div>
        {isSidebarOpen && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-black text-money-gold uppercase tracking-widest font-serif whitespace-nowrap">
              Fets Cash
            </h1>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Forum Testing</p>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="ml-auto text-text-tertiary hover:text-money-gold transition-colors"
        >
          {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                isActive
                  ? 'bg-money-gold/10 text-money-gold border border-money-gold/20'
                  : 'text-text-secondary hover:bg-white/[0.02] hover:text-money-gold'
              }`}
              title={!isSidebarOpen ? item.label : undefined}
            >
              <Icon size={18} style={{ color: isActive ? primaryColor : undefined }} />
              {isSidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Location toggle */}
      <div className="px-4 py-4 border-t border-divider">
        <div className={`flex items-center gap-2 ${isSidebarOpen ? '' : 'justify-center'}`}>
          <MapPin size={14} className="text-money-gold" />
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLocation('cochin')}
                className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${
                  currentLocation === 'cochin' ? 'bg-money-gold/10 text-money-gold' : 'text-text-tertiary'
                }`}
              >
                Cochin
              </button>
              <button
                onClick={() => setLocation('calicut')}
                className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${
                  currentLocation === 'calicut' ? 'bg-[#3e5c76]/20 text-[#3e5c76]' : 'text-text-tertiary'
                }`}
              >
                Calicut
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
