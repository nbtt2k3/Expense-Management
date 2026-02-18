import asyncio
import sys
import os
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.future import select
from sqlalchemy import func

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.db.session import AsyncSessionLocal
from app.models.expense import Expense
from app.models.user import User
from app.models.category import Category
from app.models.income import Income
from app.models.budget import Budget

async def main():
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    async with AsyncSessionLocal() as db:
        with open("verification_log.txt", "w") as f:
            f.write("Connected to DB.\n")
            
            # 1. Check if 'date' column exists and is populated
            try:
                result = await db.execute(select(Expense).limit(1))
                expense = result.scalars().first()
                if expense:
                    f.write(f"Found expense ID: {expense.id}\n")
                    f.write(f"Date: {expense.date}\n")
                    f.write(f"Created At: {expense.created_at}\n")
                    if expense.date:
                        f.write("PASS: Date field is populated.\n")
                    else:
                        f.write("FAIL: Date field is None (should not happen if backfilled).\n")
                else:
                    f.write("No expenses found. Skipping backfill check.\n")
            except Exception as e:
                f.write(f"FAIL: Error accessing date field: {e}\n")
                return

            # 2. Insert a new expense with a past date
            # We need a user and category first.
            try:
                user_result = await db.execute(select(User).limit(1))
                user = user_result.scalars().first()
                
                cat_result = await db.execute(select(Category).limit(1))
                category = cat_result.scalars().first()
                
                if not user:
                    f.write("Creating dummy user...\n")
                    user = User(email="test@example.com", full_name="Test User", id=uuid.uuid4())
                    db.add(user)
                    await db.commit()
                    await db.refresh(user)

                if not category:
                    f.write("Creating dummy category...\n")
                    category = Category(name="Test Category", user_id=user.id, id=1) # id=1 for simplicity
                    db.add(category)
                    await db.commit()
                    await db.refresh(category)
                
                past_date = datetime.now() - timedelta(days=10)
                f.write(f"Inserting new expense with date: {past_date}\n")
                
                new_expense = Expense(
                    user_id=user.id,
                    amount=Decimal("123.45"),
                    category_id=category.id,
                    description="Test Past Date Verification",
                    date=past_date
                )
                db.add(new_expense)
                await db.commit()
                await db.refresh(new_expense)
                
                f.write(f"Inserted Expense ID: {new_expense.id}\n")
                f.write(f"Stored Date: {new_expense.date}\n")
                
                if new_expense.date.date() == past_date.date():
                     f.write("PASS: Date stored correctly.\n")
                else:
                     f.write("FAIL: Date mismatch.\n")

                # 3. Clean up
                await db.delete(new_expense)
                await db.commit()
                f.write("Test expense deleted.\n")
            except Exception as e:
                f.write(f"FAIL: Error during insertion test: {e}\n")

if __name__ == "__main__":
    asyncio.run(main())
