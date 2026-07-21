import { Badge } from '@/components/ui/badge';

type Status = 'new' | 'confirmed' | 'completed' | 'canceled' | 'no_show';

const styles: Record<Status, { variant: 'info' | 'success' | 'warning' | 'danger' | 'outline' }> = {
  new: { variant: 'info' },
  confirmed: { variant: 'outline' },
  completed: { variant: 'success' },
  canceled: { variant: 'danger' },
  no_show: { variant: 'warning' }
};

const labels: Record<Status, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  completed: 'Completed',
  canceled: 'Canceled',
  no_show: 'No-show',
};

export function StatusBadge({ status }: { status: string }) {
  const safeStatus = (status in styles ? status : 'new') as Status;
  const preset = styles[safeStatus];

  return <Badge variant={preset.variant}>{labels[safeStatus]}</Badge>;
}
