from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, expense, budget, health, income
from app.middleware.logging_middleware import LoggingMiddleware
from app.core.config import settings

description = """
Expense Management API helps you track your expenses easily.

## Features

* **Users** (_implemented_): Register and Login users.
* **Expenses** (_implemented_): Create, Read, Delete expenses.
"""

tags_metadata = [
    {
        "name": "Auth",
        "description": "Operations with users. The **login** logic is also here.",
    },
    {
        "name": "Expenses",
        "description": "Manage expenses. So _fancy_ they have their own docs.",
    },
    {
        "name": "Incomes",
        "description": "Track your income sources.",
    },
    {
        "name": "Budgets",
        "description": "Set monthly budgets and track your spending progress.",
    },
    {
        "name": "Health",
        "description": "Check if the API and Database are alive.",
    },
]

app = FastAPI(
    title="Expense Management API",
    description=description,
    version="1.0.0",
    openapi_tags=tags_metadata
)

# Logging Middleware
app.add_middleware(LoggingMiddleware)

# CORS Configuration
origins = settings.BACKEND_CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.limiter import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Security Middleware
from app.middleware.security import SecurityMiddleware
app.add_middleware(SecurityMiddleware)

# Exception Handlers
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.exceptions import CustomException
from app.core.handlers import (
    custom_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    global_exception_handler
)

app.add_exception_handler(CustomException, custom_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

app.include_router(auth.router)
app.include_router(expense.router)
app.include_router(budget.router)
app.include_router(health.router)
app.include_router(income.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Expense Management API"}
