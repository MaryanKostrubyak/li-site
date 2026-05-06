import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  subtitle,
  action,
  className
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-5 border-b border-border/70 pb-7 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className='max-w-4xl'>
        <h1 className='page-title'>{title}</h1>
        {subtitle ? <p className='page-subtitle'>{subtitle}</p> : null}
      </div>
      {action ? <div className='flex flex-wrap items-center gap-2'>{action}</div> : null}
    </header>
  );
}
