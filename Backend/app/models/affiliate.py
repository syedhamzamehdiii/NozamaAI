from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class AffiliateStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"

class CommissionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    CANCELLED = "cancelled"

class Affiliate(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    
    # Affiliate information
    user_id: str
    affiliate_code: str = Field(..., min_length=6, max_length=20, unique=True)
    
    # Status
    status: AffiliateStatus = AffiliateStatus.PENDING
    approved_at: Optional[datetime] = None
    
    # Commission settings
    commission_rate: float = Field(default=0.15, ge=0, le=1)  # 15% default
    minimum_payout: float = Field(default=50.0, ge=0)
    
    # Statistics
    total_clicks: int = 0
    total_conversions: int = 0
    total_revenue: float = 0.0
    total_commission_earned: float = 0.0
    total_commission_paid: float = 0.0
    conversion_rate: float = 0.0
    
    # Payment information
    payment_method: Optional[str] = None
    payment_details: Dict[str, Any] = Field(default_factory=dict)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: Optional[datetime] = None
    
    # Additional metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('affiliate_code')
    def validate_affiliate_code(cls, v):
        import re
        if not re.match(r'^[A-Z0-9]+$', v):
            raise ValueError('Affiliate code must contain only uppercase letters and numbers')
        return v
    
    class Config:
        allow_population_by_field_name = True

class AffiliateClick(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    affiliate_id: str
    affiliate_code: str
    
    # Click information
    product_id: Optional[str] = None
    referrer_url: Optional[str] = None
    landing_url: str
    
    # User information
    ip_address: str
    user_agent: str
    country: Optional[str] = None
    city: Optional[str] = None
    
    # Conversion tracking
    converted: bool = False
    order_id: Optional[str] = None
    conversion_date: Optional[datetime] = None
    commission_earned: float = 0.0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True

class Commission(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    
    # Commission details
    affiliate_id: str
    order_id: str
    product_id: str
    
    # Amounts
    order_amount: float = Field(..., ge=0)
    commission_rate: float = Field(..., ge=0, le=1)
    commission_amount: float = Field(..., ge=0)
    
    # Status
    status: CommissionStatus = CommissionStatus.PENDING
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    
    # Additional information
    notes: Optional[str] = None
    
    class Config:
        allow_population_by_field_name = True
