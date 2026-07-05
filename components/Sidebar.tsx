import type { LocationType } from '../types';

interface SidebarProps {
  currentView: 'employees' | 'expenses' | 'reconciliation';
  onChangeView: (view: string) => void;
  location: LocationType;
  onLocationChange: (location: LocationType) => void;
}

const NAV_ITEMS = [
  { id: 'employees', label: 'Employees', icon: 'fa-users' },
  { id: 'expenses', label: 'Expenses', icon: 'fa-receipt' },
  { id: 'reconciliation', label: 'Reconciliation', icon: 'fa-scale-balanced' },
] as const;

export default function Sidebar({ currentView, onChangeView, location, onLocationChange }: SidebarProps) {
  return (
    <aside className="w-60 h-full flex flex-col border-r border-divider bg-surface/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-divider">
        <h1 className="engraved-text text-xl font-bold tracking-wider">FETS</h1>
        <p className="text-[10px] text-text-tertiary tracking-[0.15em] mt-1">CASH MANAGEMENT</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              currentView === item.id
                ? 'text-money-green bg-money-green/10 border-l-2 border-money-green'
                : 'text-text-secondary hover:text-money-paper hover:bg-white/5'
            }`}
          >
            <i className={`fa-solid ${item.icon} w-5 text-center`} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Location Toggle */}
      <div className="px-4 py-4 border-t border-divider">
        <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">Location</p>
        <div className="flex bg-background rounded-lg p-1 border border-divider">
          {(['Cochin', 'Calicut'] as LocationType[]).map((loc) => (
            <button
              key={loc}
              onClick={() => onLocationChange(loc)}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                location === loc
                  ? 'bg-money-green/20 text-money-green'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
