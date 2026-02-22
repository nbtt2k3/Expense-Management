from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
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
    # Check if budget exists for this month/year/category
    query = select(Budget).where(
        Budget.user_id == current_user.id,
        Budget.month == budget_in.month,
        Budget.year == budget_in.year
    )
    
    if budget_in.category_id:
        query = query.where(Budget.category_id == budget_in.category_id)
    else:
        query = query.where(Budget.category_id.is_(None))

    result = await db.execute(query)
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
            year=budget_in.year,
            category_id=budget_in.category_id
        )
        db.add(new_budget)
        await db.commit()
        await db.refresh(new_budget)
        return new_budget

@router.get("/progress", response_model=List[BudgetStatusResponse])
async def get_budget_progress(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year
    
    start_date = datetime(target_year, target_month, 1)
    if target_month == 12:
        end_date = datetime(target_year + 1, 1, 1)
    else:
        end_date = datetime(target_year, target_month + 1, 1)

    # 1. Get all budgets for the month
    # We join with Category to get names
    budgets_query = select(Budget).options(
            selectinload(Budget.category)
        ).where(
        Budget.user_id == current_user.id,
        Budget.month == target_month,
        Budget.year == target_year
    )
    budgets_result = await db.execute(budgets_query)
    budgets = budgets_result.scalars().all()

    # 2. Get expenses aggregated by category
    # Global expenses (no category or any category if we want total spend? 
    # Usually "Global Budget" means "Total Budget". 
    # "Category Budget" means "Limit for that category".
    
    # Strategy:
    # For each budget:
    #   if budget.category_id:
    #       sum expenses with that category_id
    #   else (Global):
    #       sum ALL expenses
    
    response = []
    
    for budget in budgets:
        spent_query = select(func.sum(Expense.amount)).where(
            Expense.user_id == current_user.id,
            Expense.date >= start_date,
            Expense.date < end_date,
            Expense.is_deleted == False
        )
        
        category_name = "Global"
        
        if budget.category_id:
            spent_query = spent_query.where(Expense.category_id == budget.category_id)
            category_name = budget.category.name if budget.category else "Unknown"
        
        spent_result = await db.execute(spent_query)
        spent = spent_result.scalar() or Decimal(0)
        
        percent_used = (float(spent) / float(budget.amount)) * 100 if budget.amount > 0 else 0
        
        response.append(BudgetStatusResponse(
            id=budget.id,
            category_id=budget.category_id,
            category_name=category_name,
            budget=budget.amount,
            spent=spent,
            remaining=budget.amount - spent,
            percent_used=round(percent_used, 2)
        ))
        
    return response

@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: int,
    budget_in: BudgetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Budget).where(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    )
    result = await db.execute(query)
    budget = result.scalars().first()

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found or you don't have permission to update it"
        )
    
    # Check if the desired category/month/year already exists for a DIFFERENT budget
    check_query = select(Budget).where(
        Budget.user_id == current_user.id,
        Budget.month == budget_in.month,
        Budget.year == budget_in.year,
        Budget.id != budget_id
    )
    if budget_in.category_id:
        check_query = check_query.where(Budget.category_id == budget_in.category_id)
    else:
        check_query = check_query.where(Budget.category_id.is_(None))
        
    check_result = await db.execute(check_query)
    existing_conflict = check_result.scalars().first()
    
    if existing_conflict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A budget for this category already exists in the selected month."
        )

    budget.amount = budget_in.amount
    budget.category_id = budget_in.category_id
    budget.month = budget_in.month
    budget.year = budget_in.year

    await db.commit()
    await db.refresh(budget)
    return budget

@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Budget).where(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    )
    result = await db.execute(query)
    budget = result.scalars().first()

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found or you don't have permission to delete it"
        )
    
    await db.delete(budget)
    await db.commit()
    return None
