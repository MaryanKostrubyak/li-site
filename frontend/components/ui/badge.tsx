import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'outline' | 'info';

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'border-border/80 bg-muted/75 text-muted-foreground',
  outline: 'border-border/80 bg-white/65 text-muted-foreground',
  info: 'border-primary/20 bg-primary/10 text-primary',
  success: 'border-success/20 bg-success/10 text-success',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  danger: 'border-danger/20 bg-danger/10 text-danger'
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-center text-[11px] font-semibold uppercase leading-tight tracking-[0.08em]',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
