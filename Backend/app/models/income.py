from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base import Base

class Income(Base):
    __tablename__ = "incomes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False) # Precision 10, scale 2 for currency
    source = Column(String, nullable=False) # e.g. Salary, Freelance, Gift - Keep for history or migration
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True) # Nullable for migration
    description = Column(String, nullable=True)
    description = Column(String, nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="incomes")
    category = relationship("Category")
