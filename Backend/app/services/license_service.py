# =============== app/services/license_service.py ===============
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import secrets
import string

from app.models.license import License, LicenseStatus, LicenseType, LicenseActivation

class LicenseService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.licenses_collection = db.licenses
        self.activations_collection = db.license_activations
        self.products_collection = db.products
        self.users_collection = db.users
    
    async def create_license(
        self,
        product_id: str,
        user_id: str,
        order_id: str,
        license_type: str,
        expires_in_days: Optional[int] = None
    ) -> License:
        """Create a new license for a product"""
        try:
            # Get product information
            product = await self.products_collection.find_one({"_id": ObjectId(product_id)})
            if not product:
                raise Exception("Product not found")
            
            # Generate unique license key
            license_key = self._generate_license_key()
            
            # Calculate expiration date
            expires_at = None
            if expires_in_days:
                expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
            
            # Set license permissions based on type
            permissions = self._get_license_permissions(license_type)
            
            # Create license
            license_obj = License(
                license_key=license_key,
                product_id=product_id,
                product_title=product["title"],
                user_id=user_id,
                order_id=order_id,
                license_type=LicenseType(license_type),
                expires_at=expires_at,
                **permissions
            )
            
            # Insert license
            result = await self.licenses_collection.insert_one(license_obj.dict(by_alias=True))
            license_obj.id = str(result.inserted_id)
            
            return license_obj
            
        except Exception as e:
            raise Exception(f"Failed to create license: {str(e)}")
    
    async def activate_license(
        self,
        license_key: str,
        machine_id: str,
        ip_address: str,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """Activate license on a machine"""
        try:
            # Find license
            license_data = await self.licenses_collection.find_one({"license_key": license_key})
            if not license_data:
                return {"success": False, "error": "Invalid license key"}
            
            license_obj = License(**license_data)
            
            # Check license status
            if license_obj.status != LicenseStatus.ACTIVE:
                return {"success": False, "error": "License is not active"}
            
            # Check expiration
            if license_obj.expires_at and license_obj.expires_at < datetime.utcnow():
                await self.licenses_collection.update_one(
                    {"_id": ObjectId(license_obj.id)},
                    {"$set": {"status": LicenseStatus.EXPIRED}}
                )
                return {"success": False, "error": "License has expired"}
            
            # Check activation limits
            if license_obj.max_installations:
                active_count = await self.activations_collection.count_documents({
                    "license_id": str(license_obj.id),
                    "is_active": True
                })
                
                if active_count >= license_obj.max_installations:
                    return {"success": False, "error": "Maximum installations reached"}
            
            # Check if already activated on this machine
            existing_activation = await self.activations_collection.find_one({
                "license_id": str(license_obj.id),
                "machine_id": machine_id,
                "is_active": True
            })
            
            if existing_activation:
                return {"success": True, "message": "License already activated on this machine"}
            
            # Create activation record
            activation = LicenseActivation(
                license_id=str(license_obj.id),
                license_key=license_key,
                machine_id=machine_id,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            await self.activations_collection.insert_one(activation.dict(by_alias=True))
            
            # Update license activation count
            await self.licenses_collection.update_one(
                {"_id": ObjectId(license_obj.id)},
                {
                    "$inc": {"activation_count": 1},
                    "$set": {"last_used": datetime.utcnow()}
                }
            )
            
            return {"success": True, "message": "License activated successfully"}
            
        except Exception as e:
            return {"success": False, "error": f"Activation failed: {str(e)}"}
    
    async def deactivate_license(self, license_key: str, machine_id: str) -> Dict[str, Any]:
        """Deactivate license on a machine"""
        try:
            # Find and deactivate
            result = await self.activations_collection.update_one(
                {"license_key": license_key, "machine_id": machine_id, "is_active": True},
                {
                    "$set": {
                        "is_active": False,
                        "deactivated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                return {"success": True, "message": "License deactivated successfully"}
            else:
                return {"success": False, "error": "No active license found for this machine"}
            
        except Exception as e:
            return {"success": False, "error": f"Deactivation failed: {str(e)}"}
    
    async def get_user_licenses(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all licenses for a user"""
        try:
            cursor = self.licenses_collection.find({"user_id": user_id})
            licenses_data = await cursor.to_list(length=None)
            
            licenses = []
            for license_data in licenses_data:
                license_obj = License(**license_data)
                
                # Get activation count
                activation_count = await self.activations_collection.count_documents({
                    "license_id": str(license_obj.id),
                    "is_active": True
                })
                
                licenses.append({
                    "id": str(license_obj.id),
                    "license_key": license_obj.license_key,
                    "product_title": license_obj.product_title,
                    "license_type": license_obj.license_type,
                    "status": license_obj.status,
                    "issued_at": license_obj.issued_at.isoformat(),
                    "expires_at": license_obj.expires_at.isoformat() if license_obj.expires_at else None,
                    "activation_count": activation_count,
                    "max_installations": license_obj.max_installations
                })
            
            return licenses
            
        except Exception as e:
            raise Exception(f"Failed to get user licenses: {str(e)}")
    
    def _generate_license_key(self) -> str:
        """Generate unique license key"""
        # Generate key in format: XXXX-XXXX-XXXX-XXXX
        segments = []
        for _ in range(4):
            segment = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
            segments.append(segment)
        return '-'.join(segments)
    
    def _get_license_permissions(self, license_type: str) -> Dict[str, Any]:
        """Get permissions based on license type"""
        permissions = {
            "personal": {
                "max_installations": 1,
                "max_users": 1,
                "allows_redistribution": False,
                "allows_modification": True,
                "allows_commercial_use": False
            },
            "commercial": {
                "max_installations": 5,
                "max_users": None,
                "allows_redistribution": False,
                "allows_modification": True,
                "allows_commercial_use": True
            },
            "enterprise": {
                "max_installations": None,
                "max_users": None,
                "allows_redistribution": False,
                "allows_modification": True,
                "allows_commercial_use": True
            },
            "educational": {
                "max_installations": 3,
                "max_users": 10,
                "allows_redistribution": False,
                "allows_modification": True,
                "allows_commercial_use": False
            }
        }
        
        return permissions.get(license_type, permissions["personal"])