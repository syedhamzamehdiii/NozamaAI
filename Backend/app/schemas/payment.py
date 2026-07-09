# app/schemas/payment.py
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

class CreatePaymentIntent(BaseModel):
    amount: int = Field(..., description="Amount in cents")
    currency: str = Field(default="usd", description="Three-letter ISO currency code")
    customer_email: Optional[EmailStr] = None
    order_id: Optional[str] = None
    items: List[Dict[str, Any]] = Field(default_factory=list)
    
    @field_validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than 0')
        return v

class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str

class BankAccountCreate(BaseModel):
    account_name: str = Field(..., min_length=1)
    account_number: str = Field(..., min_length=4)
    routing_number: str = Field(..., pattern="^[0-9]{9}$")
    bank_name: str = Field(..., min_length=1)
    account_type: str = Field(default="checking", pattern="^(checking|savings)$")
    is_primary: bool = Field(default=False)
    create_stripe_account: bool = Field(default=True)
    email: Optional[EmailStr] = None

class BankAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    bank_name: Optional[str] = None
    account_type: Optional[str] = None
    is_primary: Optional[bool] = None
    is_active: Optional[bool] = None

class AdminSettingsUpdate(BaseModel):
    token_pool_percentage: Optional[float] = Field(None, ge=0, le=100)
    token_pool_address: Optional[str] = Field(None, pattern="^0x[a-fA-F0-9]{40}$")
    auto_convert_enabled: Optional[bool] = None
    exchange_provider: Optional[str] = Field(None, pattern="^(coinbase|binance|kraken)$")
    min_transfer_amount: Optional[float] = Field(None, ge=1)
    transfer_frequency: Optional[str] = Field(None, pattern="^(immediate|daily|weekly|monthly)$")
    notify_on_payment: Optional[bool] = None
    notify_on_transfer: Optional[bool] = None
    notify_on_error: Optional[bool] = None
    notification_email: Optional[EmailStr] = None

class PaymentAnalytics(BaseModel):
    total_revenue: float
    total_payments: int
    total_to_pool_usd: float
    total_to_pool_usdc: float
    total_transfers: int
    average_payment: float
    pool_percentage: float
    period_start: datetime
    period_end: datetime

class PaymentStatus(BaseModel):
    payment_id: str
    status: str
    amount: float
    currency: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    
class TokenTransferStatus(BaseModel):
    transfer_id: str
    payment_id: str
    amount_usd: float
    amount_usdc: float
    status: str
    tx_hash: Optional[str] = None
    created_at: datetime
    transferred_at: Optional[datetime] = None

class WebhookEvent(BaseModel):
    type: str
    data: Dict[str, Any]
    created: int
    
class ExchangeRate(BaseModel):
    from_currency: str
    to_currency: str
    rate: float
    timestamp: datetime