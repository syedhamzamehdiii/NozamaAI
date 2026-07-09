# app/models/payment_log.py
from tortoise.models import Model
from tortoise import fields

class PaymentLog(Model):
    id = fields.UUIDField(pk=True)
    payment_id = fields.UUIDField(null=True)
    transfer_id = fields.UUIDField(null=True)
    
    # Log details
    event_type = fields.CharField(max_length=100)  # payment_created, transfer_initiated, etc.
    status = fields.CharField(max_length=50)
    message = fields.TextField()
    
    # Additional data
    data = fields.JSONField(default=dict)
    
    # Error tracking
    is_error = fields.BooleanField(default=False)
    error_code = fields.CharField(max_length=100, null=True)
    error_details = fields.JSONField(null=True)
    
    # Source
    source = fields.CharField(max_length=50, default="system")  # system, stripe, blockchain, exchange
    
    # Timestamp
    created_at = fields.DatetimeField(auto_now_add=True)
    
    class Meta:
        table = "payment_logs"