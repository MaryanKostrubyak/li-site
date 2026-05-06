import { cn } from '@/lib/utils';

type AlertVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const alertVariants: Record<AlertVariant, string> = {
  default: 'border-border/80 bg-white/70 text-foreground',
  info: 'border-primary/20 bg-primary/10 text-foreground',
  success: 'border-success/25 bg-success/10 text-foreground',
  warning: 'border-warning/25 bg-warning/10 text-foreground',
  danger: 'border-danger/25 bg-danger/10 text-foreground'
};

export function Alert({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }) {
  return (
    <div
      className={cn('rounded-lg border p-4 text-sm leading-6 shadow-crisp', alertVariants[variant], className)}
      {...props}
    />
  );
}
