from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    LOG_LEVEL: str = "INFO"
    BACKEND_CORS_ORIGINS: list[str] = ["*"]
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "Expense Manager <onboarding@resend.dev>"
    GOOGLE_CLIENT_ID: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
