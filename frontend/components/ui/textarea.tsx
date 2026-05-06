import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[128px] w-full rounded-md border border-border/90 bg-white/85 px-3.5 py-3 text-sm leading-6 text-foreground shadow-crisp transition placeholder:text-muted-foreground/80 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted/55',
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';
