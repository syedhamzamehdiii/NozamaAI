# =============== app/models/review.py ===============
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"

class Review(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    
    # Review target
    product_id: str
    product_title: str
    
    # Reviewer information
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    verified_purchase: bool = False
    
    # Review content
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = Field(None, max_length=100)
    content: str = Field(..., min_length=10, max_length=2000)
    
    # Review metadata
    status: ReviewStatus = ReviewStatus.PENDING
    is_featured: bool = False
    helpful_count: int = 0
    not_helpful_count: int = 0
    
    # Response from seller
    seller_response: Optional[str] = Field(None, max_length=1000)
    seller_response_date: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Additional metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('rating')
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v
    
    class Config:
        allow_population_by_field_name = True
        schema_extra = {
            "example": {
                "product_id": "64f1234567890abcdef12345",
                "user_name": "John Doe",
                "rating": 5,
                "title": "Excellent AI toolkit!",
                "content": "This toolkit exceeded my expectations. Easy to use and well documented.",
                "verified_purchase": True
            }
        }
