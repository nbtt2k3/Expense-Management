"""Add is_default to categories

Revision ID: c1a2b3d4e5f6
Revises: 34910275cc25
Create Date: 2026-02-20 20:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '8d28391401b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add is_default column with default False
    op.add_column('categories', sa.Column('is_default', sa.Boolean(), nullable=True))
    
    # Backfill: mark existing default categories (by name) as is_default=True
    default_names = ['Food', 'Transport', 'Bills', 'Entertainment', 'Shopping']
    for name in default_names:
        op.execute(
            f"UPDATE categories SET is_default = true WHERE name = '{name}'"
        )
    
    # Set remaining to false
    op.execute("UPDATE categories SET is_default = false WHERE is_default IS NULL")
    
    # Make column NOT NULL
    op.alter_column('categories', 'is_default', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('categories', 'is_default')
