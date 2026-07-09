# =============== app/models/order.py ===============
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class OrderStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"

class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    PAYPAL = "paypal"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"
    STRIPE = "stripe"

class OrderItem(BaseModel):
    product_id: str
    product_title: str
    product_slug: Optional[str] = None
    seller_id: str
    seller_name: str
    quantity: int = Field(..., ge=1)
    unit_price: float = Field(..., ge=0)
    total_price: float = Field(..., ge=0)
    license_type: str
    download_url: Optional[str] = None
    download_expires_at: Optional[datetime] = None

class BillingAddress(BaseModel):
    first_name: str
    last_name: str
    company: Optional[str] = None
    address_line_1: str
    address_line_2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str

class PaymentInfo(BaseModel):
    method: PaymentMethod
    transaction_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    last_four_digits: Optional[str] = None
    card_brand: Optional[str] = None
    payment_date: Optional[datetime] = None

class PromoCode(BaseModel):
    code: str
    discount_amount: float = Field(..., ge=0)
    discount_type: str  # 'percentage' or 'fixed'
    description: Optional[str] = None

class Order(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    order_number: str = Field(..., unique=True)
    
    # Customer information
    user_id: str
    user_email: str
    billing_address: BillingAddress
    
    # Order items
    items: List[OrderItem] = Field(..., min_items=1)
    
    # Pricing
    subtotal: float = Field(..., ge=0)
    discount_amount: float = Field(default=0, ge=0)
    tax_amount: float = Field(default=0, ge=0)
    total_amount: float = Field(..., ge=0)
    currency: str = "USD"
    
    # Promo code
    promo_code: Optional[PromoCode] = None
    
    # Status
    status: OrderStatus = OrderStatus.PENDING
    payment_status: PaymentStatus = PaymentStatus.PENDING
    
    # Payment information
    payment_info: Optional[PaymentInfo] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    # Additional data
    notes: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        allow_population_by_field_name = True
        schema_extra = {
            "example": {
                "order_number": "ORD-2024-001",
                "user_email": "john@example.com",
                "subtotal": 498.00,
                "total_amount": 498.00,
                "status": "completed"
            }
        }
