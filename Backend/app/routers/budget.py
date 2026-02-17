from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime
from decimal import Decimal

from app.db.session import get_db
from app.models.budget import Budget
from app.models.expense import Expense
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetResponse, BudgetStatusResponse
from app.core.security import get_current_user

router = APIRouter(prefix="/budgets", tags=["Budgets"])

@router.post("/", response_model=BudgetResponse)
async def create_or_update_budget(
    budget_in: BudgetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if budget exists for this month/year
    result = await db.execute(
        select(Budget).where(
            Budget.user_id == current_user.id,
            Budget.month == budget_in.month,
            Budget.year == budget_in.year
        )
    )
    existing_budget = result.scalars().first()

    if existing_budget:
        existing_budget.amount = budget_in.amount
        await db.commit()
        await db.refresh(existing_budget)
        return existing_budget
    else:
        new_budget = Budget(
            user_id=current_user.id,
            amount=budget_in.amount,
            month=budget_in.month,
            year=budget_in.year
        )
        db.add(new_budget)
        await db.commit()
        await db.refresh(new_budget)
        return new_budget

@router.get("/current", response_model=BudgetStatusResponse)
async def get_current_budget_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.now()
    current_month = today.month
    current_year = today.year

    # Get Budget
    result = await db.execute(
        select(Budget).where(
            Budget.user_id == current_user.id,
            Budget.month == current_month,
            Budget.year == current_year
        )
    )
    budget = result.scalars().first()

    if not budget:
        # No budget set for this month
        return {
            "budget": 0,
            "spent": 0,
            "remaining": 0,
            "percent_used": 0
        }

    # Calculate Spent
    start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Simple sum aggregation
    spent_query = select(func.sum(Expense.amount)).where(
        Expense.user_id == current_user.id,
        Expense.created_at >= start_of_month,
        Expense.is_deleted == False
    )
    spent_result = await db.execute(spent_query)
    spent = spent_result.scalar() or Decimal(0)

    remaining = budget.amount - spent
    percent_used = (spent / budget.amount) * 100 if budget.amount > 0 else 0

    return {
        "budget": budget.amount,
        "spent": spent,
        "remaining": remaining,
        "percent_used": round(percent_used, 2)
    }
