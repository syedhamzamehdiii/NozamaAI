# =============== app/api/dependencies.py ===============
"""
Common dependencies for API routes
"""

from typing import Optional, Generator, Dict, Any
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import redis
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.services.admin_service import AdminService
from app.config import settings
from app.models.user import User, UserRole
from app.schemas.auth import TokenData
from app.services.user_service import UserService
from app.services.order_service import OrderService
from app.services.payment_service import PaymentService
from app.services.product_service import ProductService
from app.services.notification_service import NotificationService
from app.services.community_service import CommunityService
from app.services.review_service import ReviewService
from app.config.database import get_database  # Make sure this returns AsyncIOMotorDatabase
from app.models.redis import get_redis_client
from app.services.auth_service import get_auth_service, AuthService
try:
    # Fallback session-based auth (Google login) from seller module
    from app.api.v1.seller import get_user_from_session  # type: ignore
except Exception:
    get_user_from_session = None  # type: ignore

# Security
security = HTTPBearer()

class RateLimiter:
    """Rate limiting dependency"""
    
    def __init__(self, requests: int = 100, window: int = 60):
        self.requests = requests
        self.window = window
    
    async def __call__(self, request: Request, redis_client: redis.Redis = Depends(get_redis_client)):
        # Gracefully handle missing setting; default to disabled
        if not getattr(settings, "ENABLE_RATE_LIMITING", False):
            return True
            
        # Get client IP
        client_ip = request.client.host
        if "x-forwarded-for" in request.headers:
            client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
        
        # Create rate limit key
        key = f"rate_limit:{client_ip}"
        
        # Get current count
        current = await redis_client.get(key)
        
        if current is None:
            # First request in window
            await redis_client.setex(key, self.window, 1)
            return True
        
        if int(current) >= self.requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded"
            )
        
        # Increment counter
        await redis_client.incr(key)
        return True

# Rate limiters
rate_limiter = RateLimiter()
strict_rate_limiter = RateLimiter(requests=10, window=60)

async def get_current_user_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """Extract and validate JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check token expiration
        exp = payload.get("exp")
        if exp is None or datetime.utcnow() > datetime.fromtimestamp(exp):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Service Dependencies
async def get_user_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> UserService:
    """Get UserService instance"""
    return UserService(db)

async def get_order_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> OrderService:
    """Get OrderService instance"""
    return OrderService(db)

async def get_payment_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> PaymentService:
    """Get PaymentService instance"""
    return PaymentService(db)

async def get_product_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> ProductService:
    """Get ProductService instance"""
    return ProductService(db)

async def get_notification_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> NotificationService:
    """Get NotificationService instance"""
    return NotificationService(db)

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
) -> User:
    """Get current authenticated user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user from database using auth service
        user = await auth_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        return user
    except JWTError:
        # Fallback: accept session token from Google auth (seller flow)
        if get_user_from_session is not None:
            try:
                session_user = get_user_from_session(credentials.credentials)
                if session_user and session_user.get("id"):
                    user = await auth_service.get_user_by_id(session_user["id"])
                    if user and user.is_active:
                        return user
            except Exception:
                pass
        # Additional fallback: explicit user id header
        try:
            explicit_user_id = request.headers.get("X-User-Id")
            if explicit_user_id:
                user = await auth_service.get_user_by_id(explicit_user_id)
                if user and user.is_active:
                    return user
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

def require_role(required_role: UserRole):
    """Dependency factory for role-based access control"""
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access requires {required_role} role",
            )
        return current_user
    return role_checker

# Role-specific dependencies
require_admin = require_role(UserRole.admin)
require_seller = require_role(UserRole.seller)

async def get_current_admin_user(
    current_user: User = Depends(require_admin)
) -> User:
    """Get current admin user"""
    return current_user

async def get_current_seller_user(
    current_user: User = Depends(require_seller)
) -> User:
    """Get current seller user"""
    return current_user

# Optional authentication
async def get_current_user_optional(
    request: Request,
    user_service: UserService = Depends(get_user_service)
) -> Optional[User]:
    """Get current user if authenticated, otherwise None"""
    try:
        # Check for Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        
        # Check token expiration
        exp = payload.get("exp")
        if exp is None or datetime.utcnow() > datetime.fromtimestamp(exp):
            return None
        
        user = await user_service.get_user_by_id(user_id)
        return user if user and user.is_active else None
        
    except (JWTError, Exception):
        return None

# Pagination dependency
class PaginationParams:
    def __init__(
        self,
        page: int = 1,
        size: int = 20,
        max_size: int = 100
    ):
        self.page = max(1, page)
        self.size = min(max_size, max(1, size))
        self.skip = (self.page - 1) * self.size
        self.limit = self.size

def get_pagination_params(
    page: int = 1,
    size: int = 20
) -> PaginationParams:
    """Get pagination parameters"""
    return PaginationParams(page=page, size=size)

# Search parameters
class SearchParams:
    def __init__(
        self,
        q: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ):
        self.query = q
        self.sort_by = sort_by
        self.sort_order = sort_order

def get_search_params(
    q: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc"
) -> SearchParams:
    """Get search parameters"""
    return SearchParams(q=q, sort_by=sort_by, sort_order=sort_order)

# Service dependencies
async def get_community_service(
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> CommunityService:
    """Get community service instance"""
    return CommunityService(db)

async def get_review_service(
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> ReviewService:
    """Get review service instance"""
    return ReviewService(db)