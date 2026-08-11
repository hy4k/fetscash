import { cn } from '@/lib/utils'

/**
 * Status badge — Kimi semantic color usage.
 * Light status background tokens + matching status text color.
 */
type Tone = 'green' | 'red' | 'orange' | 'blue' | 'neutral' | 'purple'

const tones: Record<Tone, string> = {
  green: 'bg-[var(--f-emerald-100)] text-[var(--f-emerald-700)]',
  red: 'bg-[var(--k-bg-red-light)] text-[var(--k-danger)]',
  orange: 'bg-[var(--f-gold-100)] text-[var(--f-gold-600)]',
  blue: 'bg-[var(--k-bg-blue-light)] text-[var(--k-blue)]',
  purple: 'bg-[rgba(139,92,246,0.12)] text-[#7c3aed]',
  neutral: 'bg-[var(--k-fill-f2)] text-[var(--k-label-secondary)]',
}

export function KimiBadge({ tone = 'neutral', children, className }: {
  tone?: Tone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[12px] font-medium leading-[18px]',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
