from pydantic import BaseModel
from typing import List
from decimal import Decimal

class CategoryBreakdownItem(BaseModel):
    category_name: str
    total_amount: Decimal
    percentage: float

class MonthlyTrendItem(BaseModel):
    month: str # "2024-01"
    expense: Decimal
    income: Decimal

class AnalyticsResponse(BaseModel):
    category_breakdown: List[CategoryBreakdownItem]
    monthly_trend: List[MonthlyTrendItem]
