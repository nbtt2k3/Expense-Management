from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter(tags=["Health"])

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Health Check Endpoint
    Checks if the API is running and if the database is accessible.
    """
    try:
        # Check DB connection
        await db.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": "connected",
            "app": "Expense Management API"
        }
    except Exception as e:
        return {
            "status": "error",
            "database": "disconnected",
            "detail": str(e)
        }
