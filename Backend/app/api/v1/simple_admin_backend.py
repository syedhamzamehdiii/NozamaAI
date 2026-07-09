# backend/app/api/v1/simple_admin_backend.py - COMPLETE FIXED VERSION
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
import os
import logging

# Setup logging
logger = logging.getLogger(__name__)

# Security setup
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration - MUST match your main app
SECRET_KEY = os.getenv("SECRET_KEY", "1q2w3e")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Global database dependency - will be injected from main.py
get_database = None

# =================== PYDANTIC MODELS ===================

class SimpleAdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    is_active: bool = True

class SimpleAdminUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class SimpleAdminResponse(BaseModel):
    id: str
    name: str
    email: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

class SimpleAdminLogin(BaseModel):
    email: EmailStr
    password: str

class ToggleStatusRequest(BaseModel):
    is_active: bool

# =================== UTILITY FUNCTIONS ===================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def simple_admin_to_response(admin_doc: dict) -> SimpleAdminResponse:
    """Convert MongoDB document to Pydantic model"""
    return SimpleAdminResponse(
        id=str(admin_doc["_id"]),
        name=admin_doc["name"],
        email=admin_doc["email"],
        is_active=admin_doc.get("is_active", True),
        created_at=admin_doc.get("created_at", datetime.utcnow()),
        updated_at=admin_doc.get("updated_at", datetime.utcnow()),
        last_login=admin_doc.get("last_login")
    )

# =================== AUTHENTICATION DEPENDENCIES ===================

async def get_current_simple_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current simple admin from JWT token - FIXED VERSION"""
    try:
        logger.info("🔍 Authenticating Simple Admin...")
        
        # Decode JWT token
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role")
        email = payload.get("email")
        
        logger.info(f"🔍 JWT: id={user_id}, role={role}, email={email}")
        
        if role != "simple_admin":
            logger.error(f"❌ Wrong role: {role}")
            raise HTTPException(status_code=403, detail="Simple admin access required")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get database
        if get_database is None:
            raise HTTPException(status_code=500, detail="Database not available")
        
        db = await get_database()
        
        # Find simple admin
        if ObjectId.is_valid(user_id):
            simple_admin = await db.simple_admins.find_one({"_id": ObjectId(user_id)})
        else:
            simple_admin = await db.simple_admins.find_one({"email": email})
        
        if not simple_admin:
            raise HTTPException(status_code=404, detail="Simple admin not found")
        
        if not simple_admin.get("is_active", True):
            raise HTTPException(status_code=403, detail="Account inactive")
        
        logger.info(f"✅ Simple Admin authenticated: {simple_admin['email']}")
        return simple_admin
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"❌ Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

async def get_current_super_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current super admin from JWT token"""
    try:
        logger.info("🔍 Authenticating Super Admin...")
        
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role")
        email = payload.get("email")
        
        logger.info(f"🔍 JWT: id={user_id}, role={role}, email={email}")
        
        if role not in ["admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # For development, allow any admin JWT
        admin = {
            "_id": ObjectId() if not user_id or not ObjectId.is_valid(user_id) else ObjectId(user_id),
            "email": email or "admin@nozama.ai",
            "role": "admin",
            "name": "Super Admin"
        }
        
        logger.info(f"✅ Super Admin authenticated: {admin['email']}")
        return admin
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"❌ Super admin auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# =================== ROUTERS ===================

super_admin_router = APIRouter(prefix="/super-admin", tags=["Super Admin - Simple Admin Management"])
simple_admin_router = APIRouter(prefix="/simple-admin", tags=["Simple Admin"])

# =================== SUPER ADMIN ENDPOINTS ===================

@super_admin_router.get("/simple-admins")
async def get_simple_admins(
    skip: int = 0,
    limit: int = 100,
    current_admin = Depends(get_current_super_admin)
):
    """Get list of simple admins (Super Admin only)"""
    try:
        db = await get_database()
        
        cursor = db.simple_admins.find().skip(skip).limit(limit).sort("created_at", DESCENDING)
        simple_admins = await cursor.to_list(length=limit)
        total = await db.simple_admins.count_documents({})
        
        admin_responses = [simple_admin_to_response(admin) for admin in simple_admins]
        
        return {
            "success": True,
            "admins": admin_responses,
            "total": total
        }
    except Exception as e:
        logger.error(f"❌ Error getting simple admins: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@super_admin_router.post("/simple-admins")
async def create_simple_admin(
    admin_data: SimpleAdminCreate,
    current_admin = Depends(get_current_super_admin)
):
    """Create a new simple admin (Super Admin only)"""
    try:
        db = await get_database()
        
        # Check if email exists
        existing = await db.simple_admins.find_one({"email": admin_data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create simple admin
        hashed_password = get_password_hash(admin_data.password)
        simple_admin_doc = {
            "name": admin_data.name,
            "email": admin_data.email,
            "password_hash": hashed_password,
            "is_active": admin_data.is_active,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": None
        }
        
        result = await db.simple_admins.insert_one(simple_admin_doc)
        simple_admin_doc["_id"] = result.inserted_id
        
        return {
            "success": True,
            "admin": simple_admin_to_response(simple_admin_doc),
            "message": "Simple admin created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating simple admin: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@super_admin_router.put("/simple-admins/{admin_id}")
async def update_simple_admin(
    admin_id: str,
    admin_data: SimpleAdminUpdate,
    current_admin = Depends(get_current_super_admin)
):
    """Update simple admin (Super Admin only)"""
    try:
        db = await get_database()
        
        if not ObjectId.is_valid(admin_id):
            raise HTTPException(status_code=400, detail="Invalid admin ID")
        
        object_id = ObjectId(admin_id)
        
        update_data = admin_data.dict(exclude_unset=True)
        if "password" in update_data:
            update_data["password_hash"] = get_password_hash(update_data.pop("password"))
        
        update_data["updated_at"] = datetime.utcnow()
        
        result = await db.simple_admins.update_one(
            {"_id": object_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Simple admin not found")
        
        updated_admin = await db.simple_admins.find_one({"_id": object_id})
        
        return {
            "success": True,
            "admin": simple_admin_to_response(updated_admin),
            "message": "Simple admin updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating simple admin: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@super_admin_router.delete("/simple-admins/{admin_id}")
async def delete_simple_admin(
    admin_id: str,
    current_admin = Depends(get_current_super_admin)
):
    """Delete simple admin (Super Admin only)"""
    try:
        db = await get_database()
        
        if not ObjectId.is_valid(admin_id):
            raise HTTPException(status_code=400, detail="Invalid admin ID")
        
        result = await db.simple_admins.delete_one({"_id": ObjectId(admin_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Simple admin not found")
        
        return {
            "success": True,
            "message": "Simple admin deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting simple admin: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@super_admin_router.put("/simple-admins/{admin_id}/toggle-status")
async def toggle_simple_admin_status(
    admin_id: str,
    status_data: ToggleStatusRequest,
    current_admin = Depends(get_current_super_admin)
):
    """Toggle simple admin status (Super Admin only)"""
    try:
        db = await get_database()
        
        if not ObjectId.is_valid(admin_id):
            raise HTTPException(status_code=400, detail="Invalid admin ID")
        
        result = await db.simple_admins.update_one(
            {"_id": ObjectId(admin_id)},
            {
                "$set": {
                    "is_active": status_data.is_active,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Simple admin not found")
        
        action = "activated" if status_data.is_active else "deactivated"
        
        return {
            "success": True,
            "message": f"Simple admin {action} successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error toggling status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =================== SIMPLE ADMIN ENDPOINTS ===================

@simple_admin_router.post("/login")
async def simple_admin_login(login_data: SimpleAdminLogin):
    """Simple admin login"""
    try:
        db = await get_database()
        
        simple_admin = await db.simple_admins.find_one({"email": login_data.email})
        
        if not simple_admin:
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        
        if not verify_password(login_data.password, simple_admin["password_hash"]):
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        
        if not simple_admin.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account is inactive")
        
        # Update last login
        await db.simple_admins.update_one(
            {"_id": simple_admin["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "sub": str(simple_admin["_id"]),
                "role": "simple_admin",
                "email": simple_admin["email"],
                "name": simple_admin["name"]
            },
            expires_delta=access_token_expires
        )
        
        logger.info(f"✅ Simple admin login successful: {login_data.email}")
        
        return {
            "success": True,
            "access_token": access_token,
            "token_type": "bearer",
            "user": simple_admin_to_response(simple_admin)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@simple_admin_router.get("/dashboard")
async def simple_admin_dashboard(current_simple_admin = Depends(get_current_simple_admin)):
    """Get dashboard data for simple admin"""
    try:
        db = await get_database()
        
        simple_admin_id = ObjectId(current_simple_admin["_id"])
        
        # Get my products only
        my_products = await db.products.find({"created_by_simple_admin_id": simple_admin_id}).to_list(length=None)
        
        # Calculate stats
        total_products = len(my_products)
        pending_products = len([p for p in my_products if p.get("status") == "pending"])
        approved_products = len([p for p in my_products if p.get("status") == "approved"])
        rejected_products = len([p for p in my_products if p.get("status") == "rejected"])
        
        # Get recent products
        recent_cursor = db.products.find(
            {"created_by_simple_admin_id": simple_admin_id}
        ).sort("created_at", DESCENDING).limit(5)
        recent_products = await recent_cursor.to_list(length=5)
        
        # Format recent products
        recent_products_data = []
        for product in recent_products:
            recent_products_data.append({
                "id": str(product["_id"]),
                "title": product.get("title", ""),
                "category": product.get("category", ""),
                "status": product.get("status", "pending"),
                "price": product.get("price", 0),
                "created_at": product.get("created_at", datetime.utcnow()),
                "rejection_reason": product.get("rejection_reason")
            })
        
        return {
            "success": True,
            "stats": {
                "totalProducts": total_products,
                "pendingProducts": pending_products,
                "approvedProducts": approved_products,
                "rejectedProducts": rejected_products,
                "myProducts": total_products
            },
            "recent_products": recent_products_data,
            "simple_admin": {
                "id": str(current_simple_admin["_id"]),
                "name": current_simple_admin.get("name"),
                "email": current_simple_admin.get("email")
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =================== TESTING ENDPOINTS (NO AUTH) ===================

@super_admin_router.get("/simple-admins-no-auth")
async def get_simple_admins_no_auth(skip: int = 0, limit: int = 100):
    """Get simple admins without auth (testing only)"""
    try:
        db = await get_database()
        
        cursor = db.simple_admins.find().skip(skip).limit(limit).sort("created_at", DESCENDING)
        simple_admins = await cursor.to_list(length=limit)
        total = await db.simple_admins.count_documents({})
        
        admin_responses = [simple_admin_to_response(admin) for admin in simple_admins]
        
        return {
            "success": True,
            "admins": admin_responses,
            "total": total,
            "message": "Testing mode - no authentication required"
        }
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        return {"success": False, "error": str(e), "admins": [], "total": 0}

@super_admin_router.post("/simple-admins-no-auth")
async def create_simple_admin_no_auth(admin_data: SimpleAdminCreate):
    """Create simple admin without auth (testing only)"""
    try:
        db = await get_database()
        
        existing = await db.simple_admins.find_one({"email": admin_data.email})
        if existing:
            return {
                "success": False,
                "error": "Email already exists",
                "existing_id": str(existing["_id"])
            }
        
        hashed_password = get_password_hash(admin_data.password)
        simple_admin_doc = {
            "name": admin_data.name,
            "email": admin_data.email,
            "password_hash": hashed_password,
            "is_active": admin_data.is_active,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": None
        }
        
        result = await db.simple_admins.insert_one(simple_admin_doc)
        simple_admin_doc["_id"] = result.inserted_id
        
        return {
            "success": True,
            "admin": simple_admin_to_response(simple_admin_doc),
            "message": "Simple admin created successfully (testing mode)"
        }
        
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        return {"success": False, "error": str(e)}

# =================== DEBUG ENDPOINTS ===================

@simple_admin_router.get("/debug/test-auth")
async def test_simple_admin_auth(current_simple_admin = Depends(get_current_simple_admin)):
    """Test simple admin authentication"""
    return {
        "message": "Simple admin authentication working!",
        "simple_admin": {
            "id": str(current_simple_admin["_id"]),
            "email": current_simple_admin["email"],
            "name": current_simple_admin["name"],
            "is_active": current_simple_admin["is_active"]
        }
    }

@super_admin_router.get("/debug/test-auth")
async def test_super_admin_auth(current_admin = Depends(get_current_super_admin)):
    """Test super admin authentication"""
    return {
        "message": "Super admin authentication working!",
        "admin": {
            "id": str(current_admin["_id"]),
            "email": current_admin["email"],
            "name": current_admin.get("name", "Super Admin"),
            "role": current_admin.get("role", "admin")
        }
    }



# Add these missing endpoints to your simple_admin_backend.py

# MISSING ENDPOINT 1: Toggle Status (No Auth)
@super_admin_router.put("/simple-admins-no-auth/{admin_id}/toggle-status")
async def toggle_simple_admin_status_no_auth(
    admin_id: str,
    status_data: ToggleStatusRequest
):
    """Toggle simple admin status without auth (testing only)"""
    try:
        logger.info(f"🔄 Toggling status for {admin_id} to {status_data.is_active}")
        
        db = await get_database()
        
        if not ObjectId.is_valid(admin_id):
            return {"success": False, "error": "Invalid admin ID"}
        
        result = await db.simple_admins.update_one(
            {"_id": ObjectId(admin_id)},
            {
                "$set": {
                    "is_active": status_data.is_active,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            return {"success": False, "error": "Simple admin not found"}
        
        action = "activated" if status_data.is_active else "deactivated"
        logger.info(f"✅ Simple admin {action} successfully")
        
        return {
            "success": True,
            "message": f"Simple admin {action} successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Error toggling status: {e}")
        return {"success": False, "error": str(e)}

# MISSING ENDPOINT 2: Delete Simple Admin (No Auth)
@super_admin_router.delete("/simple-admins-no-auth/{admin_id}")
async def delete_simple_admin_no_auth(admin_id: str):
    """Delete simple admin without auth (testing only)"""
    try:
        logger.info(f"🗑️ Deleting Simple Admin: {admin_id}")
        
        db = await get_database()
        
        if not ObjectId.is_valid(admin_id):
            return {"success": False, "error": "Invalid admin ID"}
        
        # First, get the admin info for logging
        admin = await db.simple_admins.find_one({"_id": ObjectId(admin_id)})
        if not admin:
            return {"success": False, "error": "Simple admin not found"}
        
        # Delete the admin
        result = await db.simple_admins.delete_one({"_id": ObjectId(admin_id)})
        
        if result.deleted_count == 0:
            return {"success": False, "error": "Failed to delete simple admin"}
        
        logger.info(f"✅ Simple admin {admin.get('email', admin_id)} deleted successfully")
        
        return {
            "success": True,
            "message": "Simple admin deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Error deleting simple admin: {e}")
        return {"success": False, "error": str(e)}

logger.info("✅ Simple Admin Backend loaded successfully!")