# Backend/app/models/user.py - FIXED VERSION with backwards compatibility

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, validator
from enum import Enum

# MOVE ENUMS FIRST - BEFORE User class
class UserRole(str, Enum):
    admin = "admin"
    seller = "seller"
    buyer = "buyer"

class UserStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"
    pending_verification = "pending_verification"
    deleted = "deleted"

class AuthProvider(str, Enum):
    local = "local"
    google = "google"

class User(BaseModel):
    """User model for MongoDB with Google Auth support"""
    id: Optional[str] = Field(None, alias="_id")
    
    # FIXED: Remove min_length validation to allow empty strings (backwards compatibility)
    name: str = Field(default="")  # Removed min_length=0 which was causing issues
    first_name: str = Field(default="")
    last_name: str = Field(default="")
    
    email: EmailStr
    password_hash: Optional[str] = None  # Made optional for Google users
    
    # Google Auth fields
    google_id: Optional[str] = None
    picture: Optional[str] = None
    auth_provider: str = "local"  # "local" or "google"
    
    role: UserRole = UserRole.buyer  # Use enum with default
    status: UserStatus = UserStatus.active  # Use enum with default
    verified: bool = False
    two_factor_enabled: bool = False
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    avatar: Optional[str] = None
    
    # Additional fields for marketplace
    newsletter_subscribed: bool = True
    is_verified: bool = False
    is_active: bool = True
    total_purchases: int = 0
    total_spent: float = 0.0
    products_listed: int = 0
    total_sales: float = 0.0
    preferences: dict = {}

    # OPTIONAL: Add validators to handle empty strings gracefully
    @validator('name', 'first_name', 'last_name', pre=True)
    def handle_empty_strings(cls, v):
        """Allow empty strings but convert None to empty string"""
        if v is None:
            return ""
        return str(v)

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat() if dt else None
        }
        # Allow population by field name and alias
        allow_population_by_field_name = True