# =============== app/schemas/__init__.py ===============
"""
Pydantic schemas for request/response validation and API documentation.
These schemas are separate from models to allow for different validation
rules for API inputs vs database storage.
"""

from .auth import *
from .user import *
from .product import *
from .order import *
from .review import *
from .payment import *

__all__ = [
    # Auth schemas
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "PasswordResetRequest",
    "PasswordChangeRequest",
    
    # User schemas
    "UserResponse",
    "UserCreate",
    "UserUpdate",
    "UserProfile",
    
    # Product schemas
    "ProductResponse",
    "ProductCreate",
    "ProductUpdate",
    "ProductSearch",
    "ProductFilter",
    
    # Order schemas
    "OrderResponse",
    "OrderCreate",
    "OrderUpdate",
    "CartItem",
    "CheckoutRequest",
    
    # Review schemas
    "ReviewResponse",
    "ReviewCreate",
    "ReviewUpdate",
    
    # Payment schemas
    "PaymentRequest",
    "PaymentResponse",
    "PromoCodeValidation",
]
