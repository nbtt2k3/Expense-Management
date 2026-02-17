from pydantic import BaseModel, field_validator
from decimal import Decimal
from typing import Optional

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
    pass

class BudgetResponse(BudgetBase):
    pass

class BudgetStatusResponse(BaseModel):
    budget: Decimal
    spent: Decimal
    remaining: Decimal
    percent_used: float
