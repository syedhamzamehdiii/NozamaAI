# =============== app/schemas/user.py (Updated Version) ===============
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    seller = "seller"
    buyer = "buyer"

class AuthProvider(str, Enum):
    local = "local"
    google = "google"

class UserStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"
    pending_verification = "pending_verification"
    deleted = "deleted"

class UserBase(BaseModel):
    """Base user schema with common fields"""
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    newsletter_subscribed: bool = True

class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(..., min_length=8, max_length=100)
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserCreateGoogle(BaseModel):
    """Schema for creating a user from Google OAuth"""
    email: EmailStr
    first_name: str = Field(default="")
    last_name: str = Field(default="")
    google_id: str
    picture: Optional[str] = None
    newsletter_subscribed: bool = True

class UserUpdate(BaseModel):
    """Schema for updating user information"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    newsletter_subscribed: Optional[bool] = None
    preferences: Optional[Dict[str, Any]] = None

class UserProfile(BaseModel):
    """Schema for user profile display"""
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    name: str
    role: UserRole
    status: UserStatus
    auth_provider: AuthProvider
    picture: Optional[str] = None
    is_verified: bool
    is_active: bool
    newsletter_subscribed: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    total_purchases: int = 0
    total_spent: float = 0.0
    products_listed: int = 0
    total_sales: float = 0.0

class UserInDB(UserProfile):
    """Schema for user data stored in database"""
    password_hash: Optional[str] = None
    google_id: Optional[str] = None
    verified: bool = False
    two_factor_enabled: bool = False
    updated_at: datetime
    preferences: Dict[str, Any] = {}

class UserResponse(BaseModel):
    """Schema for API responses containing user data"""
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole
    auth_provider: AuthProvider
    picture: Optional[str] = None
    is_verified: bool

class PasswordChange(BaseModel):
    """Schema for password change requests"""
    current_password: str
    new_password: str = Field(..., min_length=8)
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('New password must be at least 8 characters long')
        return v

class PasswordReset(BaseModel):
    """Schema for password reset requests"""
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    """Schema for confirming password reset"""
    token: str
    new_password: str = Field(..., min_length=8)
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('New password must be at least 8 characters long')
        return v