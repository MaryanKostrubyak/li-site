const CLINIC_TIME_ZONE = 'America/Los_Angeles';

export function formatClinicTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value));
}

export function formatClinicDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value));
}
