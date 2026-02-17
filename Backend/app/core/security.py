from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import TokenData
from app.services.supabase_service import supabase_service

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)):
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        user_response = supabase_service.get_user(token)
        if not user_response.user:
            raise credentials_exception
        email = user_response.user.email
        token_data = TokenData(email=email)
    except Exception:
        raise credentials_exception

    result = await db.execute(select(User).where(User.email == token_data.email))
    user = result.scalars().first()
    if user is None:
            # If user is in Supabase but not in local DB, we might want to create them or raise error. 
            # For now, let's assuming they should be in local DB if they verified properly
            raise credentials_exception
    return user
