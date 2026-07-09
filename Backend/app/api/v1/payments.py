# app/api/v1/payments.py
from fastapi import APIRouter, HTTPException, Request, Header, Depends, Body
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import stripe
import logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

from app.services.payment_service import PaymentService
from app.services.auth_service import get_current_user, require_admin
from app.models.user import User
from app.schemas.payment import (
    CreatePaymentIntent,
    PaymentIntentResponse,
    BankAccountCreate,
    BankAccountUpdate,
    AdminSettingsUpdate,
    PaymentAnalytics
)

router = APIRouter()

# Initialize payment service as a dependency
async def get_payment_service():
    return PaymentService()

# Payment Intent Endpoints
@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    payment_data: CreatePaymentIntent,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Create a payment intent for Stripe"""
    try:
        result = await payment_service.create_payment_intent(
            amount=payment_data.amount,
            currency=payment_data.currency,
            customer_email=payment_data.customer_email or current_user.email,
            metadata={
                "user_id": str(current_user.id),
                "order_id": payment_data.order_id,
                "items": payment_data.items
            }
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/confirm-payment/{payment_intent_id}")
async def confirm_payment(
    payment_intent_id: str,
    # REMOVED: current_user: User = Depends(get_current_user),  # Don't require auth for payment confirmation
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Confirm payment completion - No authentication required"""
    try:
        logger.info(f"💳 Confirming payment: {payment_intent_id}")
        
        # Verify payment intent directly with Stripe
        import stripe
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status != 'succeeded':
            raise HTTPException(
                status_code=400, 
                detail=f"Payment not successful. Status: {payment_intent.status}"
            )
        
        # Confirm payment in your service
        result = await payment_service.confirm_payment(payment_intent_id)
        
        logger.info(f"✅ Payment confirmed successfully: {payment_intent_id}")
        
        return {
            "success": True,
            "message": "Payment confirmed successfully",
            "payment_intent_id": payment_intent_id,
            "amount": payment_intent.amount / 100,  # Convert cents to dollars
            "status": payment_intent.status,
            **result  # Include any additional data from payment service
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"❌ Stripe error: {e}")
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Payment confirmation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# Stripe Webhook
@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Handle Stripe webhook events"""
    try:
        payload = await request.body()
        result = await payment_service.handle_stripe_webhook(
            payload,
            stripe_signature
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Admin Bank Account Management
@router.get("/admin/bank-accounts", dependencies=[Depends(require_admin)])
async def get_bank_accounts(
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Get all bank accounts for admin"""
    accounts = await payment_service.get_bank_accounts(str(current_user.id))
    return accounts

@router.post("/admin/bank-accounts", dependencies=[Depends(require_admin)])
async def add_bank_account(
    bank_data: BankAccountCreate,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Add a new bank account"""
    try:
        account = await payment_service.add_bank_account(
            admin_id=str(current_user.id),
            bank_data=bank_data.dict()
        )
        return account
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/admin/bank-accounts/{account_id}", dependencies=[Depends(require_admin)])
async def update_bank_account(
    account_id: str,
    updates: BankAccountUpdate,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Update bank account details"""
    try:
        account = await payment_service.update_bank_account(
            account_id=account_id,
            updates=updates.dict(exclude_unset=True)
        )
        return account
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/admin/bank-accounts/{account_id}", dependencies=[Depends(require_admin)])
async def delete_bank_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Delete a bank account"""
    try:
        result = await payment_service.delete_bank_account(account_id)
        return {"success": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Admin Settings
@router.get("/admin/settings", dependencies=[Depends(require_admin)])
async def get_admin_settings(
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Get current admin settings"""
    settings = await payment_service.get_admin_settings()
    return settings

@router.put("/admin/settings", dependencies=[Depends(require_admin)])
async def update_admin_settings(
    updates: AdminSettingsUpdate,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Update admin settings including token pool percentage"""
    try:
        settings = await payment_service.update_admin_settings(updates.dict(exclude_unset=True))
        return settings
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Payment Analytics
@router.get("/admin/analytics", dependencies=[Depends(require_admin)])
async def get_payment_analytics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Get payment analytics for dashboard"""
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()
        
    analytics = await payment_service.get_payment_analytics(start_date, end_date)
    return analytics

# Token Transfer History
@router.get("/admin/transfers", dependencies=[Depends(require_admin)])
async def get_token_transfers(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Get token transfer history"""
    transfers = await payment_service.get_recent_transfers(limit, offset, status)
    
    return {
        "transfers": transfers,
        "total": len(transfers),
        "limit": limit,
        "offset": offset
    }

# Payment History
@router.get("/payments/history")
async def get_payment_history(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Get user's payment history"""
    payments = await payment_service.get_recent_payments(limit, offset)
    
    # Filter by user's email
    user_payments = [p for p in payments if p.get("customer_email") == current_user.email]
    
    return {
        "payments": user_payments,
        "total": len(user_payments),
        "limit": limit,
        "offset": offset
    }

# Manual Token Transfer Trigger (Admin only)
@router.post("/admin/trigger-transfer", dependencies=[Depends(require_admin)])
async def trigger_manual_transfer(
    payment_id: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Manually trigger token pool transfer for a payment"""
    try:
        # Get payment from database
        payments = await payment_service.get_recent_payments(limit=1000)
        payment = next((p for p in payments if str(p["_id"]) == payment_id), None)
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        if payment.get("pool_transfer_triggered"):
            raise HTTPException(
                status_code=400,
                detail="Transfer already triggered for this payment"
            )
        
        # Get admin settings for percentage
        settings = await payment_service.get_admin_settings()
        pool_percentage = settings.get("token_pool_percentage", 10)
        
        # Trigger the transfer
        await payment_service._transfer_to_token_pool(
            payment_id=payment_id,
            amount_usd=float(payment["amount"] / 100 * pool_percentage / 100),
            payment_intent_id=payment.get("stripe_payment_intent_id", "manual")
        )
        
        return {"status": "success", "message": "Transfer initiated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Exchange Rate Check
@router.get("/exchange-rate")
async def get_exchange_rate(
    from_currency: str = "USD",
    to_currency: str = "USDC",
    amount: float = 1.0
):
    """Get current exchange rate"""
    # This would connect to your exchange API
    # For now, return mock data
    return {
        "from_currency": from_currency,
        "to_currency": to_currency,
        "amount": amount,
        "converted_amount": amount * 0.999,  # USDC is usually very close to 1:1
        "rate": 0.999,
        "timestamp": datetime.utcnow()
    }