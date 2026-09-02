import { NavLink, Outlet } from 'react-router'
import {
  LayoutDashboard,
  Coins,
  Landmark,
  Wallet,
  BarChart3,
  RefreshCw,
  Database,
  ChevronRight,
  CalendarDays,
  Settings2,
} from 'lucide-react'
import { Toaster } from 'sonner'
import { useAccount } from '@/lib/AccountContext'
import { cn } from '@/lib/utils'
import type { PeriodKind } from '@/types'

/** Each menu button gets its own tinted icon chip (reference-style pills). */
const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true, chip: 'bg-emerald-100 text-emerald-700' },
  { to: '/invoices', label: 'Mint', icon: Coins, chip: 'bg-amber-100 text-amber-700' },
  { to: '/ledger', label: 'Bank Ledger', icon: Landmark, chip: 'bg-teal-100 text-teal-700' },
  { to: '/cash', label: 'FETS Cash', icon: Wallet, chip: 'bg-orange-100 text-orange-700' },
  { to: '/reports', label: 'Reports', icon: BarChart3, chip: 'bg-rose-100 text-rose-700' },
  { to: '/gst', label: 'GST', icon: Landmark, chip: 'bg-[var(--f-gold-100)] text-[var(--f-gold-600)]' },
  { to: '/settings', label: 'Settings', icon: Settings2, chip: 'bg-slate-200 text-slate-700' },
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
        {/* Logo: typographic wordmark — every letter a currency symbol.
            ₣=F(ranc) €=E(uro) ₸=T(enge) $=S(dollar) · ¢=C(ent) ₳=A(ustral) ₴=S(–hryvnia) H=H */}
        <div className="flex flex-col items-center justify-center px-5 pb-6 pt-7">
          <p
            className="whitespace-nowrap text-[32px] font-extrabold leading-[40px] tracking-[0.06em]"
            style={{ fontFamily: "'Segoe UI', 'Segoe UI Symbol', Arial, sans-serif" }}
          >
            <span className="text-[#85BB65]">₣</span>
            <span className="text-[#85BB65]">€</span>
            <span className="text-[#85BB65]">₸</span>
            <span className="text-[#85BB65]">$</span>
            <span className="mx-1.5 inline-block w-2" />
            <span className="text-[var(--f-gold-400)]">¢</span>
            <span className="text-[var(--f-gold-400)]">₳</span>
            <span className="text-[var(--f-gold-400)]">₴</span>
            <span className="text-[var(--f-gold-400)]">H</span>
          </p>
          <div className="mt-1.5 flex w-full items-center gap-2 px-1">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--f-gold-500)]/60" />
            <span className="h-1 w-1 rotate-45 bg-[var(--f-gold-400)]" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--f-gold-500)]/60" />
          </div>
          <p
            className="mt-2 bg-[image:linear-gradient(180deg,var(--f-gold-400),var(--f-gold-600))] bg-clip-text text-[13px] font-semibold uppercase text-transparent"
            style={{ fontFamily: "Georgia, 'Palatino Linotype', 'Times New Roman', serif", letterSpacing: '0.42em', marginRight: '-0.42em', fontVariant: 'small-caps' }}
          >
            Daylight Robbery
          </p>
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
