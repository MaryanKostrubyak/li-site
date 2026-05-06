import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-md border border-border/90 bg-white/85 px-3.5 py-2 text-sm text-foreground shadow-crisp transition placeholder:text-muted-foreground/80 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted/55',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';
