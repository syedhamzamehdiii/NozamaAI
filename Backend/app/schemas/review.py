from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from app.models.review import ReviewStatus

class ReviewResponse(BaseModel):
    id: str
    product_id: str
    product_title: str
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    verified_purchase: bool
    rating: int
    title: Optional[str] = None
    content: str
    status: ReviewStatus
    helpful_count: int = 0
    not_helpful_count: int = 0
    seller_response: Optional[str] = None
    seller_response_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        schema_extra = {
            "example": {
                "id": "64f1234567890abcdef12345",
                "product_title": "Advanced NLP Toolkit",
                "user_name": "John Doe",
                "rating": 5,
                "title": "Excellent toolkit!",
                "content": "This AI toolkit exceeded my expectations...",
                "verified_purchase": True,
                "helpful_count": 12
            }
        }

class ReviewCreate(BaseModel):
    product_id: str
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = Field(None, max_length=100)
    content: str = Field(..., min_length=10, max_length=2000)

    @validator('rating')
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v

    class Config:
        schema_extra = {
            "example": {
                "product_id": "64f1234567890abcdef12345",
                "rating": 5,
                "title": "Excellent AI toolkit!",
                "content": "This toolkit exceeded my expectations. Easy to use and well documented."
            }
        }

class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, max_length=100)
    content: Optional[str] = Field(None, min_length=10, max_length=2000)

class SellerResponse(BaseModel):
    response: str = Field(..., min_length=10, max_length=1000)

    class Config:
        schema_extra = {
            "example": {
                "response": "Thank you for your feedback! We're glad you found the toolkit helpful."
            }
        }

class ReviewHelpful(BaseModel):
    helpful: bool