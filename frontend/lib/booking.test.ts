import { describe, expect, it } from 'vitest';

import { canContinueBooking, doctorsForService, recoverFromSlotConflict } from '@/lib/booking';
import type { BookingDraft, Doctor } from '@/types/api';

const doctors: Doctor[] = [
  {
    id: 'amelia',
    user_id: 'u1',
    slug: 'amelia-smith',
    service_ids: ['consultation', 'checkup'],
    full_name: 'Dr. Amelia Smith',
    specialty: 'Primary Care',
    bio: 'Bio',
    years_experience: 11,
    consultation_fee: '120.00',
    is_accepting_new_patients: true
  },
  {
    id: 'farid',
    user_id: 'u2',
    slug: 'farid-khan',
    service_ids: ['cardiology'],
    full_name: 'Dr. Farid Khan',
    specialty: 'Cardiology',
    bio: 'Bio',
    years_experience: 14,
    consultation_fee: '180.00',
    is_accepting_new_patients: true
  }
];

const emptyDraft: BookingDraft = {
  serviceId: '', doctorId: '', date: '', slotStart: '', reason: '', consent: false
};

describe('booking guards', () => {
  it('shows only doctors compatible with a service', () => {
    expect(doctorsForService(doctors, 'cardiology').map((doctor) => doctor.id)).toEqual(['farid']);
  });

  it('requires each active step before continuing', () => {
    expect(canContinueBooking(1, emptyDraft, false)).toBe(false);
    expect(canContinueBooking(1, { ...emptyDraft, serviceId: 'consultation', doctorId: 'amelia' }, false)).toBe(true);
    expect(canContinueBooking(3, emptyDraft, false)).toBe(false);
    expect(canContinueBooking(3, emptyDraft, true)).toBe(true);
    expect(canContinueBooking(4, { ...emptyDraft, reason: 'A clear visit reason', consent: true }, true)).toBe(true);
  });

  it('returns a slot conflict to step two and clears the stale slot', () => {
    expect(recoverFromSlotConflict({ ...emptyDraft, date: '2026-07-21', slotStart: 'old' })).toEqual({
      step: 2,
      draft: { ...emptyDraft, date: '2026-07-21', slotStart: '' }
    });
  });
});
