from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
from datetime import datetime
from uuid import UUID

from app.db.session import get_db
from app.services.income_service import income_service
from app.schemas.income import IncomeCreate, IncomeUpdate, IncomeResponse, IncomeListResponse
from app.models.user import User
from app.models.income import Income
from app.core.security import get_current_user

router = APIRouter(prefix="/incomes", tags=["Incomes"])

@router.post("/", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
async def create_income(
    income: IncomeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # If category_id is provided, verify it belongs to user and is of type 'income'
    if income.category_id:
        from app.models.category import Category
        from sqlalchemy import select
        result = await db.execute(select(Category).where(Category.id == income.category_id, Category.user_id == current_user.id, Category.type == 'income'))
        if not result.scalars().first():
             raise HTTPException(status_code=400, detail="Invalid category. Must be an income category belonging to the user.")

    return await income_service.create_income(db, income, current_user.id)

@router.get("/", response_model=IncomeListResponse)
async def get_incomes(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await income_service.get_incomes(db, current_user.id, start_date, end_date, page, limit)

@router.get("/{id}", response_model=IncomeResponse)
async def get_income(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await income_service.get_income(db, id, current_user.id)

@router.put("/{id}", response_model=IncomeResponse)
async def update_income(
    id: UUID,
    income_data: IncomeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await income_service.update_income(db, id, income_data, current_user.id)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_income(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await income_service.delete_income(db, id, current_user.id)

@router.get("/export/csv")
async def export_incomes_csv(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import csv
    import io
    from fastapi.responses import StreamingResponse

    query = select(Income).where(Income.user_id == current_user.id)
    if start_date:
        query = query.where(Income.date >= start_date)
    if end_date:
        query = query.where(Income.date <= end_date)
    query = query.order_by(Income.date.desc())

    result = await db.execute(query)
    incomes = result.scalars().all()

    def generate():
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Date', 'Source', 'Amount', 'Description', 'Created At'])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        for income in incomes:
            writer.writerow([
                income.date.strftime("%Y-%m-%d"),
                income.source,
                f"{income.amount:.2f}",
                income.description or "",
                income.created_at.strftime("%Y-%m-%d %H:%M:%S")
            ])
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=incomes_export.csv"}
    )

