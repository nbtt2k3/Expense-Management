from sqlalchemy import Column, Integer, Numeric, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "month", "year", name="uq_budget_user_month_year"),
        Index("ix_budget_user_month_year", "user_id", "month", "year"),
    )
