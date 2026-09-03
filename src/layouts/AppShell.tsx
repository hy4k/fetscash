import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { RefreshCw } from 'lucide-react'
import { Toaster } from 'sonner'
import { useAccount } from '@/lib/AccountContext'
import { useSettings } from '@/lib/settings'
import { useReimbursements } from '@/lib/reimburse'
import { formatINR } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { PeriodKind } from '@/types'

const NAV = [
  { to: '/', label: 'Daybook', end: true },
  { to: '/invoices', label: 'Mint' },
  { to: '/ledger', label: 'Vault' },
  { to: '/cash', label: 'FETS Cash' },
  { to: '/recurring', label: 'Recurring' },
  { to: '/reimburse', label: 'Reimburse' },
  { to: '/reports', label: 'Reports' },
  { to: '/gst', label: 'GST' },
  { to: '/settings', label: 'Settings' },
]

const PERIODS: { value: PeriodKind; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: '3m', label: '3 months' },
  { value: 'all', label: 'All time' },
]

/** ₣€₸$ ¢₳₴H — every letter a currency glyph, mono wordmark. */
export function Wordmark({ dark, size = 25 }: { dark?: boolean; size?: number }) {
  return (
    <span
      className="f-mono whitespace-nowrap font-semibold leading-none"
      style={{ fontSize: size, letterSpacing: '0.06em' }}
    >
      <span style={{ color: dark ? '#7FB79B' : '#0B5C43' }}>₣€₸$</span>
      <span style={{ display: 'inline-block', width: size * 0.36 }} />
      <span style={{ color: dark ? '#C9A227' : '#A8850F' }}>¢₳₴H</span>
    </span>
  )
}

function PeriodPills() {
  const { period, setPeriod } = useAccount()
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[2px] rounded-[10px] bg-[rgba(17,23,19,0.06)] p-[3px]">
        {PERIODS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setPeriod({ kind: o.value })}
            className={cn(
              'k-press rounded-[7px] px-3.5 py-[7px] text-[13px] transition-colors',
              period.kind === o.value
                ? 'bg-[var(--f-card)] font-medium text-[var(--f-ink)] shadow-[0_1px_2px_rgba(17,23,19,0.10)]'
                : 'text-[var(--k-label-secondary)] hover:text-[var(--f-ink)]'
            )}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPeriod({ kind: 'custom', start: period.start, end: period.end })}
          className={cn(
            'k-press rounded-[7px] px-3.5 py-[7px] text-[13px] transition-colors',
            period.kind === 'custom'
              ? 'bg-[var(--f-card)] font-medium text-[var(--f-ink)] shadow-[0_1px_2px_rgba(17,23,19,0.10)]'
              : 'text-[var(--k-label-secondary)] hover:text-[var(--f-ink)]'
          )}
        >
          Custom
        </button>
      </div>
      {period.kind === 'custom' && (
        <>
          <input
            type="date"
            aria-label="From date"
            value={period.start ?? ''}
            onChange={(e) => setPeriod({ ...period, start: e.target.value })}
            className="f-mono h-9 rounded-lg border border-[var(--k-separator)] bg-[var(--f-card)] px-2.5 text-[12px] text-[var(--k-label-primary)] outline-none"
          />
          <span className="text-[var(--k-label-tertiary)]">→</span>
          <input
            type="date"
            aria-label="To date"
            value={period.end ?? ''}
            onChange={(e) => setPeriod({ ...period, end: e.target.value })}
            className="f-mono h-9 rounded-lg border border-[var(--k-separator)] bg-[var(--f-card)] px-2.5 text-[12px] text-[var(--k-label-primary)] outline-none"
          />
        </>
      )}
    </div>
  )
}

export function AppShell() {
  const { data, loading, refresh, backend } = useAccount()
  const [settings] = useSettings()
  const { entries: claims } = useReimbursements()
  const [indexOpen, setIndexOpen] = useState(false)
  const navigate = useNavigate()
  const isHome = useLocation().pathname === '/'

  const stats = useMemo<Record<string, string>>(() => {
    const next20 = new Date()
    next20.setMonth(next20.getMonth() + 1)
    const due = `DUE 20 ${next20.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}`
    if (!data) return {} as Record<string, string>
    const openClaims = claims.filter((c) => !c.settled_on).length
    return {
      Daybook: 'EVERYTHING AT ONCE',
      Mint: `${data.outstandingCount} UNPAID`,
      Vault: `${data.expenses.length + data.payments.length} LINES`,
      'FETS Cash': formatINR(data.cashBalance),
      Recurring: `${settings.recurring.length} SCHEDULES`,
      Reimburse: `${openClaims} OPEN`,
      Reports: 'CATEGORY & CLIENT',
      GST: due,
      Settings: `${data.customers.length} CLIENTS`,
    }
  }, [data, claims, settings.recurring.length])

  const go = (to: string) => {
    setIndexOpen(false)
    navigate(to)
  }

  return (
    <div className="min-h-screen bg-[var(--f-paper)] text-[var(--f-ink)]">
      {/* Top bar — paper, blur, hairline (hidden on the home page, which carries its own hero) */}
      {!isHome && (
      <header className="sticky top-0 z-[var(--z-header)] border-b border-[var(--f-hairline)] bg-[rgba(239,237,230,0.92)] backdrop-blur-[10px]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4 sm:px-10">
          <NavLink to="/" aria-label="FETS Cash — Daybook" className="shrink-0">
            <Wordmark />
          </NavLink>
          <PeriodPills />
          <div className="flex-1" />
          <div className="f-mono hidden items-center gap-5 text-[11px] tracking-[0.14em] text-[var(--k-label-tertiary)] md:flex">
            <span>{data?.periodLabel?.toUpperCase() ?? ''}</span>
            <span className="flex items-center gap-2">
              <span className={cn('h-[7px] w-[7px] rounded-full', backend === 'supabase' ? 'bg-[var(--f-green-soft)]' : 'bg-[var(--f-gold)]')} />
              {backend === 'supabase' ? 'SUPABASE' : 'LOCAL'}
            </span>
          </div>
          <button
            onClick={() => void refresh()}
            disabled={loading}
            aria-label="Refresh data"
            className="k-press flex h-9 items-center gap-2 rounded-lg border border-[rgba(17,23,19,0.18)] px-4 text-[13px] font-medium text-[var(--k-label-primary)] hover:border-[var(--f-ink)] hover:bg-[var(--f-card)] disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setIndexOpen(true)}
            className="k-press flex h-11 items-center gap-3.5 rounded-full bg-[var(--f-ink)] px-6 text-[var(--f-paper)] hover:bg-[var(--f-green)]"
          >
            <span className="f-mono text-[12px] font-medium tracking-[0.16em]">INDEX</span>
            <span className="flex w-5 flex-col gap-[4px]">
              <span className="h-[2px] bg-[var(--f-paper)]" />
              <span className="h-[2px] bg-[var(--f-paper)]" />
            </span>
          </button>
        </div>
      </header>
      )}

      {/* Fullscreen INDEX overlay */}
      {indexOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] overflow-y-auto bg-[var(--f-dark)] text-[var(--f-paper)]">
          <div className="mx-auto max-w-[1440px] px-6 pb-20 pt-10 sm:px-10">
            <div className="flex flex-wrap items-center justify-between gap-6 pb-10">
              <span className="f-mono text-[11px] tracking-[0.30em] text-[rgba(239,237,230,0.44)]">
                DAYLIGHT ROBBERY · INDEX
              </span>
              <button
                type="button"
                onClick={() => setIndexOpen(false)}
                className="k-press flex h-11 items-center rounded-full border border-[rgba(239,237,230,0.30)] px-7 font-mono text-[12px] tracking-[0.16em] text-[var(--f-paper)] hover:bg-[rgba(239,237,230,0.10)]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                CLOSE ✕
              </button>
            </div>
            <nav role="navigation" aria-label="Index navigation" className="grid">
              {NAV.map((item, i) => (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => go(item.to)}
                  className={cn(
                    'group flex items-baseline gap-6 border-t border-[rgba(239,237,230,0.16)] py-6 text-left transition-[padding] duration-200 hover:pl-4 sm:gap-8 sm:py-7',
                    i === NAV.length - 1 && 'border-b'
                  )}
                >
                  <span className="f-mono w-11 shrink-0 text-[14px] text-[var(--f-gold)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[clamp(30px,4.6vw,58px)] font-medium leading-none tracking-[-0.03em]">
                    {item.label}
                  </span>
                  <span className="flex-1" />
                  <span className="f-mono hidden whitespace-nowrap text-[13px] text-[rgba(239,237,230,0.48)] sm:block">
                    {stats[item.label] ?? ''}
                  </span>
                </button>
              ))}
            </nav>
            <div className="f-mono mt-12 text-[11px] tracking-[0.22em] text-[rgba(239,237,230,0.34)]">
              FORUM TESTING &amp; EDUCATIONAL SERVICES · FETS.CASH
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 pb-24 sm:px-10">
        <Outlet />
      </main>

      <Toaster position="bottom-right" toastOptions={{ style: { zIndex: 'var(--z-toast)' } }} />
    </div>
  )
}
