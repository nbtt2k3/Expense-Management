import pytest
import pytest_asyncio
from httpx import AsyncClient
from decimal import Decimal

from app.core.security import get_current_user
from app.models.user import User
import uuid
from app.main import app

@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient):
    # Override get_current_user for these tests
    mock_user = User(
        id=uuid.UUID("123e4567-e89b-12d3-a456-426614174000"),
        email="test@example.com",
        full_name="Test User"
    )
    async def mock_get_user():
        return mock_user
        
    app.dependency_overrides[get_current_user] = mock_get_user
    yield {"Authorization": "Bearer mock_token"}
    del app.dependency_overrides[get_current_user]

@pytest.mark.asyncio
async def test_create_expense(client: AsyncClient, auth_headers):
    # Create Category first
    cat_res = await client.post(
        "/expenses/categories",
        json={"name": "Test Expense", "type": "expense"},
        headers=auth_headers
    )
    assert cat_res.status_code == 201
    category_id = cat_res.json()["id"]

    response = await client.post(
        "/expenses/",
        json={
            "amount": 50.0,
            "description": "Lunch",
            "category_id": category_id,
            "date": "2024-01-01T12:00:00"
        },
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    # Decimal fields are serialized as strings by Pydantic
    assert Decimal(data["amount"]) == Decimal("50.00")
    assert data["description"] == "Lunch"

@pytest.mark.asyncio
async def test_get_expenses(client: AsyncClient, auth_headers):
    response = await client.get("/expenses/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    # Should be empty initially or 1 if run after create
    assert "data" in data

from sqlalchemy.future import select

@pytest.mark.asyncio
async def test_verify_seed_user(db_session):
    result = await db_session.execute(select(User))
    users = result.scalars().all()
    assert len(users) > 0
    assert users[0].email == "test@example.com"
