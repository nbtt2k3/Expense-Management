from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(UserLogin):
    full_name: Optional[str] = None

class OTPVerify(BaseModel):
    email: EmailStr
    token: str
    type: str = "signup"

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None

class TokenData(BaseModel):
    email: Optional[str] = None

class ResendOTP(BaseModel):
    email: EmailStr
    type: str = "signup"

class TokenRefresh(BaseModel):
    refresh_token: str

class UserForgotPassword(BaseModel):
    email: EmailStr

class UserResetPassword(BaseModel):
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
