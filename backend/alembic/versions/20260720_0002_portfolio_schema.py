"""portfolio redesign schema

Revision ID: 20260720_0002
Revises: 20260423_0001
"""

from alembic import op
import sqlalchemy as sa


revision = '20260720_0002'
down_revision = '20260423_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('doctor_profiles', sa.Column('slug', sa.String(length=255), nullable=True))
    op.add_column('appointments', sa.Column('reference_code', sa.String(length=16), nullable=True))
    op.add_column('appointments', sa.Column('cancellation_reason', sa.String(length=500), nullable=True))
    op.create_table(
        'doctor_services',
        sa.Column('doctor_id', sa.String(length=36), nullable=False),
        sa.Column('service_id', sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(['doctor_id'], ['doctor_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('doctor_id', 'service_id'),
    )


def downgrade() -> None:
    op.drop_table('doctor_services')
    op.drop_column('appointments', 'cancellation_reason')
    op.drop_column('appointments', 'reference_code')
    op.drop_column('doctor_profiles', 'slug')
