from enum import Enum


class UserRole(str, Enum):
    admin = 'admin'
    doctor = 'doctor'
    patient = 'patient'


class AppointmentStatus(str, Enum):
    new = 'new'
    confirmed = 'confirmed'
    completed = 'completed'
    canceled = 'canceled'
    no_show = 'no_show'


class FollowUpStatus(str, Enum):
    none = 'none'
    needed = 'needed'
    scheduled = 'scheduled'
    done = 'done'


class NotificationChannel(str, Enum):
    email = 'email'
    telegram = 'telegram'
    system = 'system'


class NotificationEventType(str, Enum):
    appointment_created = 'appointment_created'
    reminder_24h = 'reminder_24h'
    reminder_2h = 'reminder_2h'
    appointment_canceled = 'appointment_canceled'
    appointment_rescheduled = 'appointment_rescheduled'
    post_visit_follow_up = 'post_visit_follow_up'


class NotificationDeliveryStatus(str, Enum):
    sent = 'sent'
    skipped = 'skipped'
    failed = 'failed'


class AIRequestFeature(str, Enum):
    booking_summary = 'booking_summary'
    request_classification = 'request_classification'
    follow_up_message = 'follow_up_message'
    format_note = 'format_note'


class AIRequestStatus(str, Enum):
    success = 'success'
    fallback = 'fallback'
    failed = 'failed'
