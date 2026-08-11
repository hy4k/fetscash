import { NavLink, Outlet } from 'react-router'
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Wallet,
  BarChart3,
  RefreshCw,
  Database,
  Building2,
  Package,
  Landmark,
  ChevronRight,
  CalendarDays,
} from 'lucide-react'
import { Toaster } from 'sonner'
import { useAccount } from '@/lib/AccountContext'
import { cn } from '@/lib/utils'
import type { PeriodKind } from '@/types'

/** Each menu button gets its own tinted icon chip (reference-style pills). */
const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true, chip: 'bg-emerald-100 text-emerald-700' },
  { to: '/clients', label: 'Clients', icon: Building2, chip: 'bg-sky-100 text-sky-700' },
  { to: '/invoices', label: 'Invoices', icon: FileText, chip: 'bg-amber-100 text-amber-700' },
  { to: '/products', label: 'Products', icon: Package, chip: 'bg-violet-100 text-violet-700' },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight, chip: 'bg-teal-100 text-teal-700' },
  { to: '/cashbook', label: 'Cashbook', icon: Wallet, chip: 'bg-orange-100 text-orange-700' },
  { to: '/reports', label: 'Reports', icon: BarChart3, chip: 'bg-rose-100 text-rose-700' },
  { to: '/gst', label: 'GST', icon: Landmark, chip: 'bg-[var(--f-gold-100)] text-[var(--f-gold-600)]' },
]

const PERIOD_OPTIONS: { value: PeriodKind; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: '3m', label: 'Last 3 months' },
  { value: 'custom', label: 'Custom range' },
]

function PeriodSelector() {
  const { period, setPeriod } = useAccount()
  const setKind = (kind: PeriodKind) => {
    setPeriod(kind === 'custom' ? { kind, start: period.start, end: period.end } : { kind })
  }
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--f-emerald-700)]" aria-hidden />
        <select
          aria-label="Viewing period"
          value={period.kind}
          onChange={(e) => setKind(e.target.value as PeriodKind)}
          className="h-10 cursor-pointer appearance-none rounded-2xl bg-white pl-9 pr-8 text-[13px] font-medium text-[var(--f-emerald-800)] shadow-[0_4px_12px_rgba(0,0,0,0.25)] outline-none hover:bg-white/90"
          style={{ backgroundImage: 'none' }}
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-[var(--f-emerald-700)]" aria-hidden />
      </div>
      {period.kind === 'custom' && (
        <>
          <input
            type="date"
            aria-label="From date"
            value={period.start ?? ''}
            onChange={(e) => setPeriod({ ...period, start: e.target.value })}
            className="h-10 rounded-2xl bg-white px-3 text-[13px] font-medium text-[var(--f-emerald-800)] shadow-[0_4px_12px_rgba(0,0,0,0.25)] outline-none"
          />
          <span className="text-white/70">→</span>
          <input
            type="date"
            aria-label="To date"
            value={period.end ?? ''}
            onChange={(e) => setPeriod({ ...period, end: e.target.value })}
            className="h-10 rounded-2xl bg-white px-3 text-[13px] font-medium text-[var(--f-emerald-800)] shadow-[0_4px_12px_rgba(0,0,0,0.25)] outline-none"
          />
        </>
      )}
    </div>
  )
}

export function AppShell() {
  const { loading, refresh, backend } = useAccount()

  return (
    <div className="flex min-h-screen bg-[#f4f8f6]">
      {/* Side navigation — deep emerald gradient, gold accents */}
      <aside
        className="fixed inset-y-0 left-0 z-[var(--z-header)] flex w-64 flex-col"
        style={{ background: 'var(--f-sidebar-bg)' }}
      >
        {/* Logo: gold pill badge + wordmark */}
        <div className="flex h-[72px] items-center gap-3 px-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[image:linear-gradient(135deg,var(--f-gold-400),var(--f-gold-600))] text-[17px] font-bold text-[var(--f-emerald-950)] shadow-[0_3px_8px_rgba(0,0,0,0.35)]">
            ₹
          </span>
          <div>
            <p className="text-[15px] font-semibold leading-[20px] text-white">FETS Accounts</p>
            <p className="text-[11px] leading-[14px] tracking-wide text-[var(--f-gold-400)]">FINANCE DASHBOARD</p>
          </div>
        </div>

        <div className="mx-5 border-t border-white/10" />

        {/* Menu — elevated pill buttons with tinted icon chips */}
        <nav role="navigation" aria-label="Main navigation" className="flex-1 space-y-2 px-4 py-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'k-press group flex h-11 items-center gap-3 rounded-2xl px-3 text-[14px] leading-5 transition-all duration-150 ease-out',
                  isActive
                    ? 'bg-white font-semibold text-[var(--f-emerald-900)] shadow-[0_6px_16px_rgba(0,0,0,0.35)]'
                    : 'bg-white/5 font-medium text-white/70 hover:bg-white/12 hover:text-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.25)]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl [&_svg]:h-4 [&_svg]:w-4',
                      item.chip
                    )}
                  >
                    <item.icon aria-hidden />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight
                    aria-hidden
                    className={cn(
                      'h-4 w-4 transition-opacity duration-150',
                      isActive ? 'text-[var(--f-gold-600)] opacity-100' : 'opacity-0 group-hover:opacity-60'
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-white/10 p-5">
          <p className="flex items-center gap-1.5 text-[12px] leading-[18px] text-white/50">
            <Database className="h-3.5 w-3.5" aria-hidden />
            {backend === 'supabase' ? 'Supabase backend connected' : 'Browser storage — Supabase offline'}
          </p>
          <p className="text-[12px] leading-[18px] text-white/40">
            Forum Testing &amp; Educational Services
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="ml-64 flex min-h-screen flex-1 flex-col">
        {/* Gradient page header — period selector + refresh */}
        <div
          className="sticky top-0 z-[var(--z-header)] flex h-[72px] items-center justify-between px-8 shadow-[0_2px_14px_rgba(4,56,44,0.28)]"
          style={{ background: 'var(--f-header-bg)' }}
        >
          <PeriodSelector />
          <button
            onClick={() => void refresh()}
            disabled={loading}
            aria-label="Refresh data"
            className="k-press flex h-10 items-center gap-2 rounded-2xl bg-white px-4 text-[13px] font-medium text-[var(--f-emerald-800)] shadow-[0_4px_12px_rgba(0,0,0,0.25)] hover:bg-white/90 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Focused content column */}
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>

      <Toaster position="bottom-right" toastOptions={{ style: { zIndex: 'var(--z-toast)' } }} />
    </div>
  )
}
