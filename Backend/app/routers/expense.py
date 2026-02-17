from fastapi import APIRouter, Depends, HTTPException, status
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
    new_category = Category(name=category.name, user_id=current_user.id)
    db.add(new_category)
    await db.commit()
    await db.refresh(new_category)
    return new_category

@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Category).where(Category.user_id == current_user.id))
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

@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_expense = Expense(
        **expense.dict(),
        user_id=current_user.id
    )
    db.add(new_expense)
    await db.commit()
    await db.refresh(new_expense)
    return new_expense

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

    update_data = expense_update.dict(exclude_unset=True)
    
    # Map 'date' from schema to 'created_at' in model if present
    if "date" in update_data:
        update_data["created_at"] = update_data.pop("date")

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
