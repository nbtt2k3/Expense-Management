import pytest
from httpx import AsyncClient

# supabase_service is mocked globally in conftest.py

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    response = await client.post(
        "/auth/register",
        json={"email": "test@example.com", "password": "password123", "full_name": "Test User"},
    )
    # Debug info if fails
    if response.status_code != 201:
        print(f"Failed Register: {response.text}")
        
    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "User registered. Please verify your email with the OTP sent."

@pytest.mark.asyncio
async def test_login_user(client: AsyncClient):
    # Register first (mocked service will return success)
    await client.post(
        "/auth/register",
        json={"email": "login@example.com", "password": "password123", "full_name": "Login User"},
    )
    
    # Verify OTP to create local user (needed for login check in some flows, but auth.login calls supabase directly)
    # But wait, auth/login calls supabase_service.sign_in
    # Supabase mock returns session.
    # So login should work.
    
    response = await client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "password123"},
    )
    if response.status_code != 200:
        print(f"Failed Login: {response.text}")

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
