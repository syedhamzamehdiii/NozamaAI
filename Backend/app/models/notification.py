from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class NotificationType(str, Enum):
    ORDER_CONFIRMATION = "order_confirmation"
    ORDER_COMPLETED = "order_completed"
    PRODUCT_APPROVED = "product_approved"
    PRODUCT_REJECTED = "product_rejected"
    NEW_REVIEW = "new_review"
    COMMISSION_EARNED = "commission_earned"
    PAYOUT_PROCESSED = "payout_processed"
    SYSTEM_ALERT = "system_alert"
    MARKETING = "marketing"

class NotificationChannel(str, Enum):
    EMAIL = "email"
    IN_APP = "in_app"
    SMS = "sms"
    PUSH = "push"

class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    READ = "read"

class Notification(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    
    # Recipient information
    user_id: str
    user_email: str
    
    # Notification content
    type: NotificationType
    channel: NotificationChannel
    title: str = Field(..., max_length=200)
    message: str = Field(..., max_length=1000)
    
    # Status
    status: NotificationStatus = NotificationStatus.PENDING
    
    # Additional data
    data: Dict[str, Any] = Field(default_factory=dict)
    action_url: Optional[str] = None
    
    # Scheduling
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Retry information
    retry_count: int = 0
    max_retries: int = 3
    
    class Config:
        allow_population_by_field_name = True
        schema_extra = {
            "example": {
                "user_email": "john@example.com",
                "type": "order_confirmation",
                "channel": "email",
                "title": "Order Confirmation",
                "message": "Your order has been confirmed and is being processed."
            }
        }
