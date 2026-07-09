# schemas/product.py - Updated for Pydantic v2
from pydantic import BaseModel, Field, HttpUrl, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.product import ProductCategory, ProductStatus, LicenseType

class ProductResponse(BaseModel):
    id: str
    title: str
    description: str
    short_description: str
    seller_id: str
    seller_name: str
    category: ProductCategory
    subcategory: Optional[str] = None
    tags: List[str] = []
    price: float
    original_price: Optional[float] = None
    currency: str = "USD"
    images: List[str] = []
    demo_video_url: Optional[HttpUrl] = None
    demo_url: Optional[HttpUrl] = None
    version: str
    license_type: LicenseType
    requirements: List[str] = []
    features: List[str] = []
    use_cases: List[str] = []
    status: ProductStatus
    featured: bool = False
    view_count: int = 0
    download_count: int = 0
    rating: float = 0.0
    rating_count: int = 0
    sales_count: int = 0
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "64f1234567890abcdef12345",
                "title": "Advanced NLP Toolkit",
                "short_description": "Comprehensive natural language processing toolkit",
                "price": 299.99,
                "category": "Natural Language Processing",
                "rating": 4.8,
                "sales_count": 156
            }
        }
    )

class ProductCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)
    short_description: str = Field(..., min_length=10, max_length=500)
    category: ProductCategory
    subcategory: Optional[str] = None
    tags: List[str] = Field(default=[], max_items=20)
    price: float = Field(..., ge=0)
    original_price: Optional[float] = Field(None, ge=0)
    images: List[str] = Field(default=[], max_items=10)
    demo_video_url: Optional[HttpUrl] = None
    demo_url: Optional[HttpUrl] = None
    version: str = "1.0.0"
    license_type: LicenseType = LicenseType.COMMERCIAL
    requirements: List[str] = Field(default=[])
    features: List[str] = Field(default=[])
    use_cases: List[str] = Field(default=[])
    meta_title: Optional[str] = Field(None, max_length=60)
    meta_description: Optional[str] = Field(None, max_length=160)

    @field_validator('original_price')
    def validate_original_price(cls, v, values):
        if v is not None and 'price' in values.data and v < values.data['price']:
            raise ValueError('Original price must be greater than or equal to current price')
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Advanced NLP Toolkit",
                "description": "A comprehensive toolkit for natural language processing...",
                "short_description": "Advanced NLP toolkit with pre-trained models",
                "category": "Natural Language Processing",
                "price": 299.99,
                "tags": ["nlp", "ai", "toolkit"],
                "version": "2.1.0"
            }
        }
    )

class ProductUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=5000)
    short_description: Optional[str] = Field(None, min_length=10, max_length=500)
    category: Optional[ProductCategory] = None
    subcategory: Optional[str] = None
    tags: Optional[List[str]] = Field(None, max_items=20)
    price: Optional[float] = Field(None, ge=0)
    original_price: Optional[float] = Field(None, ge=0)
    images: Optional[List[str]] = Field(None, max_items=10)
    demo_video_url: Optional[HttpUrl] = None
    demo_url: Optional[HttpUrl] = None
    version: Optional[str] = None
    license_type: Optional[LicenseType] = None
    requirements: Optional[List[str]] = None
    features: Optional[List[str]] = None
    use_cases: Optional[List[str]] = None

class ProductSearch(BaseModel):
    query: Optional[str] = None
    category: Optional[ProductCategory] = None
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    tags: Optional[List[str]] = None
    featured: Optional[bool] = None
    sort_by: str = Field("created_at", pattern="^(created_at|price|rating|sales_count|title)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)

class ProductFilter(BaseModel):
    categories: List[ProductCategory] = []
    price_ranges: List[Dict[str, float]] = []
    ratings: List[float] = []
    license_types: List[LicenseType] = []
