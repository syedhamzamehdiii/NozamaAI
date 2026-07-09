# =============== app/models/product.py ===============
from pydantic import BaseModel, Field, HttpUrl, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ProductCategory(str, Enum):
    NLP = "Natural Language Processing"
    COMPUTER_VISION = "Computer Vision"
    MACHINE_LEARNING = "Machine Learning"
    DATA_SCIENCE = "Data Science"
    DEEP_LEARNING = "Deep Learning"
    ROBOTICS = "Robotics"
    OTHER = "Other"

class ProductStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"
    ARCHIVED = "archived"

class LicenseType(str, Enum):
    COMMERCIAL = "commercial"
    PERSONAL = "personal"
    OPEN_SOURCE = "open_source"
    ENTERPRISE = "enterprise"

class ProductFile(BaseModel):
    filename: str
    file_path: str
    file_size: int
    mime_type: str
    upload_date: datetime = Field(default_factory=datetime.utcnow)

class Product(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "title": "Advanced NLP Toolkit",
                "description": "A comprehensive toolkit for natural language processing tasks...",
                "short_description": "Advanced NLP toolkit with pre-trained models",
                "category": "Natural Language Processing",
                "price": 299.99,
                "tags": ["nlp", "ai", "toolkit"],
                "version": "2.1.0"
            }
        }
    )

    id: Optional[str] = Field(None, alias="_id")
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)
    short_description: str = Field(..., min_length=10, max_length=500)
    
    # Seller information
    seller_id: str
    seller_name: str
    
    # Categorization
    category: ProductCategory
    subcategory: Optional[str] = None
    tags: List[str] = Field(default_factory=list, max_length=20)
    
    # Pricing
    price: float = Field(..., ge=0)
    original_price: Optional[float] = Field(None, ge=0)
    currency: str = "USD"
    
    # Media
    images: List[str] = Field(default_factory=list, max_length=10)
    demo_video_url: Optional[HttpUrl] = None
    demo_url: Optional[HttpUrl] = None
    
    # Files
    files: List[ProductFile] = Field(default_factory=list)
    
    # Product details
    version: str = "1.0.0"
    license_type: LicenseType = LicenseType.COMMERCIAL
    requirements: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    use_cases: List[str] = Field(default_factory=list)
    
    # Status and moderation
    status: ProductStatus = ProductStatus.DRAFT
    featured: bool = False
    is_active: bool = True
    
    # Statistics
    view_count: int = 0
    download_count: int = 0
    rating: float = 0.0
    rating_count: int = 0
    sales_count: int = 0
    revenue: float = 0.0
    
    # SEO
    meta_title: Optional[str] = Field(None, max_length=60)
    meta_description: Optional[str] = Field(None, max_length=160)
    slug: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = None
    
    # Additional metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v):
        if v:
            # Remove duplicates and empty strings
            v = list(set([tag.strip().lower() for tag in v if tag.strip()]))
        return v
    
    @field_validator('original_price')
    @classmethod
    def validate_original_price(cls, v, info):
        if v is not None and info.data.get('price'):
            if v < info.data['price']:
                raise ValueError('Original price must be greater than or equal to current price')
        return v

class ProductCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)
    short_description: str = Field(..., min_length=10, max_length=500)
    category: ProductCategory
    subcategory: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    price: float = Field(..., ge=0)
    original_price: Optional[float] = Field(None, ge=0)
    version: str = "1.0.0"
    license_type: LicenseType = LicenseType.COMMERCIAL
    requirements: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    use_cases: List[str] = Field(default_factory=list)

class ProductUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=5000)
    short_description: Optional[str] = Field(None, min_length=10, max_length=500)
    category: Optional[ProductCategory] = None
    subcategory: Optional[str] = None
    tags: Optional[List[str]] = None
    price: Optional[float] = Field(None, ge=0)
    original_price: Optional[float] = Field(None, ge=0)
    version: Optional[str] = None
    license_type: Optional[LicenseType] = None
    requirements: Optional[List[str]] = None
    features: Optional[List[str]] = None
    use_cases: Optional[List[str]] = None
    is_active: Optional[bool] = None