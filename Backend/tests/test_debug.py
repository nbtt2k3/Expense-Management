import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_debug_routes(client: AsyncClient):
    print("\nRoutes:")
    for route in app.routes:
        print(f"{route.path} {route.name}")
    
    response = await client.get("/")
    print(f"Root response: {response.status_code}")
    assert response.status_code == 200
