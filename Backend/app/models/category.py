from sqlalchemy import Column, String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, default="expense", nullable=False) # 'income' or 'expense'
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    expenses = relationship("Expense", back_populates="category")
    user = relationship("User", back_populates="categories")

    __table_args__ = (
        UniqueConstraint("name", "user_id", name="uq_category_name_user"),
    )
