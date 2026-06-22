import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold transition-colors',
        variant === 'default' && 'bg-surface-elevated text-text-primary',
        variant === 'secondary' && 'bg-surface-elevated text-text-secondary',
        variant === 'destructive' && 'bg-red-500/10 text-red-400 border border-red-500/20',
        variant === 'outline' && 'border border-divider text-text-secondary',
        variant === 'success' && 'bg-green-500/10 text-green-400 border border-green-500/20',
        className
      )}
      {...props}
    />
  );
}
