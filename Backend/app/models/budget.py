from sqlalchemy import Column, Integer, Numeric, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from app.models.category import Category # Import to avoid circular dependency issues if possible, or string reference

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    
    user = relationship("User", back_populates="budgets")
    category = relationship("Category")

    __table_args__ = (
        UniqueConstraint("user_id", "month", "year", "category_id", name="uq_budget_user_month_year_category"),
        Index("ix_budget_user_month_year", "user_id", "month", "year"),
    )
