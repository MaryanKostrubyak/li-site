import { API_BASE_URL } from '@/lib/config';
import type {
  AdminPatientDetail,
  AdminPatientSummary,
  ApiErrorPayload,
  Appointment,
  AuthMe,
  Doctor,
  DoctorAppointmentDetail,
  PatientProfile,
  Service,
  Slot,
  UserRole
} from '@/types/api';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const csrf = !['GET', 'HEAD', 'OPTIONS'].includes(method) ? readCookie('clinic_csrf') : undefined;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      ...(options.headers ?? {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    let payload: ApiErrorPayload = { code: 'request_failed', message: `Request failed (${response.status})` };
    try {
      payload = { ...payload, ...(await response.json()) };
    } catch {
      // The fallback above is intentionally user-readable.
    }
    throw new ApiClientError(payload.message, response.status, payload.code, payload.field_errors);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  health: async () => {
    const response = await fetch('/health', { cache: 'no-store' });
    if (!response.ok) throw new ApiClientError('Health check failed.', response.status, 'health_failed');
    return response.json() as Promise<{ status: string }>;
  },
  login: (payload: { email: string; password: string }) =>
    apiFetch<AuthMe>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  registerPatient: (payload: { email: string; password: string; full_name: string; phone?: string }) =>
    apiFetch<AuthMe>('/auth/register/patient', { method: 'POST', body: JSON.stringify(payload) }),
  demoLogin: (role: UserRole) =>
    apiFetch<AuthMe>('/auth/demo-login', { method: 'POST', body: JSON.stringify({ role }) }),
  logout: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
  me: () => apiFetch<AuthMe>('/auth/me'),

  getServices: () => apiFetch<Service[]>('/public/services'),
  getDoctors: () => apiFetch<Doctor[]>('/public/doctors'),
  getDoctor: (id: string) => apiFetch<Doctor>(`/public/doctors/${id}`),
  getDoctorSlots: (doctorId: string, serviceId: string, date: string) =>
    apiFetch<{ doctor_id: string; service_id: string; date: string; slots: Slot[] }>(
      `/public/doctors/${doctorId}/slots?service_id=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`
    ),
  createAppointment: (payload: { service_id: string; doctor_id: string; start_at: string; reason: string }) =>
    apiFetch<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(payload) }),

  patientUpcoming: () => apiFetch<Appointment[]>('/patient/appointments/upcoming'),
  patientHistory: () => apiFetch<Appointment[]>('/patient/appointments/history'),
  patientProfile: () => apiFetch<PatientProfile>('/patient/profile'),
  updatePatientProfile: (payload: Record<string, unknown>) =>
    apiFetch<PatientProfile>('/patient/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
  cancelAppointment: (appointmentId: string, reason?: string) =>
    apiFetch(`/appointments/${appointmentId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  rescheduleAppointment: (appointmentId: string, newStartAt: string) =>
    apiFetch<Appointment>(`/appointments/${appointmentId}/reschedule`, {
      method: 'POST', body: JSON.stringify({ new_start_at: newStartAt })
    }),

  adminMetrics: () => apiFetch<Record<string, number>>('/admin/metrics'),
  adminAppointments: () => apiFetch<Appointment[]>('/admin/appointments'),
  adminPatients: () => apiFetch<AdminPatientSummary[]>('/admin/patients'),
  adminPatientDetail: (patientId: string) => apiFetch<AdminPatientDetail>(`/admin/patients/${patientId}`),
  adminUpdateAppointment: (appointmentId: string, payload: Partial<Appointment>) =>
    apiFetch<Appointment>(`/admin/appointments/${appointmentId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  adminCreateAppointment: (payload: Record<string, unknown>) =>
    apiFetch<Appointment>('/admin/appointments', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdatePatient: (patientId: string, followUpStatus: AdminPatientSummary['follow_up_status']) =>
    apiFetch<AdminPatientSummary>(`/admin/patients/${patientId}`, {
      method: 'PATCH', body: JSON.stringify({ follow_up_status: followUpStatus })
    }),
  adminAddTag: (patientId: string, tag: string) =>
    apiFetch(`/admin/patients/${patientId}/tags`, { method: 'POST', body: JSON.stringify({ tag }) }),
  adminAddNote: (patientId: string, note: string) =>
    apiFetch(`/admin/patients/${patientId}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),

  doctorToday: () => apiFetch<Appointment[]>('/doctor/appointments/today'),
  doctorUpcoming: () => apiFetch<Appointment[]>('/doctor/appointments/upcoming'),
  doctorAppointment: (appointmentId: string) => apiFetch<DoctorAppointmentDetail>(`/doctor/appointments/${appointmentId}`),
  doctorSchedule: () => apiFetch<Array<{ id: string; weekday: number; start_time: string; end_time: string; slot_interval_minutes: number }>>('/doctor/schedule'),
  doctorUpdateStatus: (appointmentId: string, status: string) =>
    apiFetch<Appointment>(`/doctor/appointments/${appointmentId}/status`, {
      method: 'PATCH', body: JSON.stringify({ status })
    }),
  doctorPreviewNote: (appointmentId: string, rawNote: string) =>
    apiFetch<{ preview: string; source: string }>(`/doctor/appointments/${appointmentId}/notes/preview`, {
      method: 'POST', body: JSON.stringify({ raw_note: rawNote })
    }),
  doctorAddNote: (appointmentId: string, payload: { raw_note: string; formatted_note?: string }) =>
    apiFetch(`/doctor/appointments/${appointmentId}/notes`, { method: 'POST', body: JSON.stringify(payload) }),
  runReminders: () => apiFetch('/automation/run-reminders', { method: 'POST' }),
  aiFormatNote: (text: string) =>
    apiFetch<{ output: string; source: string }>('/ai/format-note', { method: 'POST', body: JSON.stringify({ text }) })
};
