"""initial schema

Revision ID: 20260423_0001
Revises:
Create Date: 2026-04-23 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = '20260423_0001'
down_revision = None
branch_labels = None
depends_on = None


user_role = sa.Enum('admin', 'doctor', 'patient', name='user_role')
appointment_status = sa.Enum('new', 'confirmed', 'completed', 'canceled', 'no_show', name='appointment_status')
follow_up_status = sa.Enum('none', 'needed', 'scheduled', 'done', name='follow_up_status')
notification_channel = sa.Enum('email', 'telegram', 'system', name='notification_channel')
notification_event_type = sa.Enum(
    'appointment_created',
    'reminder_24h',
    'reminder_2h',
    'appointment_canceled',
    'appointment_rescheduled',
    'post_visit_follow_up',
    name='notification_event_type',
)
notification_delivery_status = sa.Enum('sent', 'skipped', 'failed', name='notification_delivery_status')
ai_request_feature = sa.Enum(
    'booking_summary',
    'request_classification',
    'follow_up_message',
    'format_note',
    name='ai_request_feature',
)
ai_request_status = sa.Enum('success', 'fallback', 'failed', name='ai_request_status')


def upgrade() -> None:
    bind = op.get_bind()
    user_role.create(bind, checkfirst=True)
    appointment_status.create(bind, checkfirst=True)
    follow_up_status.create(bind, checkfirst=True)
    notification_channel.create(bind, checkfirst=True)
    notification_event_type.create(bind, checkfirst=True)
    notification_delivery_status.create(bind, checkfirst=True)
    ai_request_feature.create(bind, checkfirst=True)
    ai_request_status.create(bind, checkfirst=True)

    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('role', user_role, nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_role', 'users', ['role'], unique=False)

    op.create_table(
        'doctor_profiles',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('specialty', sa.String(length=255), nullable=False),
        sa.Column('bio', sa.Text(), nullable=False),
        sa.Column('years_experience', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('consultation_fee', sa.Numeric(10, 2), nullable=False),
        sa.Column('is_accepting_new_patients', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'patient_profiles',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('gender', sa.String(length=50), nullable=True),
        sa.Column('address', sa.String(length=500), nullable=True),
        sa.Column('emergency_contact', sa.String(length=255), nullable=True),
        sa.Column('lead_source', sa.String(length=100), nullable=True),
        sa.Column('follow_up_status', follow_up_status, nullable=False, server_default='none'),
        sa.Column('notification_email_enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('notification_telegram_enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('telegram_chat_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'services',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('price', sa.Numeric(10, 2), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_services_slug', 'services', ['slug'], unique=True)

    op.create_table(
        'availability_schedules',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('doctor_id', sa.String(length=36), sa.ForeignKey('doctor_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('weekday', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('slot_interval_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_availability_schedules_doctor_id', 'availability_schedules', ['doctor_id'], unique=False)
    op.create_index('ix_availability_schedules_weekday', 'availability_schedules', ['weekday'], unique=False)

    op.create_table(
        'appointments',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('patient_id', sa.String(length=36), sa.ForeignKey('patient_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('doctor_id', sa.String(length=36), sa.ForeignKey('doctor_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_id', sa.String(length=36), sa.ForeignKey('services.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('status', appointment_status, nullable=False, server_default='new'),
        sa.Column('start_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('source_channel', sa.String(length=100), nullable=False, server_default='website'),
        sa.Column('issue_summary', sa.Text(), nullable=True),
        sa.Column('issue_classification', sa.String(length=100), nullable=True),
        sa.Column('canceled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rescheduled_from_appointment_id', sa.String(length=36), sa.ForeignKey('appointments.id', ondelete='SET NULL')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_appointments_patient_id', 'appointments', ['patient_id'], unique=False)
    op.create_index('ix_appointments_doctor_id', 'appointments', ['doctor_id'], unique=False)
    op.create_index('ix_appointments_start_at', 'appointments', ['start_at'], unique=False)
    op.create_index('ix_appointments_status', 'appointments', ['status'], unique=False)

    op.create_table(
        'appointment_notes',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('appointment_id', sa.String(length=36), sa.ForeignKey('appointments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('doctor_id', sa.String(length=36), sa.ForeignKey('doctor_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('raw_note', sa.Text(), nullable=False),
        sa.Column('formatted_note', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_appointment_notes_appointment_id', 'appointment_notes', ['appointment_id'], unique=False)
    op.create_index('ix_appointment_notes_doctor_id', 'appointment_notes', ['doctor_id'], unique=False)

    op.create_table(
        'patient_tags',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('patient_id', sa.String(length=36), sa.ForeignKey('patient_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tag', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_patient_tags_patient_id', 'patient_tags', ['patient_id'], unique=False)

    op.create_table(
        'patient_internal_notes',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('patient_id', sa.String(length=36), sa.ForeignKey('patient_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('admin_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('note', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_patient_internal_notes_patient_id', 'patient_internal_notes', ['patient_id'], unique=False)

    op.create_table(
        'notification_logs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('appointment_id', sa.String(length=36), sa.ForeignKey('appointments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('patient_id', sa.String(length=36), sa.ForeignKey('patient_profiles.id', ondelete='SET NULL'), nullable=True),
        sa.Column('channel', notification_channel, nullable=False),
        sa.Column('event_type', notification_event_type, nullable=False),
        sa.Column('delivery_status', notification_delivery_status, nullable=False),
        sa.Column('provider_response', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_notification_logs_appointment_id', 'notification_logs', ['appointment_id'], unique=False)
    op.create_index('ix_notification_logs_patient_id', 'notification_logs', ['patient_id'], unique=False)
    op.create_index('ix_notification_logs_event_type', 'notification_logs', ['event_type'], unique=False)

    op.create_table(
        'ai_request_logs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('patient_id', sa.String(length=36), sa.ForeignKey('patient_profiles.id', ondelete='SET NULL'), nullable=True),
        sa.Column('appointment_id', sa.String(length=36), sa.ForeignKey('appointments.id', ondelete='SET NULL'), nullable=True),
        sa.Column('feature', ai_request_feature, nullable=False),
        sa.Column('input_text', sa.Text(), nullable=False),
        sa.Column('output_text', sa.Text(), nullable=True),
        sa.Column('status', ai_request_status, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_ai_request_logs_patient_id', 'ai_request_logs', ['patient_id'], unique=False)
    op.create_index('ix_ai_request_logs_appointment_id', 'ai_request_logs', ['appointment_id'], unique=False)
    op.create_index('ix_ai_request_logs_feature', 'ai_request_logs', ['feature'], unique=False)


def downgrade() -> None:
    op.drop_table('ai_request_logs')
    op.drop_table('notification_logs')
    op.drop_table('patient_internal_notes')
    op.drop_table('patient_tags')
    op.drop_table('appointment_notes')
    op.drop_table('appointments')
    op.drop_table('availability_schedules')
    op.drop_table('services')
    op.drop_table('patient_profiles')
    op.drop_table('doctor_profiles')
    op.drop_table('users')

    bind = op.get_bind()
    ai_request_status.drop(bind, checkfirst=True)
    ai_request_feature.drop(bind, checkfirst=True)
    notification_delivery_status.drop(bind, checkfirst=True)
    notification_event_type.drop(bind, checkfirst=True)
    notification_channel.drop(bind, checkfirst=True)
    follow_up_status.drop(bind, checkfirst=True)
    appointment_status.drop(bind, checkfirst=True)
    user_role.drop(bind, checkfirst=True)
