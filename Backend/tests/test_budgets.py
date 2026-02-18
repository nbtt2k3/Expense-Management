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
async def test_create_budget(client: AsyncClient, auth_headers):
    response = await client.post(
        "/budgets/",
        json={
            "amount": 1000.0,
            "month": 1,
            "year": 2024
        },
        headers=auth_headers
    )
    # Budget endpoint uses create_or_update (upsert), returns 200
    assert response.status_code == 200
    data = response.json()
    assert Decimal(data["amount"]) == Decimal("1000.00")
    assert data["category_id"] is None  # Global budget

@pytest.mark.asyncio
async def test_budget_progress(client: AsyncClient, auth_headers):
    # Create Budget
    await client.post(
        "/budgets/",
        json={"amount": 500.0, "month": 1, "year": 2024},
        headers=auth_headers
    )
    
    # Create category for expense
    cat_res = await client.post(
        "/expenses/categories",
        json={"name": "Budget Test Cat", "type": "expense"},
        headers=auth_headers
    )
    category_id = cat_res.json()["id"]

    # Create Expense
    await client.post(
        "/expenses/",
        json={
            "amount": 100.0,
            "description": "Test Expense",
            "category_id": category_id,
            "date": "2024-01-15T10:00:00"
        },
        headers=auth_headers
    )

    # Check Progress - returns List[BudgetStatusResponse]
    response = await client.get("/budgets/progress?month=1&year=2024", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    # BudgetStatusResponse has flat structure: category_id, category_name, budget, spent, remaining, percent_used
    global_budget = next((b for b in data if b["category_id"] is None), None)
    assert global_budget is not None
    assert Decimal(global_budget["spent"]) == Decimal("100.00")
    assert global_budget["percent_used"] == 20.0
