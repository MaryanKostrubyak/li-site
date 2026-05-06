import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  action,
  className
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('border-dashed bg-white/55', className)}>
      <CardContent className='flex min-h-40 flex-col items-start justify-center gap-2.5'>
        <p className='font-display text-xl font-semibold tracking-tight'>{title}</p>
        <p className='max-w-prose text-sm leading-6 text-muted-foreground'>{description}</p>
        {action ? <div className='pt-1'>{action}</div> : null}
      </CardContent>
    </Card>
  );
}
