from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from app.models.category import Category

class CategoryService:
    async def seed_user_categories(self, db: AsyncSession, user_id: UUID):
        default_categories = ["Food", "Transport", "Bills", "Entertainment", "Shopping"]
        
        for name in default_categories:
            # Check if exists (idempotency, though user is new)
            result = await db.execute(select(Category).where(Category.name == name, Category.user_id == user_id))
            if not result.scalars().first():
                new_category = Category(name=name, user_id=user_id)
                db.add(new_category)
        
        await db.commit()

category_service = CategoryService()
