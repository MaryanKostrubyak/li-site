import { Badge } from '@/components/ui/badge';
import { ukStatus } from '@/lib/uk';

type Status = 'new' | 'confirmed' | 'completed' | 'canceled' | 'no_show';

const styles: Record<Status, { variant: 'info' | 'success' | 'warning' | 'danger' | 'outline' }> = {
  new: { variant: 'info' },
  confirmed: { variant: 'outline' },
  completed: { variant: 'success' },
  canceled: { variant: 'danger' },
  no_show: { variant: 'warning' }
};

export function StatusBadge({ status }: { status: string }) {
  const safeStatus = (status in styles ? status : 'new') as Status;
  const preset = styles[safeStatus];

  return <Badge variant={preset.variant}>{ukStatus(safeStatus)}</Badge>;
}
