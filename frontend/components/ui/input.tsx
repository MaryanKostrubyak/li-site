import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-md border border-border bg-card px-3.5 py-2 text-sm text-foreground transition placeholder:text-muted-foreground focus:border-success focus:outline-none focus:ring-2 focus:ring-success/20 disabled:cursor-not-allowed disabled:bg-muted',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';
