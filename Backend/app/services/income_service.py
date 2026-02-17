from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, asc
from typing import Optional
from datetime import datetime
from uuid import UUID

from app.models.income import Income
from app.schemas.income import IncomeCreate, IncomeUpdate
from app.core.exceptions import NotFoundException, UnauthorizedException

class IncomeService:
    async def create_income(self, db: AsyncSession, income: IncomeCreate, user_id: UUID) -> Income:
        new_income = Income(
            user_id=user_id,
            amount=income.amount,
            source=income.source,
            description=income.description,
            date=income.date
        )
        db.add(new_income)
        await db.commit()
        await db.refresh(new_income)
        return new_income

    async def get_income(self, db: AsyncSession, income_id: UUID, user_id: UUID) -> Income:
        result = await db.execute(select(Income).where(Income.id == income_id, Income.user_id == user_id))
        income = result.scalars().first()
        if not income:
             raise NotFoundException(message="Income not found")
        return income

    async def update_income(self, db: AsyncSession, income_id: UUID, income_data: IncomeUpdate, user_id: UUID) -> Income:
        income = await self.get_income(db, income_id, user_id)
        
        update_data = income_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(income, key, value)
            
        await db.commit()
        await db.refresh(income)
        return income

    async def delete_income(self, db: AsyncSession, income_id: UUID, user_id: UUID):
        income = await self.get_income(db, income_id, user_id)
        await db.delete(income)
        await db.commit()

    async def get_incomes(
        self,
        db: AsyncSession,
        user_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        limit: int = 20
    ):
        query = select(Income).where(Income.user_id == user_id)

        if start_date:
            query = query.where(Income.date >= start_date)
        if end_date:
            query = query.where(Income.date <= end_date)
            
        query = query.order_by(desc(Income.date))

        # Count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        # Pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        result = await db.execute(query)
        incomes = result.scalars().all()

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": incomes
        }

income_service = IncomeService()
