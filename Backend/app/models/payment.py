# app/models/payment.py
from tortoise.models import Model
from tortoise import fields
from enum import Enum
from datetime import datetime

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"

class Payment(Model):
    id = fields.UUIDField(pk=True)
    stripe_payment_intent_id = fields.CharField(max_length=255, unique=True)
    order_id = fields.UUIDField(null=True)
    user_id = fields.UUIDField(null=True)
    amount = fields.IntField()  # Amount in cents
    currency = fields.CharField(max_length=3, default="usd")
    status = fields.CharEnumField(PaymentStatus, default=PaymentStatus.PENDING)
    customer_email = fields.CharField(max_length=255)
    customer_name = fields.CharField(max_length=255, null=True)
    
    # Payment method details
    payment_method = fields.CharField(max_length=50, default="card")
    card_last4 = fields.CharField(max_length=4, null=True)
    card_brand = fields.CharField(max_length=50, null=True)
    
    # Billing details
    billing_address = fields.JSONField(null=True)
    
    # Metadata
    metadata = fields.JSONField(default=dict)
    
    # Timestamps
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    completed_at = fields.DatetimeField(null=True)
    
    # Token pool transfer
    pool_transfer_triggered = fields.BooleanField(default=False)
    pool_transfer_percentage = fields.FloatField(null=True)
    pool_transfer_amount = fields.FloatField(null=True)
    
    class Meta:
        table = "payments"
        
class TokenTransfer(Model):
    id = fields.UUIDField(pk=True)
    payment_id = fields.UUIDField()
    amount_usd = fields.FloatField()
    amount_usdc = fields.FloatField()
    exchange_rate = fields.FloatField(null=True)
    
    # Blockchain details
    from_address = fields.CharField(max_length=255, null=True)
    to_address = fields.CharField(max_length=255)
    tx_hash = fields.CharField(max_length=255, unique=True, null=True)
    block_number = fields.IntField(null=True)
    gas_used = fields.IntField(null=True)
    
    # Status
    status = fields.CharField(max_length=50, default="pending")
    error_message = fields.TextField(null=True)
    
    # Exchange details
    exchange_provider = fields.CharField(max_length=50, null=True)
    exchange_order_id = fields.CharField(max_length=255, null=True)
    
    # Timestamps
    created_at = fields.DatetimeField(auto_now_add=True)
    transferred_at = fields.DatetimeField(null=True)
    confirmed_at = fields.DatetimeField(null=True)
    
    class Meta:
        table = "token_transfers"