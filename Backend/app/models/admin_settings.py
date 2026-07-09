# app/models/admin_settings.py
from tortoise.models import Model
from tortoise import fields

class AdminSettings(Model):
    id = fields.UUIDField(pk=True)
    
    # Token pool settings
    token_pool_percentage = fields.FloatField(default=10.0)  # 10%, 15%, 20%, etc.
    token_pool_address = fields.CharField(max_length=255)
    
    # Exchange settings
    auto_convert_enabled = fields.BooleanField(default=False)
    exchange_provider = fields.CharField(max_length=50, default="coinbase")  # coinbase, binance, etc.
    exchange_api_key = fields.CharField(max_length=255, null=True)  # Encrypted
    exchange_api_secret = fields.CharField(max_length=255, null=True)  # Encrypted
    
    # Wallet settings
    wallet_address = fields.CharField(max_length=255, null=True)
    wallet_private_key = fields.CharField(max_length=255, null=True)  # Encrypted
    
    # Notification settings
    notify_on_payment = fields.BooleanField(default=True)
    notify_on_transfer = fields.BooleanField(default=True)
    notify_on_error = fields.BooleanField(default=True)
    notification_email = fields.CharField(max_length=255, null=True)
    
    # Thresholds
    min_transfer_amount = fields.FloatField(default=10.0)  # Minimum USD to transfer
    transfer_frequency = fields.CharField(max_length=50, default="immediate")  # immediate, daily, weekly
    
    # Timestamps
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    
    @classmethod
    async def get_current(cls):
        """Get current admin settings or create default"""
        settings = await cls.first()
        if not settings:
            settings = await cls.create()
        return settings
    
    class Meta:
        table = "admin_settings"