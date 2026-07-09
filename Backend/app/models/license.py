from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class LicenseStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    SUSPENDED = "suspended"

class LicenseType(str, Enum):
    PERSONAL = "personal"
    COMMERCIAL = "commercial"
    ENTERPRISE = "enterprise"
    EDUCATIONAL = "educational"

class License(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    license_key: str = Field(..., unique=True)
    
    # License details
    product_id: str
    product_title: str
    user_id: str
    order_id: str
    
    # License type and permissions
    license_type: LicenseType
    max_installations: Optional[int] = None
    max_users: Optional[int] = None
    allows_redistribution: bool = False
    allows_modification: bool = True
    allows_commercial_use: bool = True
    
    # Status and validity
    status: LicenseStatus = LicenseStatus.ACTIVE
    issued_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    
    # Usage tracking
    activation_count: int = 0
    last_used: Optional[datetime] = None
    
    # Additional metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        allow_population_by_field_name = True

class LicenseActivation(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    license_id: str
    license_key: str
    
    # Activation details
    machine_id: str
    ip_address: str
    user_agent: Optional[str] = None
    
    # Status
    is_active: bool = True
    activated_at: datetime = Field(default_factory=datetime.utcnow)
    deactivated_at: Optional[datetime] = None
    
    # Additional information
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        allow_population_by_field_name = True