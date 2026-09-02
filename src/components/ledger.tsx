import { cn } from '@/lib/utils'

/**
 * Ledger primitives — the ink-on-paper design language from the redesign comp:
 * mono kickers, giant display headings, hairline stat strips and ledger tables.
 */

export function Kicker({ children, green, className }: {
  children: React.ReactNode
  green?: boolean
  className?: string
}) {
  return <div className={cn('f-kicker', green && 'f-kicker-green', className)}>{children}</div>
}

/** Page hero: "02 · MINT" kicker, display heading, lede, optional pill actions. */
export function PageHero({ index, section, title, lede, actions }: {
  index?: string
  section?: string
  title: React.ReactNode
  lede?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="pb-10 pt-6 sm:pb-14 sm:pt-10">
      {(index || section) && (
        <Kicker green className="mb-5 !text-[12px] !tracking-[0.22em]">
          {[index, section].filter(Boolean).join(' · ')}
        </Kicker>
      )}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="f-display m-0">{title}</h1>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      {lede && <p className="f-lede m-0 mt-6 max-w-[58ch]">{lede}</p>}
    </div>
  )
}

export interface Stat {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: 'ink' | 'green' | 'gold' | 'red'
}

const statTone: Record<NonNullable<Stat['tone']>, string> = {
  ink: 'text-[var(--f-ink)]',
  green: 'text-[var(--f-green)]',
  gold: 'text-[var(--f-gold-dark)]',
  red: 'text-[var(--f-red)]',
}

/** KPI strip — hairline-divided cells, mono numerals. */
export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <section
      className={cn(
        'grid border-b border-t border-[var(--f-hairline)]',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]',
        className
      )}
      style={{ gridTemplateColumns: undefined }}
    >
      {stats.map((s, i) => (
        <div
          key={i}
          className={cn(
            'min-w-0 px-0 py-7 sm:px-6',
            i > 0 && 'border-t border-[var(--f-hairline-soft)] sm:border-l sm:border-t-0'
          )}
          style={i === 0 ? { paddingLeft: 0 } : undefined}
        >
          <Kicker>{s.label}</Kicker>
          <div className={cn('f-stat mt-4', statTone[s.tone ?? 'ink'])}>{s.value}</div>
          {s.sub && <div className="f-mono mt-3 text-[11px] tracking-[0.08em] text-[var(--k-label-secondary)]">{s.sub}</div>}
        </div>
      ))}
    </section>
  )
}

/** Pill action button — ink filled (primary) or hairline outline. */
export function Pill({ children, onClick, outline, small, className, type = 'button', disabled }: {
  children: React.ReactNode
  onClick?: () => void
  outline?: boolean
  small?: boolean
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'k-press inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors',
        small ? 'h-9 px-5 text-[13px]' : 'h-12 px-7 text-[15px]',
        outline
          ? 'border border-[rgba(17,23,19,0.22)] text-[var(--k-label-primary)] hover:border-[var(--f-ink)] hover:bg-[var(--f-card)]'
          : 'bg-[var(--f-ink)] text-[var(--f-paper)] hover:bg-[var(--f-green)]',
        disabled && 'pointer-events-none opacity-40',
        className
      )}
    >
      {children}
    </button>
  )
}

/** Ledger table — hairline rows on a CSS grid. `cols` is a grid-template-columns value. */
export function LedgerTable({ cols, header, children, className }: {
  cols: string
  header: React.ReactNode[]
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div
        className="f-kicker grid gap-x-5 gap-y-2 border-b border-[var(--f-hairline)] py-4"
        style={{ gridTemplateColumns: cols }}
      >
        {header.map((h, i) => <span key={i}>{h}</span>)}
      </div>
      {children}
    </div>
  )
}

export function LedgerRow({ cols, children, className, onClick }: {
  cols: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'grid items-center gap-x-5 gap-y-2 border-b border-[var(--f-hairline-soft)] py-5 text-[15px] transition-colors hover:bg-[rgba(17,23,19,0.035)]',
        onClick && 'cursor-pointer',
        className
      )}
      style={{ gridTemplateColumns: cols }}
    >
      {children}
    </div>
  )
}

/** Mono numeric/text cell. */
export function M({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('f-mono', className)}>{children}</span>
}

/** Status as plain mono colored text (comp style — no badge pills). */
export function StatusText({ tone = 'muted', children }: {
  tone?: 'green' | 'gold' | 'red' | 'muted'
  children: React.ReactNode
}) {
  const c = {
    green: 'text-[var(--f-green)]',
    gold: 'text-[var(--f-gold-dark)]',
    red: 'text-[var(--f-red)]',
    muted: 'text-[var(--k-label-tertiary)]',
  }[tone]
  return <span className={cn('f-mono text-[11px] font-medium uppercase tracking-[0.12em]', c)}>{children}</span>
}
