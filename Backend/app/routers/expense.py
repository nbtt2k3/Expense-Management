from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from app.db.session import get_db
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate, PaginatedExpenseResponse, DashboardSummaryResponse
from app.core.security import get_current_user
from app.services.expense_service import expense_service
from fastapi.responses import StreamingResponse


from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse

router = APIRouter(prefix="/expenses", tags=["Expenses"])

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_category = Category(name=category.name, type=category.type, user_id=current_user.id)
    db.add(new_category)
    await db.commit()
    await db.refresh(new_category)
    return new_category

@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    type: Optional[str] = Query(None, pattern="^(income|expense)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Category).where(Category.user_id == current_user.id)
    if type:
        query = query.where(Category.type == type)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/export")
async def export_expenses(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Stream the CSV response
    return StreamingResponse(
        expense_service.export_expenses_to_csv(
            db, 
            current_user.id, 
            start_date, 
            end_date, 
            category_id, 
            search
        ),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=expenses_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

from app.schemas.analytics import AnalyticsResponse

@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await expense_service.get_analytics_data(db, current_user.id)

@router.get("/", response_model=PaginatedExpenseResponse)
async def get_expenses(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    sort: str = "date_desc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await expense_service.get_expenses_with_filters(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
        search=search,
        page=page,
        limit=limit,
        sort=sort
    )

@router.get("/summary/monthly", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await expense_service.get_monthly_summary(db, current_user.id)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_expense = Expense(
        **expense.model_dump(),
        user_id=current_user.id
    )
    db.add(new_expense)
    await db.commit()
    await db.refresh(new_expense)

    # --- Budget Alert Check ---
    budget_warning = None
    if new_expense.category_id:
        from sqlalchemy import func
        from app.models.budget import Budget
        from decimal import Decimal

        exp_date = new_expense.date or new_expense.created_at
        target_month = exp_date.month
        target_year = exp_date.year

        # Find budget for this category + month
        budget_q = select(Budget).where(
            Budget.user_id == current_user.id,
            Budget.category_id == new_expense.category_id,
            Budget.month == target_month,
            Budget.year == target_year
        )
        budget_result = await db.execute(budget_q)
        budget = budget_result.scalars().first()

        if budget:
            # Sum all expenses for this category in this month
            start_date = datetime(target_year, target_month, 1)
            if target_month == 12:
                end_date = datetime(target_year + 1, 1, 1)
            else:
                end_date = datetime(target_year, target_month + 1, 1)

            spent_q = select(func.sum(Expense.amount)).where(
                Expense.user_id == current_user.id,
                Expense.category_id == new_expense.category_id,
                Expense.date >= start_date,
                Expense.date < end_date,
                Expense.is_deleted == False
            )
            spent_result = await db.execute(spent_q)
            spent = float(spent_result.scalar() or 0)
            budget_amount = float(budget.amount)

            if budget_amount > 0:
                percent = round((spent / budget_amount) * 100, 1)
                if percent >= 100:
                    budget_warning = f"🚨 Budget exceeded! You've spent {percent}% of your budget."
                elif percent >= 80:
                    budget_warning = f"⚠️ Budget warning: You've used {percent}% of your budget."

    # Build response
    response_data = ExpenseResponse.model_validate(new_expense).model_dump(mode='json')
    response_data["budget_warning"] = budget_warning
    from fastapi.responses import JSONResponse
    return JSONResponse(content=response_data, status_code=201)

@router.put("/{id}", response_model=ExpenseResponse)
async def update_expense(
    id: UUID,
    expense_update: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Expense).where(Expense.id == id))
    expense = result.scalars().first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this expense")

    update_data = expense_update.model_dump(exclude_unset=True)
    
    # Map 'date' from schema to 'created_at' in model if present


    for key, value in update_data.items():
        setattr(expense, key, value)

    await db.commit()
    await db.refresh(expense)
    return expense

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Expense).where(Expense.id == id, Expense.user_id == current_user.id))
    expense = result.scalars().first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    expense.is_deleted = True
    await db.commit()
    return None

@router.patch("/{id}/restore", response_model=ExpenseResponse)
async def restore_expense(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Expense).where(Expense.id == id, Expense.user_id == current_user.id))
    expense = result.scalars().first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    expense.is_deleted = False
    await db.commit()
    await db.refresh(expense)
    return expense
