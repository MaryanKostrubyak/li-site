import { describe, expect, it } from 'vitest';

import { formatClinicDateTime, formatClinicTime } from './datetime';

describe('clinic date formatting', () => {
  it('shows a dated appointment in Pacific Time without invalid Intl options', () => {
    expect(formatClinicDateTime('2026-07-20T16:30:00Z')).toMatch(/Jul 20, 2026.*9:30 AM.*PDT/);
  });

  it('shows a slot time with an explicit Pacific abbreviation', () => {
    expect(formatClinicTime('2026-01-20T17:30:00Z')).toBe('9:30 AM PST');
  });
});
