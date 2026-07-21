"""backfill portfolio identifiers and doctor services

Revision ID: 20260720_0003
Revises: 20260720_0002
"""

import re
import secrets

from alembic import op
import sqlalchemy as sa


revision = '20260720_0003'
down_revision = '20260720_0002'
branch_labels = None
depends_on = None


def _slugify(value: str) -> str:
    value = re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')
    return value.removeprefix('dr-') or f'doctor-{secrets.token_hex(4)}'


def upgrade() -> None:
    bind = op.get_bind()
    doctors = bind.execute(
        sa.text(
            'SELECT doctor_profiles.id, users.full_name '
            'FROM doctor_profiles JOIN users ON users.id = doctor_profiles.user_id'
        )
    ).mappings()
    used_slugs: set[str] = set()
    for doctor in doctors:
        base = _slugify(doctor['full_name'])
        slug = base
        suffix = 2
        while slug in used_slugs:
            slug = f'{base}-{suffix}'
            suffix += 1
        used_slugs.add(slug)
        bind.execute(
            sa.text('UPDATE doctor_profiles SET slug = :slug WHERE id = :doctor_id'),
            {'slug': slug, 'doctor_id': doctor['id']},
        )

    appointment_ids = bind.execute(sa.text('SELECT id FROM appointments')).scalars()
    for appointment_id in appointment_ids:
        bind.execute(
            sa.text('UPDATE appointments SET reference_code = :code WHERE id = :appointment_id'),
            {'code': f'AET-{secrets.token_hex(3).upper()}', 'appointment_id': appointment_id},
        )

    mappings = {
        'Dr. Amelia Smith': ('General Consultation', 'Full Annual Checkup'),
        'Dr. Farid Khan': ('Cardiology Follow-Up',),
    }
    for doctor_name, service_names in mappings.items():
        doctor_id = bind.execute(
            sa.text(
                'SELECT doctor_profiles.id FROM doctor_profiles '
                'JOIN users ON users.id = doctor_profiles.user_id WHERE users.full_name = :name'
            ),
            {'name': doctor_name},
        ).scalar_one_or_none()
        if not doctor_id:
            continue
        for service_name in service_names:
            service_id = bind.execute(
                sa.text('SELECT id FROM services WHERE name = :name'), {'name': service_name}
            ).scalar_one_or_none()
            if service_id:
                bind.execute(
                    sa.text(
                        'INSERT INTO doctor_services (doctor_id, service_id) '
                        'VALUES (:doctor_id, :service_id)'
                    ),
                    {'doctor_id': doctor_id, 'service_id': service_id},
                )

    with op.batch_alter_table('doctor_profiles') as batch_op:
        batch_op.alter_column('slug', existing_type=sa.String(length=255), nullable=False)
        batch_op.create_index('ix_doctor_profiles_slug', ['slug'], unique=True)
    with op.batch_alter_table('appointments') as batch_op:
        batch_op.alter_column('reference_code', existing_type=sa.String(length=16), nullable=False)
        batch_op.create_index('ix_appointments_reference_code', ['reference_code'], unique=True)


def downgrade() -> None:
    with op.batch_alter_table('appointments') as batch_op:
        batch_op.drop_index('ix_appointments_reference_code')
        batch_op.alter_column('reference_code', existing_type=sa.String(length=16), nullable=True)
    with op.batch_alter_table('doctor_profiles') as batch_op:
        batch_op.drop_index('ix_doctor_profiles_slug')
        batch_op.alter_column('slug', existing_type=sa.String(length=255), nullable=True)
    op.execute(sa.text('DELETE FROM doctor_services'))
