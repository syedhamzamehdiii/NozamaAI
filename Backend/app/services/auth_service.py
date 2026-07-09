# =============== app/services/auth_service.py (Updated Version) ===============
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.config.settings import settings
from app.config.database import get_database
from app.config.google_auth import google_auth
from app.models.user import User
from app.schemas.user import UserCreate
from app.config.security import hash_password, verify_password, create_access_token, create_refresh_token
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import status
import uuid
import logging

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Extract user from JWT token"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    db = await get_database()
    user_doc = await db.users.find_one({"_id": user_id})
    if user_doc is None:
        raise credentials_exception

    return User(**user_doc)

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Allow only admins"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user"""
        # Check if user already exists
        existing_user = await self.db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user document
        user_doc = {
            "_id": str(uuid.uuid4()),
            "email": user_data.email,
            "password_hash": hashed_password,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "name": f"{user_data.first_name} {user_data.last_name}",
            "newsletter_subscribed": user_data.newsletter_subscribed,
            "auth_provider": "local",
            "role": "buyer",
            "status": "active",
            "is_verified": True,
            "is_active": True,
            "verified": True,
            "two_factor_enabled": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "total_purchases": 0,
            "total_spent": 0.0,
            "products_listed": 0,
            "total_sales": 0.0,
            "preferences": {}
        }
        
        # Insert user
        await self.db.users.insert_one(user_doc)
        
        return User(**user_doc)
    
    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user_doc = await self.db.users.find_one({"email": email})
        if not user_doc:
            return None
        
        # Check if user has password (local auth)
        if not user_doc.get("password_hash"):
            return None
            
        if not verify_password(password, user_doc["password_hash"]):
            return None
        
        # Update last login
        await self.db.users.update_one(
            {"_id": user_doc["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        return User(**user_doc)
    
    async def authenticate_google_user(self, google_token: str) -> Optional[User]:
        """Authenticate user with Google token"""
        try:
            # Verify Google token
            google_user_info = await google_auth.verify_google_token(google_token)
            if not google_user_info:
                return None
            
            logger.info(f"Google auth attempt for email: {google_user_info['email']}")
            
            # Check if user exists
            user_doc = await self.db.users.find_one({
                "$or": [
                    {"email": google_user_info['email']},
                    {"google_id": google_user_info['google_id']}
                ]
            })
            
            if user_doc:
                # Update existing user with Google info
                update_data = {
                    "last_login": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                # If user doesn't have google_id, add it
                if not user_doc.get("google_id"):
                    update_data["google_id"] = google_user_info['google_id']
                    update_data["auth_provider"] = "google"
                    update_data["picture"] = google_user_info.get('picture')
                    update_data["is_verified"] = True
                    update_data["verified"] = True
                
                await self.db.users.update_one(
                    {"_id": user_doc["_id"]},
                    {"$set": update_data}
                )
                
                # Fetch updated user
                user_doc = await self.db.users.find_one({"_id": user_doc["_id"]})
                return User(**user_doc)
            else:
                # Create new user from Google data
                new_user = await self.create_google_user(google_user_info)
                return new_user
                
        except Exception as e:
            logger.error(f"Google authentication error: {str(e)}")
            return None
    
    # =============== app/services/auth_service.py (Corrected - Admin Protected) ===============
# ... (keep all existing code the same until create_google_user method)

    async def create_google_user(self, google_user_info: Dict) -> User:
        """Create a new user from Google OAuth data"""
        
        # SECURITY: Prevent admin role assignment via Google Auth
        # Admins MUST use the separate admin authentication system
        
        user_doc = {
            "_id": str(uuid.uuid4()),
            "email": google_user_info['email'],
            "first_name": google_user_info.get('first_name', ''),
            "last_name": google_user_info.get('last_name', ''),
            "name": f"{google_user_info.get('first_name', '')} {google_user_info.get('last_name', '')}".strip(),
            "google_id": google_user_info['google_id'],
            "picture": google_user_info.get('picture'),
            "auth_provider": "google",
            "newsletter_subscribed": True,
            "role": "buyer",  # Google users are ALWAYS buyers, NEVER admin
            "status": "active",
            "is_verified": True,
            "is_active": True,
            "verified": True,
            "two_factor_enabled": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": datetime.utcnow(),
            "total_purchases": 0,
            "total_spent": 0.0,
            "products_listed": 0,
            "total_sales": 0.0,
            "preferences": {}
        }
        
        # Insert user
        await self.db.users.insert_one(user_doc)
        logger.info(f"Created new Google user (buyer role): {user_doc['email']}")
        
        return User(**user_doc)

    async def authenticate_google_user(self, google_token: str) -> Optional[User]:
        """Authenticate user with Google token"""
        try:
            # Verify Google token
            google_user_info = await google_auth.verify_google_token(google_token)
            if not google_user_info:
                return None
            
            logger.info(f"Google auth attempt for email: {google_user_info['email']}")
            
            # Check if user exists
            user_doc = await self.db.users.find_one({
                "$or": [
                    {"email": google_user_info['email']},
                    {"google_id": google_user_info['google_id']}
                ]
            })
            
            if user_doc:
                # SECURITY CHECK: Prevent admin users from using Google Auth
                if user_doc.get("role") == "admin":
                    logger.warning(f"Admin user attempted Google auth: {google_user_info['email']}")
                    return None  # Reject admin users from Google auth
                
                # Update existing non-admin user with Google info
                update_data = {
                    "last_login": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                # If user doesn't have google_id, add it
                if not user_doc.get("google_id"):
                    update_data["google_id"] = google_user_info['google_id']
                    update_data["auth_provider"] = "google"
                    update_data["picture"] = google_user_info.get('picture')
                    update_data["is_verified"] = True
                    update_data["verified"] = True
                
                await self.db.users.update_one(
                    {"_id": user_doc["_id"]},
                    {"$set": update_data}
                )
                
                # Fetch updated user
                user_doc = await self.db.users.find_one({"_id": user_doc["_id"]})
                return User(**user_doc)
            else:
                # Create new user from Google data (always as buyer, never admin)
                new_user = await self.create_google_user(google_user_info)
                return new_user
                
        except Exception as e:
            logger.error(f"Google authentication error: {str(e)}")
            return None

# ... (rest of the code remains the same)
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        user_doc = await self.db.users.find_one({"_id": user_id})
        if user_doc:
            return User(**user_doc)
        return None
    
    def create_tokens(self, user: User) -> Dict[str, str]:
        """Create access and refresh tokens for user"""
        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

# Helper function to get auth service
async def get_auth_service() -> AuthService:
    db = await get_database()
    return AuthService(db)