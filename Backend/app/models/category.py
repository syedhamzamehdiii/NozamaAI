from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

class Category(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    
    # Hierarchy
    parent_id: Optional[str] = None
    level: int = Field(default=0, ge=0)
    sort_order: int = Field(default=0, ge=0)
    
    # Media
    icon: Optional[str] = None
    image_url: Optional[str] = None
    color: Optional[str] = None
    
    # SEO
    meta_title: Optional[str] = Field(None, max_length=60)
    meta_description: Optional[str] = Field(None, max_length=160)
    
    # Status
    is_active: bool = True
    is_featured: bool = False
    
    # Statistics
    product_count: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Additional metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('slug')
    def validate_slug(cls, v):
        import re
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError('Slug must contain only lowercase letters, numbers, and hyphens')
        return v
    
    class Config:
        allow_population_by_field_name = True
        schema_extra = {
            "example": {
                "name": "Natural Language Processing",
                "slug": "natural-language-processing",
                "description": "Tools and datasets for natural language processing tasks",
                "is_active": True
            }
        }
