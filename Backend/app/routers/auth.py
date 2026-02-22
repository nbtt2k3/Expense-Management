import random
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.db.session import get_db
from app.models.user import User
from app.models.otp import OTPCode
from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from app.core.limiter import limiter
from app.services.email_service import send_otp_email
from app.services.category_service import category_service
from app.schemas.auth import (
    UserRegister, UserLogin, Token, OTPVerify,
    TokenRefresh, UserForgotPassword, UserResetPassword, ResendOTP,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


def generate_otp() -> str:
    """Generate a 6-digit OTP code."""
    return "".join(random.choices(string.digits, k=6))


async def create_and_send_otp(
    db: AsyncSession, user_id, email: str, otp_type: str, purpose: str
):
    """Create OTP record and send via email."""
    code = generate_otp()
    otp = OTPCode(
        user_id=user_id,
        code=code,
        type=otp_type,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(otp)
    await db.commit()

    try:
        send_otp_email(email, code, purpose)
    except Exception as e:
        import logging
        logger = logging.getLogger("expense_app")
        logger.warning(f"Failed to send OTP email to {email}: {e}. OTP code: {code}")

    return code


# ─── Register ───────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, user: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user.email))
    existing = result.scalars().first()
    if existing and existing.is_verified:
        raise HTTPException(status_code=400, detail="Email already registered")

    if existing and not existing.is_verified:
        # Re-send OTP for unverified user
        existing.password_hash = hash_password(user.password)
        existing.full_name = user.full_name
        await db.commit()
        await create_and_send_otp(db, existing.id, user.email, "signup", "verify your account")
        return {"message": "OTP sent to your email. Please verify to complete registration."}

    # Create new user (unverified)
    new_user = User(
        email=user.email,
        full_name=user.full_name,
        password_hash=hash_password(user.password),
        auth_provider="email",
        is_verified=False,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Send OTP
    await create_and_send_otp(db, new_user.id, user.email, "signup", "verify your account")

    return {"message": "OTP sent to your email. Please verify to complete registration."}


# ─── Verify OTP ─────────────────────────────────────────────────────

@router.post("/verify-otp")
@limiter.limit("5/minute")
async def verify_otp(request: Request, data: OTPVerify, db: AsyncSession = Depends(get_db)):
    # Find user
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    # Find valid OTP
    otp_result = await db.execute(
        select(OTPCode)
        .where(
            OTPCode.user_id == user.id,
            OTPCode.code == data.token,
            OTPCode.type == data.type,
            OTPCode.used == False,
            OTPCode.expires_at > datetime.now(timezone.utc),
        )
        .order_by(OTPCode.created_at.desc())
    )
    otp = otp_result.scalars().first()
    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Mark OTP as used
    otp.used = True

    # Activate user if signup
    if data.type == "signup":
        user.is_verified = True
        await db.commit()

        # Seed default categories
        await category_service.seed_user_categories(db, user.id)

        return {"message": "Account verified successfully. You can now login."}

    # For reset type, return tokens so user can reset password
    if data.type == "reset":
        await db.commit()
        access_token = create_access_token(data={"sub": user.email})
        refresh_token = create_refresh_token(data={"sub": user.email})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "refresh_token": refresh_token,
        }

    await db.commit()
    return {"message": "OTP verified successfully."}


# ─── Logout ──────────────────────────────────────────────────────────

@router.post("/logout")
async def logout():
    """Logout — stateless JWT, so just acknowledge. Frontend clears tokens."""
    return {"message": "Logged out successfully"}


# ─── Resend OTP ─────────────────────────────────────────────────────

@router.post("/resend-otp")
@limiter.limit("3/minute")
async def resend_otp(request: Request, data: ResendOTP, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    purpose = "verify your account" if data.type == "signup" else "reset your password"
    await create_and_send_otp(db, user.id, data.email, data.type, purpose)
    return {"message": "OTP resent successfully. Check your email."}


# ─── Login ───────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, user: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email))
    db_user = result.scalars().first()

    if not db_user or not db_user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not db_user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email first")

    if not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": db_user.email})
    refresh_token = create_refresh_token(data={"sub": db_user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
    }


# ─── Refresh Token ───────────────────────────────────────────────────

@router.post("/refresh", response_model=Token)
async def refresh_token(data: TokenRefresh):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    new_access = create_access_token(data={"sub": email})
    new_refresh = create_refresh_token(data={"sub": email})

    return {
        "access_token": new_access,
        "token_type": "bearer",
        "refresh_token": new_refresh,
    }


# ─── Forgot Password ─────────────────────────────────────────────────

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
@limiter.limit("3/minute")
async def forgot_password(request: Request, data: UserForgotPassword, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalars().first()

    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If that email exists, an OTP has been sent."}

    await create_and_send_otp(db, user.id, data.email, "reset", "reset your password")
    return {"message": "If that email exists, an OTP has been sent."}


# ─── Reset Password ──────────────────────────────────────────────────

@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    data: UserResetPassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    current_user.password_hash = hash_password(data.password)
    await db.commit()
    return {"message": "Password updated successfully"}


# ─── Google OAuth ─────────────────────────────────────────────────────

class GoogleTokenRequest:
    """Not a Pydantic model — used for clarity."""
    pass

from pydantic import BaseModel

class GoogleAuth(BaseModel):
    id_token: str

@router.post("/google", response_model=Token)
async def google_login(data: GoogleAuth, db: AsyncSession = Depends(get_db)):
    """Verify Google ID token and create/login user."""
    try:
        idinfo = id_token.verify_oauth2_token(
            data.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = idinfo.get("email")
    name = idinfo.get("name")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    # Find or create user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    if not user:
        user = User(
            email=email,
            full_name=name,
            auth_provider="google",
            is_verified=True,  # Google users are pre-verified
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        # Seed default categories
        await category_service.seed_user_categories(db, user.id)

    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
    }
