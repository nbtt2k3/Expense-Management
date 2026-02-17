from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.schemas.auth import UserRegister, UserLogin, Token, OTPVerify, TokenRefresh, UserForgotPassword, UserResetPassword, ResendOTP
from app.services.supabase_service import supabase_service
from app.core.config import settings
from app.services.category_service import category_service
from app.db.session import get_db
from app.models.user import User
from app.core.limiter import limiter


router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, user: UserRegister):
    try:
        response = supabase_service.sign_up(user.email, user.password, data={"full_name": user.full_name})
        # Supabase might return user object even if email confirmation is required.
        # We don't create user in local DB yet, wait for OTP verification.
        return {"message": "User registered. Please verify your email with the OTP sent."}
    except Exception as e:
         raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify-otp")
@limiter.limit("5/minute")
async def verify_otp(request: Request, data: OTPVerify, db: AsyncSession = Depends(get_db)):
    try:
        response = supabase_service.verify_otp(data.email, data.token, data.type)
        if response.user:
            # Check if user exists in local DB
            result = await db.execute(select(User).where(User.email == data.email))
            existing_user = result.scalars().first()
            
            if not existing_user:
                new_user = User(
                    id=response.user.id, # Sync UUID from Supabase
                    email=response.user.email,
                    full_name=response.user.user_metadata.get("full_name")
                )
                db.add(new_user)
                await db.commit()
                await db.refresh(new_user)
                
                # Seed default categories
                await category_service.seed_user_categories(db, new_user.id)
            
            return {"message": "OTP verified successfully. You can now login."}
        else:
            raise HTTPException(status_code=400, detail="Invalid OTP")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/resend-otp")
async def resend_otp(data: ResendOTP):
    try:
        response = supabase_service.resend_otp(data.email, data.type)
        return {"message": "OTP resent successfully. Check your email."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ... (existing imports)

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, user: UserLogin):
    try:
        response = supabase_service.sign_in(user.email, user.password)
        if response.session:
            return {
                "access_token": response.session.access_token,
                "token_type": "bearer",
                "refresh_token": response.session.refresh_token
            }
        else:
             raise HTTPException(status_code=401, detail="Login failed")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/refresh", response_model=Token)
async def refresh_token(data: TokenRefresh):
    try:
        response = supabase_service.refresh_session(data.refresh_token)
        if response.session:
             return {
                "access_token": response.session.access_token,
                "token_type": "bearer",
                "refresh_token": response.session.refresh_token
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
@limiter.limit("3/minute")
async def forgot_password(request: Request, data: UserForgotPassword):
    try:
        # Step 1: Send OTP to email
        # We use sign_in_with_otp but functionality is effectively "Check email to login/reset"
        supabase_service.sign_in_with_otp(data.email)
        return {"message": "OTP sent to your email. Please verify to reset password."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify-reset-otp", response_model=Token)
@limiter.limit("5/minute")
async def verify_reset_otp(request: Request, data: OTPVerify):
    try:
        # Step 2: Verify OTP
        # type="email" or "magiclink" depending on how sign_in_with_otp is configured. 
        # Usually "email" for 6-digit code with sign_in_with_otp.
        # Note: We reuse OTPVerify schema but might need to ensure 'type' is correct.
        # For sign_in_with_otp, the type is typically 'email' or 'sms'. 
        
        # We explicitly use 'email' or 'magiclink' based on data.type (default signup) or override.
        # Here we force type to 'email' or 'magiclink' if not provided correctly, but let's trust client or default to 'email' if generic.
        # Actually verify_otp in service passes `data.type`. 
        # If user sends type="signup", it might fail for login OTP.
        # Let's override or use a specific flow.
        
        # NOTE: For password reset via OTP, we often treat it as a "Login" then "Update Password".
        response = supabase_service.verify_otp(data.email, data.token, type="email") 
        
        if response.session:
             return {
                "access_token": response.session.access_token,
                "token_type": "bearer",
                "refresh_token": response.session.refresh_token
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid OTP or expired")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(data: UserResetPassword, user_id: str = Depends(supabase_service.get_user)):
    # Step 3: Update Password (Authenticated)
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
        
    try:
        supabase_service.update_user({"password": data.password})
        return {"message": "Password updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sync", status_code=status.HTTP_200_OK)
async def sync_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(supabase_service.oauth2_scheme)
):
    """
    Sync user from Supabase to local DB.
    Call this after successful login with Google/Facebook/Apple on Frontend.
    """
    try:
        # Get user info from Supabase
        user_response = supabase_service.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        user_data = user_response.user
        
        # Check if user exists in local DB
        result = await db.execute(select(User).where(User.id == user_data.id))
        existing_user = result.scalars().first()
        
        if not existing_user:
            # Create new user
            new_user = User(
                id=user_data.id,
                email=user_data.email,
                full_name=user_data.user_metadata.get("full_name") or user_data.user_metadata.get("name")
            )
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)
            
            # Seed default categories
            await category_service.seed_user_categories(db, new_user.id)
            return {"message": "User synced and created successfully"}
            
        return {"message": "User already exists, sync complete"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
