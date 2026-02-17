from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime
from uuid import UUID

from app.db.session import get_db
from app.services.supabase_service import supabase_service
from app.services.income_service import income_service
from app.schemas.income import IncomeCreate, IncomeUpdate, IncomeResponse, IncomeListResponse
from app.core.exceptions import UnauthorizedException
from app.models.user import User

router = APIRouter(prefix="/incomes", tags=["Incomes"])

async def get_current_user_id(token: str = Depends(supabase_service.oauth2_scheme), db: AsyncSession = Depends(get_db)) -> UUID:
    user_response = supabase_service.get_user(token)
    if not user_response.user:
        raise UnauthorizedException(message="Invalid token")
    return UUID(user_response.user.id)

@router.post("/", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
async def create_income(
    income: IncomeCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    return await income_service.create_income(db, income, user_id)

@router.get("/", response_model=IncomeListResponse)
async def get_incomes(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    return await income_service.get_incomes(db, user_id, start_date, end_date, page, limit)

@router.get("/{id}", response_model=IncomeResponse)
async def get_income(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    return await income_service.get_income(db, id, user_id)

@router.put("/{id}", response_model=IncomeResponse)
async def update_income(
    id: UUID,
    income_data: IncomeUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    return await income_service.update_income(db, id, income_data, user_id)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_income(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    await income_service.delete_income(db, id, user_id)
