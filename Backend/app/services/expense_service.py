from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, asc
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.models.expense import Expense

class ExpenseService:
    def _apply_filters(self, query, start_date, end_date, category_id, search):
        if start_date:
            query = query.where(Expense.created_at >= start_date)
        
        if end_date:
            query = query.where(Expense.created_at <= end_date)
            
        if category_id:
            query = query.where(Expense.category_id == category_id)
            
        if search:
            query = query.where(Expense.description.ilike(f"%{search}%"))
        return query

    async def get_expenses_with_filters(
        self,
        db: AsyncSession,
        user_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        category_id: Optional[int] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
        sort: str = "date_desc"
    ):
        query = select(Expense).where(Expense.user_id == user_id, Expense.is_deleted == False)

        # Apply Filters
        query = self._apply_filters(query, start_date, end_date, category_id, search)

        # Sort
        if sort == "amount_asc":
            query = query.order_by(asc(Expense.amount))
        elif sort == "amount_desc":
            query = query.order_by(desc(Expense.amount))
        elif sort == "date_asc":
            query = query.order_by(asc(Expense.created_at))
        else: # default date_desc
            query = query.order_by(desc(Expense.created_at))

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        # Pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)

        result = await db.execute(query)
        expenses = result.scalars().all()

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": expenses
        }

    async def export_expenses_to_csv(
        self,
        db: AsyncSession,
        user_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        category_id: Optional[int] = None,
        search: Optional[str] = None
    ):
        import csv
        import io
        from app.models.category import Category

        # Join with Category to get names
        query = select(Expense).join(Category).where(Expense.user_id == user_id, Expense.is_deleted == False)
        
        # Apply reusing filters
        query = self._apply_filters(query, start_date, end_date, category_id, search)
        
        # Order by date desc
        query = query.order_by(desc(Expense.created_at))
        
        result = await db.execute(query)
        expenses = result.scalars().all()
        
        # Generator for StreamingResponse
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write Header
        writer.writerow(['Date', 'Category', 'Amount', 'Description', 'Created At'])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)
        
        for expense in expenses:
            writer.writerow([
                expense.created_at.strftime("%Y-%m-%d"),
                expense.category.name,
                f"{expense.amount:.2f}",
                expense.description or "",
                expense.created_at.strftime("%Y-%m-%d %H:%M:%S")
            ])
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    async def get_analytics_data(self, db: AsyncSession, user_id: UUID):
        from app.models.category import Category
        
        today = datetime.now()
        start_of_year = today.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # 1. Category Breakdown (Current Year)
        # Group by Category Name
        cat_query = select(
            Category.name, 
            func.sum(Expense.amount).label("total")
        ).join(Expense).where(
            Expense.user_id == user_id,
            Expense.is_deleted == False,
            Expense.created_at >= start_of_year
        ).group_by(Category.name)
        
        cat_result = await db.execute(cat_query)
        categories_data = cat_result.all()
        
        total_year_expense = sum([row.total for row in categories_data]) or 1 # Avoid division by zero
        
        category_breakdown = []
        for row in categories_data:
            percentage = (row.total / total_year_expense) * 100
            category_breakdown.append({
                "category_name": row.name,
                "total_amount": row.total,
                "percentage": round(percentage, 2)
            })
            
        # 2. Monthly Trend (Last 6 Months or Current Year)
        # We'll do Current Year for simplicity
        
        # Postgres date_trunc
        trend_query = select(
            func.to_char(Expense.created_at, 'YYYY-MM').label("month"),
            func.sum(Expense.amount).label("total")
        ).where(
            Expense.user_id == user_id,
            Expense.is_deleted == False,
            Expense.created_at >= start_of_year
        ).group_by("month").order_by("month")
        
        trend_result = await db.execute(trend_query)
        monthly_trend = [
            {"month": row.month, "total_amount": row.total}
            for row in trend_result
        ]
        
        return {
            "category_breakdown": category_breakdown,
            "monthly_trend": monthly_trend
        }



    async def get_monthly_summary(self, db: AsyncSession, user_id: UUID):
        today = datetime.now()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        start_of_year = today.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        start_of_day = today.replace(hour=0, minute=0, second=0, microsecond=0)

        # 1. Total Expenses
        async def get_total(start_date):
            query = select(func.sum(Expense.amount)).where(
                Expense.user_id == user_id,
                Expense.created_at >= start_date,
                Expense.is_deleted == False
            )
            result = await db.execute(query)
            return result.scalar() or 0

        total_month = await get_total(start_of_month)
        total_year = await get_total(start_of_year)
        total_today = await get_total(start_of_day)

        # 2. Total by Category (Current Month)
        from app.models.category import Category
        category_query = select(
            Expense.category_id,
            Category.name,
            func.sum(Expense.amount).label("total")
        ).join(Category).where(
            Expense.user_id == user_id,
            Expense.created_at >= start_of_month,
            Expense.is_deleted == False
        ).group_by(Expense.category_id, Category.name)
        
        category_result = await db.execute(category_query)
        by_category = [
            {"category_id": row.category_id, "category_name": row.name, "total": row.total}
            for row in category_result
        ]

        # 3. Daily Spending (Current Month)
        # Note: truncating to day might depend on DB dialect, assuming accessible here or simplified
        daily_query = select(
            func.date_trunc('day', Expense.created_at).label("date"),
            func.sum(Expense.amount).label("total")
        ).where(
            Expense.user_id == user_id,
            Expense.created_at >= start_of_month,
            Expense.is_deleted == False
        ).group_by("date").order_by("date")

        daily_result = await db.execute(daily_query)
        daily = [
            {"date": row.date, "total": row.total}
            for row in daily_result
        ]

        # 4. Total Income & Balance
        from app.models.income import Income
        
        async def get_total_income(start_date):
            query = select(func.sum(Income.amount)).where(
                Income.user_id == user_id,
                Income.date >= start_date
            )
            result = await db.execute(query)
            return result.scalar() or 0

        total_income_month = await get_total_income(start_of_month)
        balance = total_income_month - total_month

        return {
            "total_month": total_month,
            "total_today": total_today,
            "total_year": total_year,
            "total_income_month": total_income_month,
            "balance": balance,
            "by_category": by_category,
            "daily": daily
        }

expense_service = ExpenseService()
