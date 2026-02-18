
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.main import app
from app.db.session import get_db

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

from sqlalchemy.pool import StaticPool

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

@pytest_asyncio.fixture(autouse=True)
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with engine.begin() as conn:
        # Import models so they are registered with Base.metadata
        from app.models.user import User
        from app.models.expense import Expense
        from app.models.category import Category
        from app.models.income import Income
        from app.models.budget import Budget
        
        await conn.run_sync(Base.metadata.create_all)
        
    # Seed Test User
    async with TestingSessionLocal() as session:
        import uuid
        test_user = User(
            id=uuid.UUID("123e4567-e89b-12d3-a456-426614174000"),
            email="test@example.com",
            full_name="Test User"
        )
        session.add(test_user)
        await session.commit()
        print("DEBUG: Seed User Committed")

    async with TestingSessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    # Create transport for ASGI app
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    del app.dependency_overrides[get_db]

from unittest.mock import MagicMock
from app.services.supabase_service import supabase_service

@pytest.fixture(autouse=True)
def mock_supabase():
    # Mock responses
    mock_user = MagicMock()
    mock_user.email = "test@example.com"
    mock_user.id = "123e4567-e89b-12d3-a456-426614174000"
    mock_user.user_metadata = {"full_name": "Test User"}

    mock_session = MagicMock()
    mock_session.access_token = "test-token"
    mock_session.refresh_token = "test-refresh-token"
    mock_session.user = mock_user

    # Save original methods
    original_sign_up = supabase_service.sign_up
    original_sign_in = supabase_service.sign_in
    original_verify_otp = supabase_service.verify_otp
    original_get_user = supabase_service.get_user

    # Mock methods
    supabase_service.sign_up = MagicMock(return_value=MagicMock(user=mock_user, session=None))
    supabase_service.sign_in = MagicMock(return_value=MagicMock(session=mock_session, user=mock_user))
    supabase_service.verify_otp = MagicMock(return_value=MagicMock(session=mock_session, user=mock_user))
    supabase_service.get_user = MagicMock(return_value=MagicMock(user=mock_user))
    
    yield
    
    # Restore original methods
    supabase_service.sign_up = original_sign_up
    supabase_service.sign_in = original_sign_in
    supabase_service.verify_otp = original_verify_otp
    supabase_service.get_user = original_get_user
