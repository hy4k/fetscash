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
    { id: 'reports', icon: 'fa-table', label: 'Reports' },
    { id: 'settings', icon: 'fa-sliders-h', label: 'Settings' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden sm:flex flex-col w-72 h-screen fixed left-0 top-0 bg-[#16231d] border-r border-[#85bb65]/10 z-40 shadow-[10px_0_30px_rgba(0,0,0,0.3)]">
        <div className="p-8 pb-8 flex flex-col items-center border-b border-[#85bb65]/10 bg-gradient-to-b from-[#1f3029] to-transparent">
             <div className="w-16 h-16 rounded-full neo-btn flex items-center justify-center mb-4 border border-money-gold/30">
                <i className="fas fa-landmark text-2xl text-money-gold drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]"></i>
             </div>
             <h1 className="text-2xl font-black tracking-widest text-center engraved-text leading-tight">
                FORUM<br/><span className="text-lg">TESTING</span>
             </h1>
             <p className="text-[10px] text-text-tertiary uppercase tracking-wider mt-2">
                Educational Services
             </p>
             <div className="h-1 w-24 bg-gradient-to-r from-transparent via-money-gold to-transparent mt-3 opacity-50"></div>
        </div>

        <nav className="flex-1 px-6 py-8 space-y-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 neo-btn group ${
                currentView === item.id 
                  ? 'active' 
                  : 'text-text-secondary hover:text-money-green'
              }`}
            >
              <i className={`fas ${item.icon} text-lg w-6 text-center transition-all duration-300 ${currentView === item.id ? 'scale-110 drop-shadow-[0_0_5px_rgba(133,187,101,0.5)]' : 'group-hover:scale-110'}`} style={currentView === item.id ? { color: locationColor } : {}}></i>
              <span>{item.label}</span>
              {currentView === item.id && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-money-gold shadow-[0_0_10px_#d4af37]"></div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-6">
            <div className="flex items-center gap-3 p-4 rounded-xl neo-input">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-money-green to-money-dark border border-money-gold/30 flex items-center justify-center text-xs font-serif font-bold text-white shadow-inner">
                    AD
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-money-paper uppercase tracking-wider truncate">Admin</p>
                    <p className="text-[10px] text-text-secondary truncate">Manager</p>
                </div>
                <button className="text-money-gold hover:text-white transition-colors"><i className="fas fa-cog"></i></button>
            </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#16231d]/95 backdrop-blur-xl border-t border-[#85bb65]/20 pb-safe z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        <div className="flex justify-around items-center p-3">
           {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all ${currentView === item.id ? 'text-money-gold' : 'text-text-tertiary'}`}
            >
              <i className={`fas ${item.icon} text-xl mb-1 transition-colors ${currentView === item.id ? 'drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]' : ''}`}></i>
              <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};