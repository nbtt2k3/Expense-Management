import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def wipe_data():
    async with AsyncSessionLocal() as session:
        print("Wiping expenses...")
        await session.execute(text("TRUNCATE TABLE expenses CASCADE"))
        print("Wiping categories...")
        await session.execute(text("TRUNCATE TABLE categories CASCADE"))
        await session.commit()
        print("Data wiped successfully.")

if __name__ == "__main__":
    asyncio.run(wipe_data())
