# =============== app/services/user_service.py ===============
# user_service.py

from fastapi import Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.config.database import get_database  # <- your database provider

class UserService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.users

# Provide the dependency for FastAPI
def get_user_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> UserService:
    return UserService(db)





from fastapi import Depends
from typing import Optional, Dict, Any, List
from datetime import datetime
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.config.database import get_database  

from app.models.user import User, UserRole, UserStatus
from app.services.upload_service import UploadService

class UserService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users_collection = db.users
        self.upload_service = UploadService()
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            user_data = await self.users_collection.find_one({"_id": ObjectId(user_id)})
            if user_data:
                return User(**user_data)
            return None
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch user: {str(e)}"
            )
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        try:
            user_data = await self.users_collection.find_one({"email": email})
            if user_data:
                return User(**user_data)
            return None
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch user: {str(e)}"
            )
    
    async def update_user_profile(self, user_id: str, update_data: Dict[str, Any]) -> User:
        """Update user profile"""
        try:
            # Remove sensitive fields that shouldn't be updated via this method
            sensitive_fields = {"password_hash", "email", "role", "status", "is_verified"}
            update_data = {k: v for k, v in update_data.items() if k not in sensitive_fields}
            
            # Add updated timestamp
            update_data["updated_at"] = datetime.utcnow()
            
            # Update user in database
            result = await self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found or no changes made"
                )
            
            # Return updated user
            updated_user = await self.get_user_by_id(user_id)
            if not updated_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            return updated_user
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update user profile: {str(e)}"
            )
    
    async def update_user_avatar(self, user_id: str, avatar_file) -> str:
        """Update user avatar"""
        try:
            # Upload avatar file
            avatar_url = await self.upload_service.upload_file(
                file=avatar_file,
                folder="avatars",
                allowed_types=["image/jpeg", "image/png", "image/webp"]
            )
            
            # Update user with new avatar URL
            await self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "avatar_url": avatar_url,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return avatar_url
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update avatar: {str(e)}"
            )
    
    async def get_user_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics"""
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            stats = {
                "total_purchases": user.total_purchases,
                "total_spent": user.total_spent,
                "account_age_days": (datetime.utcnow() - user.created_at).days,
                "last_login": user.last_login.isoformat() if user.last_login else None
            }
            
            # Add seller-specific stats if user is a seller
            if user.role in [UserRole.SELLER, UserRole.ADMIN]:
                stats.update({
                    "products_listed": user.products_listed,
                    "total_sales": user.total_sales,
                    "products_sold": await self._get_products_sold_count(user_id),
                    "average_rating": await self._get_average_seller_rating(user_id)
                })
            
            return stats
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get user statistics: {str(e)}"
            )
    
    async def update_user_preferences(self, user_id: str, preferences: Dict[str, Any]) -> User:
        """Update user preferences"""
        try:
            result = await self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "preferences": preferences,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            return await self.get_user_by_id(user_id)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update preferences: {str(e)}"
            )
    
    async def enable_two_factor_auth(self, user_id: str) -> Dict[str, Any]:
        """Enable two-factor authentication"""
        try:
            # Generate secret key for 2FA
            import pyotp
            secret = pyotp.random_base32()
            
            # Update user with 2FA secret
            await self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "two_factor_secret": secret,
                        "two_factor_enabled": True,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Generate QR code URL
            user = await self.get_user_by_id(user_id)
            totp = pyotp.TOTP(secret)
            qr_url = totp.provisioning_uri(
                user.email,
                issuer_name="Nozama.ai"
            )
            
            return {
                "secret": secret,
                "qr_url": qr_url,
                "message": "Two-factor authentication enabled successfully"
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to enable 2FA: {str(e)}"
            )
    
    async def disable_two_factor_auth(self, user_id: str) -> Dict[str, Any]:
        """Disable two-factor authentication"""
        try:
            await self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "two_factor_enabled": False,
                        "updated_at": datetime.utcnow()
                    },
                    "$unset": {"two_factor_secret": ""}
                }
            )
            
            return {"message": "Two-factor authentication disabled successfully"}
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to disable 2FA: {str(e)}"
            )
    
    async def get_users_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        role: Optional[UserRole] = None,
        status: Optional[UserStatus] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get paginated list of users (admin only)"""
        try:
            # Build filter query
            filter_query = {}
            
            if role:
                filter_query["role"] = role
            
            if status:
                filter_query["status"] = status
            
            if search:
                filter_query["$or"] = [
                    {"first_name": {"$regex": search, "$options": "i"}},
                    {"last_name": {"$regex": search, "$options": "i"}},
                    {"email": {"$regex": search, "$options": "i"}},
                    {"company": {"$regex": search, "$options": "i"}}
                ]
            
            # Get total count
            total = await self.users_collection.count_documents(filter_query)
            
            # Get users
            cursor = self.users_collection.find(filter_query)
            cursor.skip(skip).limit(limit).sort("created_at", -1)
            
            users_data = await cursor.to_list(length=limit)
            users = [User(**user_data) for user_data in users_data]
            
            return {
                "users": [self._serialize_user_admin(user) for user in users],
                "total": total,
                "skip": skip,
                "limit": limit
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get users list: {str(e)}"
            )
    
    async def update_user_status(self, user_id: str, status: UserStatus) -> User:
        """Update user status (admin only)"""
        try:
            result = await self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "status": status,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            return await self.get_user_by_id(user_id)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update user status: {str(e)}"
            )
    
    async def delete_user(self, user_id: str) -> Dict[str, Any]:
        """Delete user account"""
        try:
            # Check if user has any active orders or products
            orders_count = await self.db.orders.count_documents({"user_id": user_id})
            products_count = await self.db.products.count_documents({"seller_id": user_id})
            
            if orders_count > 0 or products_count > 0:
                # Soft delete - deactivate instead of removing
                await self.users_collection.update_one(
                    {"_id": ObjectId(user_id)},
                    {
                        "$set": {
                            "is_active": False,
                            "status": UserStatus.INACTIVE,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                return {"message": "User account has been deactivated"}
            else:
                # Hard delete if no dependencies
                result = await self.users_collection.delete_one({"_id": ObjectId(user_id)})
                if result.deleted_count == 0:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="User not found"
                    )
                return {"message": "User account has been permanently deleted"}
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete user: {str(e)}"
            )
    
    async def _get_products_sold_count(self, user_id: str) -> int:
        """Get count of products sold by user"""
        try:
            pipeline = [
                {"$match": {"seller_id": user_id}},
                {"$group": {"_id": None, "total_sold": {"$sum": "$sales_count"}}}
            ]
            result = await self.db.products.aggregate(pipeline).to_list(1)
            return result[0]["total_sold"] if result else 0
        except:
            return 0
    
    async def _get_average_seller_rating(self, user_id: str) -> float:
        """Get average rating for seller's products"""
        try:
            pipeline = [
                {"$match": {"seller_id": user_id, "rating_count": {"$gt": 0}}},
                {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
            ]
            result = await self.db.products.aggregate(pipeline).to_list(1)
            return round(result[0]["avg_rating"], 2) if result else 0.0
        except:
            return 0.0
    
    def _serialize_user_admin(self, user: User) -> Dict[str, Any]:
        """Serialize user for admin view"""
        return {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "status": user.status,
            "is_verified": user.is_verified,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat(),
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "total_purchases": user.total_purchases,
            "total_spent": user.total_spent,
            "products_listed": user.products_listed
        }

def get_user_service(
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> UserService:
    return UserService(db)