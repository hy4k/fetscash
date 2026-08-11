import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Kimi Web Button — components-web/button.md
 * Variants: primary | secondary | outline. Sizes: 44 | 32 | 26 (default 32).
 * Primary fill: color.labels.primary · Secondary: color.fills.f1/f2 ·
 * Outline: 0.5px color.separator.s1 · Danger: color.status.danger
 */
export interface KimiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 44 | 32 | 26
  danger?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
}

const sizeStyles: Record<number, string> = {
  44: 'h-11 rounded-xl px-[14px] text-[16px] font-medium leading-6 gap-1.5 min-w-[72px] [&_svg]:h-5 [&_svg]:w-5',
  32: 'h-8 rounded-[10px] px-[10px] text-[14px] font-medium leading-5 gap-1 min-w-[62px] [&_svg]:h-[18px] [&_svg]:w-[18px]',
  26: 'h-[26px] rounded-lg px-2 text-[12px] font-medium leading-[18px] gap-0.5 min-w-[52px] [&_svg]:h-4 [&_svg]:w-4',
}

function variantStyles(variant: string, danger: boolean): string {
  if (danger) {
    if (variant === 'primary') return 'bg-[var(--k-danger)] text-white hover:bg-[var(--k-danger-hover)]'
    if (variant === 'outline') return 'border-[0.5px] border-[var(--k-separator)] text-[var(--k-danger)] hover:bg-[var(--k-fill-f1)]'
    return 'bg-[var(--k-fill-f1)] text-[var(--k-danger)] hover:bg-[var(--k-fill-f2)]'
  }
  switch (variant) {
    case 'primary':
      return 'bg-[image:var(--f-btn-bg)] text-white shadow-[0_2px_8px_rgba(4,120,87,0.35)] hover:bg-[image:var(--f-btn-bg-hover)]'
    case 'outline':
      return 'border-[0.5px] border-[var(--k-separator)] text-[var(--k-label-primary)] hover:bg-[var(--k-fill-f1)]'
    default:
      return 'bg-[var(--k-fill-f1)] text-[var(--k-label-primary)] hover:bg-[var(--k-fill-f2-hover)]'
  }
}

export const KimiButton = forwardRef<HTMLButtonElement, KimiButtonProps>(
  ({ variant = 'primary', size = 32, danger, loading, leftIcon, className, children, disabled, ...props }, ref) => {
    const inactive = disabled || loading
    return (
      <button
        ref={ref}
        disabled={inactive}
        aria-busy={loading || undefined}
        className={cn(
          'k-press inline-flex select-none items-center justify-center whitespace-nowrap',
          sizeStyles[size],
          variantStyles(variant, !!danger),
          inactive && 'pointer-events-none opacity-40 [&_svg]:text-[var(--k-label-quaternary)]',
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" /> : leftIcon}
        {children}
      </button>
    )
  }
)
KimiButton.displayName = 'KimiButton'
