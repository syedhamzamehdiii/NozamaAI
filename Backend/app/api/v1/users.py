# =============== app/api/v1/users.py ===============
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User
from app.schemas.user import UserProfile, UserUpdate
from app.dependencies import get_db, get_current_active_user
from datetime import datetime

router = APIRouter()

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user profile"""
    return UserProfile(**current_user.model_dump())

@router.put("/me", response_model=UserProfile)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update current user profile"""
    update_data = user_update.model_dump(exclude_unset=True)
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        
        await db.users.update_one(
            {"_id": current_user.id},
            {"$set": update_data}
        )
        
        # Get updated user
        updated_user_data = await db.users.find_one({"_id": current_user.id})
        updated_user = User(**updated_user_data)
        
        return UserProfile(**updated_user.model_dump())
    
    return UserProfile(**current_user.model_dump())

@router.delete("/me")
async def delete_current_user_account(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete current user account"""
    # Soft delete - mark as inactive
    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Account deactivated successfully"}