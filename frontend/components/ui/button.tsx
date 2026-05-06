import * as React from 'react';

import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'subtle' | 'ink';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:
    'border border-transparent bg-primary text-primary-foreground shadow-crisp hover:bg-primary/90 focus-visible:ring-primary/30',
  secondary:
    'border border-transparent bg-accent text-accent-foreground shadow-crisp hover:bg-accent/90 focus-visible:ring-accent/30',
  outline:
    'border border-border/90 bg-white/70 text-foreground hover:border-primary/45 hover:bg-white focus-visible:ring-primary/20',
  ghost:
    'border border-transparent bg-transparent text-muted-foreground hover:bg-muted/65 hover:text-foreground focus-visible:ring-primary/20',
  danger:
    'border border-transparent bg-danger text-white shadow-crisp hover:bg-danger/90 focus-visible:ring-danger/30',
  subtle:
    'border border-border/60 bg-muted/70 text-foreground hover:bg-muted focus-visible:ring-primary/20',
  ink:
    'border border-transparent bg-ink text-white shadow-crisp hover:bg-ink/90 focus-visible:ring-ink/25'
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'min-h-8 rounded-md px-3 py-1.5 text-xs font-semibold',
  md: 'min-h-10 rounded-md px-4 py-2 text-sm font-semibold',
  lg: 'min-h-12 rounded-md px-5 py-3 text-sm font-semibold',
  icon: 'h-9 w-9 rounded-md p-0'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex max-w-full items-center justify-center gap-2 whitespace-normal text-center leading-tight transition duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-45',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
