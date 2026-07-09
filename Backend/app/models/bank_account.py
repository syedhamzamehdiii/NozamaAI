# app/models/bank_account.py
from tortoise.models import Model
from tortoise import fields

class BankAccount(Model):
    id = fields.UUIDField(pk=True)
    admin_id = fields.UUIDField()
    
    # Account details
    account_name = fields.CharField(max_length=255)
    account_number = fields.CharField(max_length=50)  # Encrypted in practice
    routing_number = fields.CharField(max_length=50)
    bank_name = fields.CharField(max_length=255)
    account_type = fields.CharField(max_length=50, default="checking")  # checking, savings
    
    # Stripe integration
    stripe_account_id = fields.CharField(max_length=255, null=True)
    stripe_bank_account_id = fields.CharField(max_length=255, null=True)
    
    # Status
    is_active = fields.BooleanField(default=True)
    is_primary = fields.BooleanField(default=False)
    is_verified = fields.BooleanField(default=False)
    
    # Timestamps
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    verified_at = fields.DatetimeField(null=True)
    
    class Meta:
        table = "bank_accounts"