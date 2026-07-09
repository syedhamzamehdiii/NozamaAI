from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.order import OrderStatus, PaymentStatus, PaymentMethod

class CartItem(BaseModel):
    product_id: str
    quantity: int = Field(..., ge=1)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "product_id": "64f1234567890abcdef12345",
                "quantity": 1
            }
        }
    )

class BillingAddressSchema(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    company: Optional[str] = Field(None, max_length=100)
    address_line_1: str = Field(..., min_length=5, max_length=100)
    address_line_2: Optional[str] = Field(None, max_length=100)
    city: str = Field(..., min_length=1, max_length=50)
    state: str = Field(..., min_length=1, max_length=50)
    postal_code: str = Field(..., min_length=3, max_length=20)
    country: str = Field(..., min_length=2, max_length=2)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "first_name": "John",
                "last_name": "Doe",
                "address_line_1": "123 Main Street",
                "city": "San Francisco",
                "state": "CA",
                "postal_code": "94105",
                "country": "US"
            }
        }
    )

class CheckoutRequest(BaseModel):
    items: List[CartItem] = Field(..., min_length=1)
    billing_address: BillingAddressSchema
    payment_method_id: str
    promo_code: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [
                    {"product_id": "64f1234567890abcdef12345", "quantity": 1}
                ],
                "billing_address": {
                    "first_name": "John",
                    "last_name": "Doe",
                    "address_line_1": "123 Main Street",
                    "city": "San Francisco",
                    "state": "CA",
                    "postal_code": "94105",
                    "country": "US"
                },
                "payment_method_id": "pm_1234567890abcdef"
            }
        }
    )

class OrderItemResponse(BaseModel):
    product_id: str
    product_title: str
    seller_name: str
    quantity: int
    unit_price: float
    total_price: float
    license_type: str
    download_url: Optional[str] = None

class OrderResponse(BaseModel):
    id: str = Field(..., alias="_id")  # maps MongoDB's _id field
    order_number: str
    user_id: str
    user_email: EmailStr
    items: List[OrderItemResponse]
    subtotal: float
    discount_amount: float = 0.0
    tax_amount: float = 0.0
    total_amount: float
    currency: str = "USD"
    status: OrderStatus
    payment_status: PaymentStatus
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,  # allow alias usage like _id → id
        json_encoders={
            # If any nested ObjectId accidentally slips through
            "ObjectId": str
        },
        json_schema_extra={
            "example": {
                "id": "64f1234567890abcdef12345",
                "order_number": "ORD-2024-001",
                "user_email": "john@example.com",
                "subtotal": 299.99,
                "total_amount": 299.99,
                "status": "completed",
                "payment_status": "paid"
            }
        }
    )

class OrderCreate(BaseModel):
    user_id: str
    items: List[CartItem]
    billing_address: BillingAddressSchema
    promo_code: Optional[str] = None

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    payment_status: Optional[PaymentStatus] = None
    notes: Optional[str] = None