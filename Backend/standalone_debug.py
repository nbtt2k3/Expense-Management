import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import get_db
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.base import Base
import sys

import os
db_path = os.path.abspath("test.db")
if os.path.exists(db_path):
    os.remove(db_path)

# Setup DB
SQLALCHEMY_DATABASE_URL = f"sqlite+aiosqlite:///{db_path}"
    
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False, autocommit=False, autoflush=False
)

async def override_get_db():
    async with TestingSessionLocal() as session:
        # Debug check
        try:
            from sqlalchemy.future import select
            res = await session.execute(select(User))
            users = res.scalars().all()
            print(f"DEBUG OVERRIDE: Users: {[u.email for u in users]}")
        except Exception as e:
            print(f"DEBUG OVERRIDE ERROR: {e}")
        yield session

app.dependency_overrides[get_db] = override_get_db

# Import models
from app.models.user import User
from app.models.expense import Expense
from app.models.category import Category
from app.models.income import Income
from app.models.budget import Budget

# Verify OTP mock setup (global patch not active here!)
from unittest.mock import MagicMock, patch
from app.services.supabase_service import supabase_service

mock_user = MagicMock()
mock_user.email = "test@example.com"
mock_user.id = "123e4567-e89b-12d3-a456-426614174000"
mock_user.user_metadata = {"full_name": "Test User"}

mock_session = MagicMock()
mock_session.access_token = "test-token"
mock_session.refresh_token = "test-refresh-token"
mock_session.user = mock_user

supabase_service.sign_up = MagicMock(return_value=MagicMock(user=mock_user, session=None))
supabase_service.sign_in = MagicMock(return_value=MagicMock(session=mock_session, user=mock_user))
supabase_service.verify_otp = MagicMock(return_value=MagicMock(session=mock_session, user=mock_user))
supabase_service.get_user = MagicMock(return_value=MagicMock(user=mock_user))

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("Registering...")
        res = await client.post("/auth/register", json={"email": "test@example.com", "password": "p", "full_name": "u"})
        print(f"Register: {res.status_code}")
        
        print("Verifying OTP...")
        res = await client.post("/auth/verify-otp", json={"email": "test@example.com", "token": "1", "type": "signup"})
        print(f"Verify: {res.status_code} {res.text}")
        
        # Check DB
        async with TestingSessionLocal() as session:
            from sqlalchemy.future import select
            result = await session.execute(select(User))
            users = result.scalars().all()
            print(f"Users in DB: {[u.email for u in users]}")

        print("Logging in...")
        res = await client.post("/auth/login", json={"email": "test@example.com", "password": "p"})
        print(f"Login: {res.status_code}")
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        print("Creating Category...")
        res = await client.post("/expenses/categories", json={"name": "Test Cat", "type": "expense"}, headers=headers)
        print(f"Create Category: {res.status_code} {res.text}")
        if res.status_code == 201:
            cat_id = res.json()["id"]
            
            print("Creating Expense...")
            res = await client.post("/expenses/", json={
                "amount": 100, 
                "description": "desc", 
                "category_id": cat_id,
                "date": "2024-01-01T10:00:00"
            }, headers=headers)
            print(f"Create Expense: {res.status_code} {res.text}")

if __name__ == "__main__":
    asyncio.run(main())
