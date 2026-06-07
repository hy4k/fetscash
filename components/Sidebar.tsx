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
        <div className="p-8 pb-6 flex flex-col items-center border-b border-divider bg-gradient-to-b from-surface-highlight to-transparent">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl neo-btn flex items-center justify-center border border-money-gold/20">
              <i className="fas fa-landmark text-2xl text-money-gold drop-shadow-md"></i>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-money-green/20 border border-money-green/30 animate-pulse-slow"></div>
          </div>
          <h1 className="text-2xl font-black tracking-[0.15em] text-center engraved-text leading-tight">
            FORUM<br/><span className="text-lg tracking-[0.2em]">TESTING</span>
          </h1>
          <p className="text-[10px] text-text-tertiary uppercase tracking-[0.25em] mt-2 font-medium">
            Educational Services
          </p>
          <div className="h-px w-20 bg-gradient-to-r from-transparent via-money-gold/40 to-transparent mt-4"></div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-5 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 group relative ${
                  isActive
                    ? 'active text-money-gold'
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
        <div className="p-5 border-t border-divider">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-highlight/60 border border-divider">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-money-green/20 to-money-dark/40 border border-money-green/20 flex items-center justify-center text-xs font-bold text-money-paper shadow-inner">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-money-paper uppercase tracking-wider truncate">Admin</p>
              <p className="text-[10px] text-text-tertiary truncate">Manager</p>
            </div>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-money-gold transition-colors">
              <i className="fas fa-cog text-xs"></i>
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
