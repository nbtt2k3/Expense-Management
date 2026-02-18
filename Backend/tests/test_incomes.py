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
async def test_create_income(client: AsyncClient, auth_headers):
    # Create an income category first
    cat_res = await client.post(
        "/expenses/categories",
        json={"name": "Salary", "type": "income"},
        headers=auth_headers
    )
    assert cat_res.status_code == 201
    category_id = cat_res.json()["id"]

    response = await client.post(
        "/incomes/",
        json={
            "amount": 5000.0,
            "source": "Monthly Salary",
            "description": "February salary",
            "date": "2024-02-01T09:00:00",
            "category_id": category_id
        },
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert float(data["amount"]) == 5000.0
    assert data["source"] == "Monthly Salary"

@pytest.mark.asyncio
async def test_list_incomes(client: AsyncClient, auth_headers):
    response = await client.get("/incomes/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "total" in data
    assert "page" in data

@pytest.mark.asyncio
async def test_create_income_without_category(client: AsyncClient, auth_headers):
    response = await client.post(
        "/incomes/",
        json={
            "amount": 200.0,
            "source": "Freelance",
            "description": "Side project",
            "date": "2024-02-15T10:00:00"
        },
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert float(data["amount"]) == 200.0
    assert data["source"] == "Freelance"

@pytest.mark.asyncio
async def test_income_invalid_amount(client: AsyncClient, auth_headers):
    response = await client.post(
        "/incomes/",
        json={
            "amount": -100.0,
            "source": "Bad Income",
            "date": "2024-02-01T09:00:00"
        },
        headers=auth_headers
    )
    assert response.status_code == 422  # Validation error
