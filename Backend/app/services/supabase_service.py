from supabase import create_client, Client
from app.core.config import settings
from fastapi.security import OAuth2PasswordBearer

class SupabaseService:
    def __init__(self):
        self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        self.oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

    def sign_up(self, email: str, password: str, data: dict = None):
        return self.client.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": data or {}
            }
        })

    def verify_otp(self, email: str, token: str, type: str = "signup"):
        return self.client.auth.verify_otp({
            "email": email,
            "token": token,
            "type": type
        })

    
    def resend_otp(self, email: str, type: str = "signup"):
        return self.client.auth.resend(
            {
                "email": email,
                "type": type
            }
        )
    
    def sign_in(self, email: str, password: str):
        return self.client.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
    
    def get_user(self, access_token: str):
        return self.client.auth.get_user(access_token)

    def refresh_session(self, refresh_token: str):
        return self.client.auth.refresh_session(refresh_token)

    def reset_password_email(self, email: str, redirect_to: str = None):
        return self.client.auth.reset_password_email(email, options={"redirect_to": redirect_to})

    def sign_in_with_otp(self, email: str):
        return self.client.auth.sign_in_with_otp({"email": email})

    def update_user(self, attributes: dict):
        return self.client.auth.update_user(attributes)

supabase_service = SupabaseService()
