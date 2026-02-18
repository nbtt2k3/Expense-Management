from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from .category import CategoryResponse

class IncomeBase(BaseModel):
    amount: float = Field(..., gt=0, description="Income amount must be positive")
    source: str = Field(..., min_length=1, max_length=100, description="Source of income (e.g., Salary)")
    description: Optional[str] = Field(None, max_length=255)
    date: datetime
    category_id: Optional[int] = None # Optional for now, but UI should enforce it

class IncomeCreate(IncomeBase):
    pass

class IncomeUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    source: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    date: Optional[datetime] = None
    category_id: Optional[int] = None

class IncomeResponse(IncomeBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    category: Optional[CategoryResponse] = None # Include full category details
    
    model_config = ConfigDict(from_attributes=True)

class IncomeListResponse(BaseModel):
    total: int
    page: int
    limit: int
    data: List[IncomeResponse]
