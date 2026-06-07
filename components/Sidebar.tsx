import React from 'react';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: any) => void;
  locationColor: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, locationColor }) => {
  const menuItems = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
    { id: 'customers', icon: 'fa-users', label: 'Clients' },
    { id: 'invoices', icon: 'fa-file-invoice', label: 'Invoices' },
    { id: 'bank', icon: 'fa-university', label: 'Bank Recon' },
    { id: 'gst', icon: 'fa-percent', label: 'GST Returns' },
    { id: 'currency', icon: 'fa-globe', label: 'Multi-Currency' },
    { id: 'expenses', icon: 'fa-file-invoice-dollar', label: 'Expenses' },
    { id: 'cash', icon: 'fa-book', label: 'Cash Book' },
    { id: 'import', icon: 'fa-file-import', label: 'Import' },
    { id: 'settings', icon: 'fa-sliders-h', label: 'Settings' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden sm:flex flex-col w-72 h-screen fixed left-0 top-0 bg-surface border-r border-divider z-40">
        {/* Logo area */}
        <div className="p-7 pb-5 flex flex-col items-center border-b border-divider bg-gradient-to-b from-surface-highlight to-transparent">
          {/* Enhanced Logo */}
          <div className="relative mb-4">
            <div className="w-18 h-18 relative">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-2xl bg-money-gold/10 blur-md"></div>
              {/* Main logo badge */}
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center border border-money-gold/25 shadow-[0_0_20px_rgba(212,175,55,0.12)]"
                style={{ background: 'linear-gradient(145deg, #1a2e22 0%, #0f1a14 100%)' }}>
                <div className="flex flex-col items-center leading-none">
                  <span className="text-[10px] font-black text-money-gold tracking-[0.2em]" style={{ fontFamily: "'Cinzel Decorative', cursive" }}>FETS</span>
                  <span className="text-[8px] font-bold text-money-green tracking-[0.15em] mt-0.5">CASH</span>
                </div>
              </div>
              {/* Status dot */}
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-money-green/15 border border-money-green/30 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-money-green animate-pulse-slow"></div>
              </div>
            </div>
          </div>

          <h1 className="text-xl font-black tracking-[0.25em] text-center engraved-text leading-tight">
            FETS <span className="text-money-green">CASH</span>
          </h1>
          <p className="text-[9px] text-text-tertiary uppercase tracking-[0.3em] mt-1.5 font-medium">
            Forum Testing &amp; Educational Services
          </p>
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-money-gold/30 to-transparent mt-3"></div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 group relative ${
                  isActive
                    ? 'text-money-gold'
                    : 'text-text-secondary hover:text-money-green'
                }`}
                style={isActive ? { background: 'rgba(133,187,101,0.06)' } : {}}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'bg-money-green/10 shadow-[0_0_12px_rgba(133,187,101,0.15)]'
                    : 'bg-transparent group-hover:bg-money-green/5'
                }`}>
                  <i className={`fas ${item.icon} text-[15px] transition-all duration-300 ${
                    isActive ? 'text-money-green scale-110' : 'group-hover:scale-105'
                  }`}></i>
                </div>
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-money-gold shadow-[0_0_8px_rgba(212,175,55,0.5)]"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User pill */}
        <div className="p-4 border-t border-divider">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-highlight/60 border border-divider">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-money-green/20 to-money-dark/40 border border-money-green/20 flex items-center justify-center text-[10px] font-bold text-money-paper shadow-inner">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-money-paper uppercase tracking-wider truncate">Admin</p>
              <p className="text-[9px] text-text-tertiary truncate">Manager</p>
            </div>
            <button className="w-7 h-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-money-gold transition-colors">
              <i className="fas fa-cog text-[10px]"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-xl border-t border-divider pb-safe z-50">
        <div className="flex justify-around items-center p-2">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all min-w-[52px] ${
                  isActive
                    ? 'text-money-gold bg-money-gold/5'
                    : 'text-text-tertiary'
                }`}
              >
                <i className={`fas ${item.icon} text-lg mb-1 transition-all ${isActive ? 'drop-shadow-[0_0_5px_rgba(212,175,55,0.4)] scale-110' : ''}`}></i>
                <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
