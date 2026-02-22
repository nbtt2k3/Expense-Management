from pydantic import BaseModel, field_validator, ConfigDict
from decimal import Decimal
from typing import Optional, Any

class BudgetBase(BaseModel):
    amount: Decimal
    month: int
    year: int

    @field_validator('amount')
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than 0')
        return v
    
    @field_validator('month')
    def month_must_be_valid(cls, v):
        if not 1 <= v <= 12:
            raise ValueError('Month must be between 1 and 12')
        return v

class BudgetCreate(BudgetBase):
    category_id: Optional[int] = None

class BudgetResponse(BudgetBase):
    id: int
    user_id: Any
    category_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

class BudgetStatusResponse(BaseModel):
    id: Optional[int] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = "Global"
    budget: Decimal
    spent: Decimal
    remaining: Decimal
    percent_used: float

