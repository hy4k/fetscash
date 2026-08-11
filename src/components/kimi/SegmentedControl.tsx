import { cn } from '@/lib/utils'

/**
 * Kimi Web Segmented Control — components-web/segmented-control.md
 * Track: fills.f2 · Selected: background.quaternary (white) pop-out · 2–3 segments.
 */
export interface SegmentedOption {
  value: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}

export function KimiSegmentedControl({
  options,
  value,
  onChange,
  size = 'sm',
  ariaLabel,
  className,
  onDark = false,
}: {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  size?: 'sm' | 'md'
  ariaLabel?: string
  className?: string
  onDark?: boolean
}) {
  const track = size === 'sm' ? 'h-8 rounded-[10px] p-[2px]' : 'h-10 rounded-xl p-1'
  const segment = size === 'sm' ? 'h-7 rounded-md px-3' : 'h-8 rounded-lg px-3'
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-1',
        onDark ? 'bg-white/15' : 'bg-[var(--k-fill-f2)]',
        track,
        className
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={selected}
            aria-disabled={opt.disabled || undefined}
            disabled={opt.disabled}
            onClick={() => !selected && onChange(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1 text-[14px] leading-5 transition-[background-color] duration-150 ease-out',
              segment,
              selected
                ? onDark
                  ? 'bg-white font-medium text-[var(--f-emerald-800)] shadow-[0_1px_3px_rgba(0,0,0,0.25)]'
                  : 'bg-[var(--k-bg-primary)] font-medium text-[var(--k-label-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : onDark
                  ? 'text-white/85 hover:bg-white/10'
                  : 'text-[var(--k-label-primary)] hover:bg-[var(--k-fill-f1)]',
              opt.disabled && 'pointer-events-none opacity-40',
              '[&_svg]:h-4 [&_svg]:w-4'
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
