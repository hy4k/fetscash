import { cn } from '@/lib/utils'

/** Quiet data surface — color.background.primary + 0.5px separator.s1, radius.lg. */
export function KimiCard({ title, actions, children, className, pad = true }: {
  title?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  pad?: boolean
}) {
  return (
    <section className={cn('k-card', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 px-5 pt-4">
          <h2 className="k-t2-em">{title}</h2>
          {actions}
        </header>
      )}
      <div className={cn(pad && 'p-5', title && 'pt-3')}>{children}</div>
    </section>
  )
}
