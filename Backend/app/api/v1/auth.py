# =============== app/api/v1/auth.py (Updated Version) ===============
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, ValidationError, Field
from app.services.auth_service import get_auth_service, AuthService
from app.schemas.user import UserCreate
from typing import Dict
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=50)  
    last_name: str = Field(..., min_length=1, max_length=50)
    newsletter_subscribed: bool = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    """Google authentication request"""
    token: str = Field(..., description="Google ID token")

@router.post("/register")
async def register(
    user_data: UserRegister,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Register a new user"""
    try:
        logger.info(f"Registration attempt for email: {user_data.email}")
        
        # Convert to UserCreate model
        user_create = UserCreate(
            email=user_data.email,
            password=user_data.password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            newsletter_subscribed=user_data.newsletter_subscribed
        )
        
        user = await auth_service.create_user(user_create)
        tokens = auth_service.create_tokens(user)
        
        logger.info(f"User registered successfully: {user.email}")
        
        return {
            "message": "User registered successfully",
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "auth_provider": user.auth_provider
            },
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "token_type": tokens["token_type"]
        }
        
    except ValidationError as e:
        logger.error(f"Validation error: {e.errors()}")
        error_messages = []
        for error in e.errors():
            field = " -> ".join(str(loc) for loc in error["loc"])
            error_messages.append(f"{field}: {error['msg']}")
        
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="; ".join(error_messages)
        )
    except HTTPException as e:
        logger.error(f"Registration failed: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login")
async def login(
    login_data: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Login user with email/password"""
    try:
        logger.info(f"Login attempt for email: {login_data.email}")
        
        user = await auth_service.authenticate_user(login_data.email, login_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        tokens = auth_service.create_tokens(user)
        
        logger.info(f"User logged in successfully: {user.email}")
        
        return {
            "message": "Login successful",
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "auth_provider": user.auth_provider,
                "picture": getattr(user, 'picture', None)
            },
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "token_type": tokens["token_type"]
        }
        
    except HTTPException as e:
        logger.error(f"Login failed: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/google")
async def google_auth(
    google_data: GoogleAuthRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Authenticate user with Google OAuth token"""
    try:
        logger.info("Google authentication attempt")
        
        user = await auth_service.authenticate_google_user(google_data.token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google authentication failed"
            )
        
        tokens = auth_service.create_tokens(user)
        
        logger.info(f"Google user authenticated successfully: {user.email}")
        
        return {
            "message": "Google authentication successful",
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "auth_provider": user.auth_provider,
                "picture": getattr(user, 'picture', None)
            },
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "token_type": tokens["token_type"]
        }
        
    except HTTPException as e:
        logger.error(f"Google auth failed: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected Google auth error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google authentication failed"
        )

@router.post("/verify")
async def verify_token():
    """Verify token endpoint"""
    return {"message": "Token verification endpoint", "valid": True}