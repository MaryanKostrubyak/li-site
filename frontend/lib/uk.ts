import { Appointment, Doctor, Service, UserRole } from '@/types/api';

const serviceNames: Record<string, string> = {
  'General Consultation': 'Загальна консультація',
  'Cardiology Follow-Up': 'Повторний кардіологічний візит',
  'Full Annual Checkup': 'Річний профілактичний огляд'
};

const serviceDescriptions: Record<string, string> = {
  'Comprehensive consultation for common symptoms and preventive care.':
    'Консультація щодо симптомів, профілактики та базового плану лікування.',
  'Follow-up appointment with blood pressure and treatment plan review.':
    'Повторний візит для контролю тиску, аналізів і корекції лікування.',
  'Detailed yearly health checkup and personalized prevention plan.':
    'Комплексний щорічний огляд і персональний план профілактики.'
};

const specialties: Record<string, string> = {
  'General Medicine': 'Сімейна медицина',
  Cardiology: 'Кардіологія'
};

const doctorBios: Record<string, string> = {
  'Specialist in preventive care and chronic condition management.':
    'Спеціалізується на профілактиці та веденні хронічних станів.',
  'Cardiologist focused on diagnostics, hypertension, and follow-up treatment plans.':
    'Кардіолог із фокусом на діагностиці, гіпертензії та подальших планах лікування.'
};

const appointmentReasons: Record<string, string> = {
  'Recurring headaches and fatigue over the last week.': 'Повторюваний головний біль і втома протягом останнього тижня.',
  'Blood pressure follow-up and medication adjustment review.':
    'Повторний візит щодо тиску та перегляд медикаментозного лікування.',
  'Annual wellness exam and blood panel discussion.': 'Річний профілактичний огляд і обговорення аналізів крові.',
  'Canceled by patient due to travel.': 'Скасовано пацієнтом через поїздку.',
  'Missed consultation without notice.': 'Пацієнт не прийшов на консультацію без попередження.',
  'Manual booking from front desk': 'Ручний запис від рецепції',
  'Canceled by patient portal': 'Скасовано через кабінет пацієнта'
};

const appointmentSummaries: Record<string, string> = {
  'Patient reports recurring headaches with fatigue.': 'Пацієнт повідомляє про повторюваний головний біль і втому.',
  'Follow-up for blood pressure management.': 'Повторний візит для контролю тиску.',
  'Annual preventive care visit completed.': 'Річний профілактичний візит завершено.',
  'Canceled appointment.': 'Запис скасовано.',
  'No-show recorded.': 'Зафіксовано неявку.'
};

const internalNotes: Record<string, string> = {
  'Patient prefers early morning appointments when available.': 'Пацієнт надає перевагу ранковим записам, якщо є вільний час.',
  'Lead from physician referral partner clinic.': 'Пацієнт прийшов за рекомендацією партнерської клініки.'
};

const tagLabels: Record<string, string> = {
  'high-value': 'пріоритетний пацієнт',
  'follow-up-needed': 'потрібен контакт',
  cardio: 'кардіологія'
};

const leadSources: Record<string, string> = {
  google_ads: 'Google Ads',
  referral: 'Рекомендація',
  website: 'Сайт',
  manual: 'Ручний запис',
  phone: 'Телефон'
};

export const statusLabels: Record<Appointment['status'], string> = {
  new: 'Новий',
  confirmed: 'Підтверджено',
  completed: 'Завершено',
  canceled: 'Скасовано',
  no_show: "Не з'явився"
};

export const appointmentStatusOptions = Object.keys(statusLabels) as Appointment['status'][];

export const roleLabels: Record<UserRole, string> = {
  admin: 'Адміністратор',
  doctor: 'Лікар',
  patient: 'Пацієнт'
};

export const followUpLabels: Record<string, string> = {
  none: 'Немає',
  needed: 'Потрібен контакт',
  scheduled: 'Заплановано',
  done: 'Виконано'
};

export function ukServiceName(service: Pick<Service, 'name'> | string) {
  const name = typeof service === 'string' ? service : service.name;
  return serviceNames[name] ?? name;
}

export function ukServiceDescription(service: Pick<Service, 'description'> | string) {
  const description = typeof service === 'string' ? service : service.description;
  return serviceDescriptions[description] ?? description;
}

export function ukSpecialty(doctor: Pick<Doctor, 'specialty'> | string) {
  const specialty = typeof doctor === 'string' ? doctor : doctor.specialty;
  return specialties[specialty] ?? specialty;
}

export function ukDoctorBio(doctor: Pick<Doctor, 'bio'> | string) {
  const bio = typeof doctor === 'string' ? doctor : doctor.bio;
  return doctorBios[bio] ?? bio;
}

export function ukAppointmentReason(reason?: string | null) {
  if (!reason) {
    return '-';
  }
  return appointmentReasons[reason] ?? reason;
}

export function ukAppointmentSummary(summary?: string | null) {
  if (!summary) {
    return 'Немає';
  }
  return appointmentSummaries[summary] ?? summary;
}

export function ukInternalNote(note?: string | null) {
  if (!note) {
    return '-';
  }
  return internalNotes[note] ?? note;
}

export function ukTag(tag?: string | null) {
  if (!tag) {
    return '-';
  }
  return tagLabels[tag] ?? tag;
}

export function ukLeadSource(source?: string | null) {
  if (!source) {
    return 'Невідомо';
  }
  return leadSources[source] ?? source;
}

export function ukStatus(status: string) {
  return statusLabels[status as Appointment['status']] ?? status;
}

export function ukDateTime(value: string | number | Date) {
  return new Date(value).toLocaleString('uk-UA', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

export function ukFollowUpStatus(status?: string | null) {
  if (!status) {
    return followUpLabels.none;
  }
  return followUpLabels[status] ?? status;
}

export function ukWeekday(weekday: number | string) {
  const weekdays = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота', 'Неділя'];
  const index = Number(weekday);
  return weekdays[index] ?? `День ${weekday}`;
}
