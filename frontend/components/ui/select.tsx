import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'h-11 w-full rounded-md border border-border/90 bg-white/85 px-3.5 py-2 text-sm text-foreground shadow-crisp transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted/55',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = 'Select';
