export type UserRole = 'admin' | 'doctor' | 'patient';

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
  full_name: string;
  specialty: string;
  bio: string;
  years_experience: number;
  consultation_fee: string;
  is_accepting_new_patients: boolean;
};

export type Slot = {
  start_at: string;
  end_at: string;
};

export type Appointment = {
  id: string;
  patient_id: string;
  doctor_id: string;
  service_id: string;
  status: 'new' | 'confirmed' | 'completed' | 'canceled' | 'no_show';
  start_at: string;
  end_at: string;
  reason: string;
  source_channel: string;
  issue_summary?: string | null;
  issue_classification?: string | null;
};

export type AuthMe = {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
  };
  patient_profile_id: string | null;
  doctor_profile_id: string | null;
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
