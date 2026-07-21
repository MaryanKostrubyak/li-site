export type UserRole = 'admin' | 'doctor' | 'patient';
export type AppointmentStatus = 'new' | 'confirmed' | 'completed' | 'canceled' | 'no_show';

export type Service = {
  id: string;
  name: string;
  slug: string;
  description: string;
  duration_minutes: number;
  price: string;
};

export type Doctor = {
  id: string;
  user_id: string;
  slug: string;
  service_ids: string[];
  full_name: string;
  specialty: string;
  bio: string;
  years_experience: number;
  consultation_fee: string;
  is_accepting_new_patients: boolean;
};

export type Slot = { start_at: string; end_at: string };

export type DoctorSummary = { id: string; name: string; specialty: string };
export type ServiceSummary = { id: string; name: string; duration_minutes: number; price: string };
export type PatientSummary = { id: string; name: string; email: string };

export type Appointment = {
  id: string;
  reference_code?: string;
  patient_id?: string;
  doctor_id?: string;
  service_id?: string;
  status: AppointmentStatus;
  start_at: string;
  end_at: string;
  reason: string;
  source_channel?: string;
  issue_summary?: string | null;
  issue_classification?: string | null;
  rescheduled_from_appointment_id?: string | null;
  doctor: DoctorSummary;
  service: ServiceSummary;
  patient: PatientSummary;
};

export type AppointmentNote = { id: string; raw_note: string; formatted_note: string; created_at: string };
export type DoctorAppointmentDetail = Appointment & { reference_code: string; notes: AppointmentNote[] };

export type AuthMe = {
  user: { id: string; email: string; full_name: string; role: UserRole };
  patient_profile_id: string | null;
  doctor_profile_id: string | null;
};

export type BookingDraft = {
  serviceId: string;
  doctorId: string;
  date: string;
  slotStart: string;
  reason: string;
  consent: boolean;
};

export type AdminPatientSummary = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  lead_source: string | null;
  follow_up_status: 'none' | 'needed' | 'scheduled' | 'done';
};

export type PatientProfile = {
  id: string;
  user_id: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  emergency_contact?: string;
  lead_source?: string;
  notification_email_enabled: boolean;
  notification_telegram_enabled: boolean;
};

export type AdminPatientDetail = {
  patient: AdminPatientSummary;
  tags: Array<{ id: string; tag: string; created_at: string }>;
  notes: Array<{ id: string; note: string; created_at: string }>;
  appointments: Appointment[];
};

export type ApiErrorPayload = {
  code: string;
  message: string;
  field_errors?: Record<string, string[]>;
};
