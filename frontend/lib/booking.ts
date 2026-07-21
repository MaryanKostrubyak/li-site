import type { BookingDraft, Doctor } from '@/types/api';

export function doctorsForService(doctors: Doctor[], serviceId: string): Doctor[] {
  if (!serviceId) return [];
  return doctors.filter((doctor) => doctor.service_ids.includes(serviceId));
}

export function canContinueBooking(step: number, draft: BookingDraft, authenticated: boolean): boolean {
  if (step === 1) return Boolean(draft.serviceId && draft.doctorId);
  if (step === 2) return Boolean(draft.date && draft.slotStart);
  if (step === 3) return authenticated;
  if (step === 4) return draft.reason.trim().length >= 8 && draft.consent;
  return false;
}

export function recoverFromSlotConflict(draft: BookingDraft): { step: 2; draft: BookingDraft } {
  return { step: 2, draft: { ...draft, slotStart: '' } };
}
