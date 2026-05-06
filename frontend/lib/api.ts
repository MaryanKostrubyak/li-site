import { API_BASE_URL } from '@/lib/config';
import { AdminPatientSummary, Appointment, AuthMe, Doctor, Service, Slot } from '@/types/api';

async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      message = payload.detail ?? payload.message ?? message;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => apiFetch<{ status: string }>('/health'),

  login: (payload: { email: string; password: string }) =>
    apiFetch<{ access_token: string; role: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  registerPatient: (payload: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) =>
    apiFetch<{ access_token: string; role: string }>('/auth/register/patient', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  me: (token: string) => apiFetch<AuthMe>('/auth/me', {}, token),

  getServices: () => apiFetch<Service[]>('/public/services'),
  getDoctors: () => apiFetch<Doctor[]>('/public/doctors'),
  getDoctor: (id: string) => apiFetch<Doctor>(`/public/doctors/${id}`),

  getDoctorSlots: (doctorId: string, serviceId: string, date: string) =>
    apiFetch<{ doctor_id: string; service_id: string; date: string; slots: Slot[] }>(
      `/public/doctors/${doctorId}/slots?service_id=${serviceId}&date=${date}`
    ),

  publicBook: (payload: {
    service_id: string;
    doctor_id: string;
    start_at: string;
    reason: string;
    patient_email: string;
    patient_full_name: string;
    patient_phone?: string;
    source_channel?: string;
  }) =>
    apiFetch<Appointment>('/appointments/public-book', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  patientUpcoming: (token: string) => apiFetch<Appointment[]>('/patient/appointments/upcoming', {}, token),
  patientHistory: (token: string) => apiFetch<Appointment[]>('/patient/appointments/history', {}, token),

  patientProfile: (token: string) =>
    apiFetch<{
      id: string;
      user_id: string;
      date_of_birth?: string;
      gender?: string;
      address?: string;
      emergency_contact?: string;
      lead_source?: string;
      follow_up_status: string;
      notification_email_enabled: boolean;
      notification_telegram_enabled: boolean;
      telegram_chat_id?: string;
    }>('/patient/profile', {}, token),

  updatePatientProfile: (token: string, payload: Record<string, unknown>) =>
    apiFetch('/patient/profile', { method: 'PATCH', body: JSON.stringify(payload) }, token),

  cancelAppointment: (token: string, appointmentId: string, reason?: string) =>
    apiFetch(`/appointments/${appointmentId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }, token),

  rescheduleAppointment: (token: string, appointmentId: string, newStartAt: string) =>
    apiFetch(`/appointments/${appointmentId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ new_start_at: newStartAt })
    }, token),

  adminMetrics: (token: string) => apiFetch<Record<string, number>>('/admin/metrics', {}, token),
  adminAppointments: (token: string) => apiFetch<any[]>('/admin/appointments', {}, token),
  adminPatients: (token: string) => apiFetch<AdminPatientSummary[]>('/admin/patients', {}, token),
  adminPatientDetail: (token: string, patientId: string) => apiFetch<any>(`/admin/patients/${patientId}`, {}, token),

  adminUpdateAppointment: (token: string, appointmentId: string, payload: Record<string, unknown>) =>
    apiFetch(`/admin/appointments/${appointmentId}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),

  adminCreateAppointment: (token: string, payload: Record<string, unknown>) =>
    apiFetch('/admin/appointments', { method: 'POST', body: JSON.stringify(payload) }, token),

  adminAddTag: (token: string, patientId: string, tag: string) =>
    apiFetch(`/admin/patients/${patientId}/tags`, { method: 'POST', body: JSON.stringify({ tag }) }, token),

  adminAddNote: (token: string, patientId: string, note: string) =>
    apiFetch(`/admin/patients/${patientId}/notes`, { method: 'POST', body: JSON.stringify({ note }) }, token),

  doctorToday: (token: string) => apiFetch<Appointment[]>('/doctor/appointments/today', {}, token),
  doctorUpcoming: (token: string) => apiFetch<Appointment[]>('/doctor/appointments/upcoming', {}, token),
  doctorSchedule: (token: string) => apiFetch<any[]>('/doctor/schedule', {}, token),
  doctorUpdateStatus: (token: string, appointmentId: string, status: string) =>
    apiFetch(`/doctor/appointments/${appointmentId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  doctorAddNote: (token: string, appointmentId: string, payload: { raw_note: string; use_ai_formatting: boolean }) =>
    apiFetch(`/doctor/appointments/${appointmentId}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, token),

  runReminders: (token: string) => apiFetch('/automation/run-reminders', { method: 'POST' }, token),

  aiSummarizeBooking: (text: string) =>
    apiFetch<{ output: string; source: string }>('/ai/summarize-booking', {
      method: 'POST',
      body: JSON.stringify({ text })
    }),

  aiClassifyRequest: (text: string) =>
    apiFetch<{ classification: string; source: string }>('/ai/classify-request', {
      method: 'POST',
      body: JSON.stringify({ text })
    }),

  aiFormatNote: (text: string) =>
    apiFetch<{ output: string; source: string }>('/ai/format-note', {
      method: 'POST',
      body: JSON.stringify({ text })
    }),

  aiFollowUp: (visitNote: string) =>
    apiFetch<{ output: string; source: string }>('/ai/generate-follow-up', {
      method: 'POST',
      body: JSON.stringify({ visit_note: visitNote })
    })
};
