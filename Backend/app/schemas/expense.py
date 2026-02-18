from pydantic import BaseModel, field_validator, ConfigDict
from decimal import Decimal
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class ExpenseBase(BaseModel):
    amount: Decimal
    description: Optional[str] = None
    category_id: int

    @field_validator('amount')
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than 0')
        return v

    @field_validator('description')
    def description_max_length(cls, v):
        if v and len(v) > 255:
            raise ValueError('Description must be less than 255 characters')
        return v

class ExpenseCreate(ExpenseBase):
    date: datetime

class ExpenseResponse(ExpenseBase):
    id: UUID
    user_id: UUID
    date: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    date: Optional[datetime] = None

    @field_validator('amount')
    def amount_must_be_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Amount must be greater than 0')
        return v

    @field_validator('description')
    def description_max_length(cls, v):
        if v and len(v) > 255:
            raise ValueError('Description must be less than 255 characters')
        return v
    
    @field_validator('date')
    def date_cannot_be_future(cls, v):
        if v and v > datetime.now():
            raise ValueError('Date cannot be in the future')
        return v

class PaginatedExpenseResponse(BaseModel):
    total: int
    page: int
    limit: int
    data: List[ExpenseResponse]

class CategorySummary(BaseModel):
    category_id: int
    category_name: str
    total: Decimal

class DailySummary(BaseModel):
    date: datetime
    total: Decimal

class DashboardSummaryResponse(BaseModel):
    total_month: Decimal
    total_today: Decimal
    total_year: Decimal
    by_category: List[CategorySummary]
    daily: List[DailySummary]
