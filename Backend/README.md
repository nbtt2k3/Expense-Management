# Expense Management Backend

FastAPI backend with PostgreSQL, Supabase Auth, and SQLAlchemy.

## Features
- **Authentication**: Email/Password registration with OTP verification via Supabase.
- **Secure**: JWT authentication for protected routes.
- **Database**: PostgreSQL with SQLAlchemy ORM and Alembic migrations.
- **REST API**: Clean architecture with Routers, Controllers (Services), and Schemas.

## Setup

1. **Clone the repository**
2. **Navigate to Backend directory**:
   ```bash
   cd Backend
   ```
3. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```
4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in your values:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname
   JWT_SECRET=your_jwt_secret
   ```
   *Note*: `DATABASE_URL` must be the async connection string (postgresql+asyncpg).

5. **Database Migrations**:
   Initialize the database:
   ```bash
   alembic revision --autogenerate -m "Initial migration"
   alembic upgrade head
   ```

6. **Run the Application**:
   ```bash
   uvicorn app.main:app --reload
   ```

## API Documentation
Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) to view the Swagger UI.

## Endpoints

### Auth
- `POST /auth/register`: Register a new user (triggers OTP).
- `POST /auth/verify-otp`: Verify email with OTP.
- `POST /auth/login`: Login and get access token.

### Expenses
- `GET /expenses`: List my expenses.
- `POST /expenses`: Create a new expense.
- `DELETE /expenses/{id}`: Delete an expense.
