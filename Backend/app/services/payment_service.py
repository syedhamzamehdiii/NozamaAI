# app/services/payment_service.py
import stripe
import os
from typing import Dict, Any, Optional, List
from datetime import datetime
from decimal import Decimal
import aiohttp
import asyncio
from web3 import Web3
from eth_account import Account
import json
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from app.config.settings import settings
from app.services.notification_service import NotificationService
from app.services.email_service import EmailService

stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentService:
    def __init__(self):
        self.client = AsyncIOMotorClient(settings.MONGODB_URL)
        self.db = self.client[settings.DATABASE_NAME]
        
        # Collections
        self.payments_collection = self.db.payments
        self.token_transfers_collection = self.db.token_transfers
        self.bank_accounts_collection = self.db.bank_accounts
        self.admin_settings_collection = self.db.admin_settings
        self.payment_logs_collection = self.db.payment_logs
        
        # Web3 setup
        if settings.WEB3_PROVIDER_URL:
            self.web3 = Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER_URL))
        else:
            self.web3 = None
            
        # Initialize services with db connection
        try:
            self.notification_service = NotificationService(self.db)
        except:
            self.notification_service = None
            
        try:
            self.email_service = EmailService(self.db)
        except:
            self.email_service = None
        
        # USDC Contract details
        self.usdc_address = settings.USDC_CONTRACT_ADDRESS
        self.pool_address = settings.AI_TOKEN_POOL_ADDRESS
        
        # Load USDC ABI if available
        try:
            with open('app/contracts/usdc_abi.json', 'r') as f:
                self.usdc_abi = json.load(f)
        except:
            self.usdc_abi = None
            
    async def create_payment_intent(
        self,
        amount: int,  # Amount in cents
        currency: str = "usd",
        customer_email: str = None,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create a Stripe payment intent"""
        try:
            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                payment_method_types=['card'],
                receipt_email=customer_email,
                metadata=metadata or {}
            )
            
            # Store payment record in MongoDB
            payment_doc = {
                "stripe_payment_intent_id": payment_intent.id,
                "amount": amount,
                "currency": currency,
                "customer_email": customer_email,
                "status": "pending",
                "metadata": metadata,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = await self.payments_collection.insert_one(payment_doc)
            
            return {
                "client_secret": payment_intent.client_secret,
                "payment_intent_id": payment_intent.id
            }
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
            
    async def confirm_payment(self, payment_intent_id: str) -> Dict[str, Any]:
        """Confirm payment and trigger token pool transfer"""
        try:
            # Retrieve payment intent from Stripe
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if payment_intent.status == 'succeeded':
                # Update payment record
                await self.payments_collection.update_one(
                    {"stripe_payment_intent_id": payment_intent_id},
                    {
                        "$set": {
                            "status": "completed",
                            "completed_at": datetime.utcnow(),
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                # Get payment record
                payment = await self.payments_collection.find_one(
                    {"stripe_payment_intent_id": payment_intent_id}
                )
                
                # Get admin settings for token pool percentage
                admin_settings = await self.get_admin_settings()
                pool_percentage = admin_settings.get("token_pool_percentage", 10)
                
                # Calculate amount to send to token pool
                total_amount = Decimal(payment_intent.amount) / 100  # Convert cents to dollars
                pool_amount = total_amount * Decimal(pool_percentage) / 100
                
                # Trigger async token pool transfer
                asyncio.create_task(self._transfer_to_token_pool(
                    payment_id=str(payment["_id"]),
                    amount_usd=float(pool_amount),
                    payment_intent_id=payment_intent_id
                ))
                
                # Send confirmation email
                if self.email_service:
                    await self.email_service.send_payment_confirmation(
                        customer_email=payment["customer_email"],
                        amount=total_amount,
                        order_id=payment_intent.metadata.get('order_id')
                    )
                
                return {
                    "status": "success",
                    "payment_id": str(payment["_id"]),
                    "amount": float(total_amount),
                    "pool_amount": float(pool_amount)
                }
            else:
                return {"status": "pending", "payment_status": payment_intent.status}
                
        except Exception as e:
            raise Exception(f"Payment confirmation error: {str(e)}")
            
    async def _transfer_to_token_pool(
        self,
        payment_id: str,
        amount_usd: float,
        payment_intent_id: str
    ):
        """Convert USD to USDC and transfer to AI token pool"""
        try:
            # Create transfer record
            transfer_doc = {
                "payment_id": payment_id,
                "amount_usd": amount_usd,
                "amount_usdc": 0,
                "status": "pending",
                "created_at": datetime.utcnow()
            }
            
            transfer_result = await self.token_transfers_collection.insert_one(transfer_doc)
            transfer_id = str(transfer_result.inserted_id)
            
            # Step 1: Convert USD to USDC via exchange API
            usdc_amount = await self._convert_usd_to_usdc(amount_usd)
            
            # Update transfer with USDC amount
            await self.token_transfers_collection.update_one(
                {"_id": ObjectId(transfer_id)},
                {"$set": {"amount_usdc": usdc_amount}}
            )
            
            # Step 2: Transfer USDC to token pool (if Web3 is configured)
            if self.web3 and self.pool_address:
                tx_hash = await self._send_usdc_to_pool(usdc_amount)
                
                # Update transfer record
                await self.token_transfers_collection.update_one(
                    {"_id": ObjectId(transfer_id)},
                    {
                        "$set": {
                            "tx_hash": tx_hash,
                            "status": "completed",
                            "transferred_at": datetime.utcnow()
                        }
                    }
                )
            else:
                # Mark as completed without blockchain transfer
                await self.token_transfers_collection.update_one(
                    {"_id": ObjectId(transfer_id)},
                    {
                        "$set": {
                            "status": "completed",
                            "transferred_at": datetime.utcnow(),
                            "note": "Blockchain transfer skipped - Web3 not configured"
                        }
                    }
                )
            
            # Update payment record
            await self.payments_collection.update_one(
                {"_id": ObjectId(payment_id)},
                {
                    "$set": {
                        "pool_transfer_triggered": True,
                        "pool_transfer_percentage": admin_settings.get("token_pool_percentage", 10),
                        "pool_transfer_amount": amount_usd
                    }
                }
            )
            
            # Notify admin of successful transfer
            if self.notification_service:
                await self.notification_service.notify_admin(
                    title="Token Pool Transfer Complete",
                    message=f"${amount_usd:.2f} ({usdc_amount:.2f} USDC) transferred to AI token pool",
                    data={"tx_hash": tx_hash if self.web3 else None, "payment_intent_id": payment_intent_id}
                )
            
        except Exception as e:
            # Update transfer record with error
            await self.token_transfers_collection.update_one(
                {"payment_id": payment_id},
                {
                    "$set": {
                        "status": "failed",
                        "error_message": str(e),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Log error and notify admin
            if self.notification_service:
                await self.notification_service.notify_admin(
                    title="Token Pool Transfer Failed",
                    message=f"Failed to transfer ${amount_usd:.2f} to token pool: {str(e)}",
                    data={"payment_id": payment_id, "error": str(e)}
                )
            
    async def _convert_usd_to_usdc(self, amount_usd: float) -> float:
        """Convert USD to USDC using exchange API"""
        admin_settings = await self.get_admin_settings()
        
        if admin_settings.get("auto_convert_enabled", False):
            # Automatic conversion via exchange API
            exchange_provider = admin_settings.get("exchange_provider", "coinbase")
            
            if exchange_provider == "coinbase" and settings.COINBASE_API_KEY:
                return await self._coinbase_convert(amount_usd)
            elif exchange_provider == "binance" and settings.BINANCE_API_KEY:
                return await self._binance_convert(amount_usd)
            else:
                # Default to 1:1 for USDC
                return amount_usd
        else:
            # Manual conversion - just record the amount
            return amount_usd
            
    async def _coinbase_convert(self, amount_usd: float) -> float:
        """Convert USD to USDC via Coinbase API"""
        # This is a placeholder - implement actual API calls
        # For now, return 1:1 conversion
        return amount_usd
            
    async def _binance_convert(self, amount_usd: float) -> float:
        """Convert USD to USDC via Binance API"""
        # This is a placeholder - implement actual API calls
        # For now, return 1:1 conversion
        return amount_usd
                
    async def _send_usdc_to_pool(self, amount: float) -> str:
        """Send USDC to the AI token pool smart contract"""
        if not self.web3 or not self.usdc_address or not self.pool_address:
            raise Exception("Web3 or contract addresses not configured")
            
        try:
            admin_settings = await self.get_admin_settings()
            private_key = admin_settings.get("wallet_private_key") or settings.ADMIN_PRIVATE_KEY
            
            if not private_key:
                raise Exception("Admin wallet private key not configured")
                
            account = Account.from_key(private_key)
            
            # Initialize USDC contract
            usdc_contract = self.web3.eth.contract(
                address=self.usdc_address,
                abi=self.usdc_abi or self._get_minimal_erc20_abi()
            )
            
            # Convert amount to Wei (USDC has 6 decimals)
            amount_wei = int(amount * 10**6)
            
            # Build and send approve transaction
            nonce = self.web3.eth.get_transaction_count(account.address)
            
            approve_tx = usdc_contract.functions.approve(
                self.pool_address,
                amount_wei
            ).build_transaction({
                'from': account.address,
                'nonce': nonce,
                'gas': 100000,
                'gasPrice': self.web3.toWei('20', 'gwei')
            })
            
            signed_approve = account.sign_transaction(approve_tx)
            approve_hash = self.web3.eth.send_raw_transaction(signed_approve.rawTransaction)
            
            # Wait for approval confirmation
            self.web3.eth.wait_for_transaction_receipt(approve_hash)
            
            # For now, just return the approval hash
            # In production, you would also call the pool's deposit function
            return approve_hash.hex()
            
        except Exception as e:
            raise Exception(f"Blockchain transaction failed: {str(e)}")
            
    def _get_minimal_erc20_abi(self):
        """Get minimal ERC20 ABI for approve function"""
        return [
            {
                "inputs": [
                    {"name": "spender", "type": "address"},
                    {"name": "amount", "type": "uint256"}
                ],
                "name": "approve",
                "outputs": [{"name": "", "type": "bool"}],
                "type": "function"
            }
        ]
        
    async def get_admin_settings(self) -> Dict[str, Any]:
        """Get current admin settings"""
        settings_doc = await self.admin_settings_collection.find_one({})
        
        if not settings_doc:
            # Create default settings
            default_settings = {
                "token_pool_percentage": 10.0,
                "auto_convert_enabled": False,
                "exchange_provider": "coinbase",
                "min_transfer_amount": 10.0,
                "transfer_frequency": "immediate",
                "notify_on_payment": True,
                "notify_on_transfer": True,
                "notify_on_error": True,
                "created_at": datetime.utcnow()
            }
            
            await self.admin_settings_collection.insert_one(default_settings)
            return default_settings
            
        return settings_doc
        
    async def update_admin_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update admin settings"""
        updates["updated_at"] = datetime.utcnow()
        
        result = await self.admin_settings_collection.update_one(
            {},
            {"$set": updates},
            upsert=True
        )
        
        return await self.get_admin_settings()
        
    async def create_stripe_webhook_endpoint(self) -> str:
        """Create webhook endpoint for Stripe events"""
        webhook_endpoint = stripe.WebhookEndpoint.create(
            url=f"{settings.BASE_URL}/api/v1/payments/webhook",
            enabled_events=[
                "payment_intent.succeeded",
                "payment_intent.payment_failed",
                "charge.succeeded",
                "charge.failed"
            ]
        )
        return webhook_endpoint.secret
        
    async def handle_stripe_webhook(self, payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Handle Stripe webhook events"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            
            # Log the event
            await self.payment_logs_collection.insert_one({
                "event_type": event.type,
                "event_id": event.id,
                "data": event.data.object,
                "created_at": datetime.utcnow()
            })
            
            if event.type == 'payment_intent.succeeded':
                payment_intent = event.data.object
                await self.confirm_payment(payment_intent.id)
                
            elif event.type == 'payment_intent.payment_failed':
                payment_intent = event.data.object
                await self.payments_collection.update_one(
                    {"stripe_payment_intent_id": payment_intent.id},
                    {"$set": {"status": "failed", "updated_at": datetime.utcnow()}}
                )
                
            return {"status": "success", "event_type": event.type}
            
        except ValueError:
            raise Exception("Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise Exception("Invalid signature")
            
    # Bank Account Management
    async def add_bank_account(self, admin_id: str, bank_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new bank account for admin"""
        bank_account = {
            "admin_id": admin_id,
            "account_name": bank_data['account_name'],
            "account_number": bank_data['account_number'],  # Should be encrypted in production
            "routing_number": bank_data['routing_number'],
            "bank_name": bank_data['bank_name'],
            "account_type": bank_data.get('account_type', 'checking'),
            "is_primary": bank_data.get('is_primary', False),
            "is_active": True,
            "is_verified": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # If setting as primary, unset other primary accounts
        if bank_account["is_primary"]:
            await self.bank_accounts_collection.update_many(
                {"admin_id": admin_id},
                {"$set": {"is_primary": False}}
            )
        
        result = await self.bank_accounts_collection.insert_one(bank_account)
        bank_account["_id"] = str(result.inserted_id)
        
        # Create Stripe bank account if requested
        if bank_data.get('create_stripe_account', True) and settings.STRIPE_SECRET_KEY:
            try:
                stripe_account = stripe.Account.create(
                    type='custom',
                    country='US',
                    email=bank_data.get('email'),
                    capabilities={
                        'card_payments': {'requested': True},
                        'transfers': {'requested': True},
                    }
                )
                
                await self.bank_accounts_collection.update_one(
                    {"_id": result.inserted_id},
                    {"$set": {"stripe_account_id": stripe_account.id}}
                )
                
                bank_account["stripe_account_id"] = stripe_account.id
            except:
                pass  # Continue even if Stripe account creation fails
                
        return bank_account
        
    async def get_bank_accounts(self, admin_id: str) -> List[Dict[str, Any]]:
        """Get all bank accounts for an admin"""
        cursor = self.bank_accounts_collection.find({"admin_id": admin_id})
        accounts = []
        async for account in cursor:
            account["_id"] = str(account["_id"])
            # Mask account number for security
            account["account_number"] = "****" + account["account_number"][-4:]
            accounts.append(account)
        return accounts
        
    async def update_bank_account(self, account_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update bank account details"""
        updates["updated_at"] = datetime.utcnow()
        
        # If setting as primary, unset other primary accounts
        if updates.get("is_primary"):
            account = await self.bank_accounts_collection.find_one({"_id": ObjectId(account_id)})
            if account:
                await self.bank_accounts_collection.update_many(
                    {"admin_id": account["admin_id"], "_id": {"$ne": ObjectId(account_id)}},
                    {"$set": {"is_primary": False}}
                )
        
        await self.bank_accounts_collection.update_one(
            {"_id": ObjectId(account_id)},
            {"$set": updates}
        )
        
        account = await self.bank_accounts_collection.find_one({"_id": ObjectId(account_id)})
        account["_id"] = str(account["_id"])
        return account
        
    async def delete_bank_account(self, account_id: str) -> bool:
        """Delete a bank account"""
        account = await self.bank_accounts_collection.find_one({"_id": ObjectId(account_id)})
        
        if not account:
            raise Exception("Bank account not found")
            
        # Don't delete if it's the only account
        account_count = await self.bank_accounts_collection.count_documents({"admin_id": account["admin_id"]})
        if account_count <= 1:
            raise Exception("Cannot delete the only bank account")
            
        # Remove from Stripe if connected
        if account.get("stripe_account_id") and settings.STRIPE_SECRET_KEY:
            try:
                stripe.Account.delete(account["stripe_account_id"])
            except:
                pass  # Continue even if Stripe deletion fails
                
        result = await self.bank_accounts_collection.delete_one({"_id": ObjectId(account_id)})
        return result.deleted_count > 0
        
    async def get_payment_analytics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get payment analytics for dashboard"""
        # Aggregate payment data
        pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start_date, "$lte": end_date},
                    "status": "completed"
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_revenue": {"$sum": "$amount"},
                    "total_payments": {"$sum": 1},
                    "average_payment": {"$avg": "$amount"}
                }
            }
        ]
        
        payment_stats = await self.payments_collection.aggregate(pipeline).to_list(1)
        
        # Aggregate transfer data
        transfer_pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start_date, "$lte": end_date},
                    "status": "completed"
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_to_pool_usd": {"$sum": "$amount_usd"},
                    "total_to_pool_usdc": {"$sum": "$amount_usdc"},
                    "total_transfers": {"$sum": 1}
                }
            }
        ]
        
        transfer_stats = await self.token_transfers_collection.aggregate(transfer_pipeline).to_list(1)
        
        # Combine results
        payment_data = payment_stats[0] if payment_stats else {}
        transfer_data = transfer_stats[0] if transfer_stats else {}
        
        total_revenue = payment_data.get("total_revenue", 0) / 100  # Convert cents to dollars
        total_to_pool = transfer_data.get("total_to_pool_usd", 0)
        
        return {
            "total_revenue": float(total_revenue),
            "total_payments": payment_data.get("total_payments", 0),
            "total_to_pool_usd": float(total_to_pool),
            "total_to_pool_usdc": float(transfer_data.get("total_to_pool_usdc", 0)),
            "total_transfers": transfer_data.get("total_transfers", 0),
            "average_payment": float(payment_data.get("average_payment", 0) / 100) if payment_data.get("average_payment") else 0,
            "pool_percentage": float(total_to_pool / total_revenue * 100) if total_revenue > 0 else 0
        }
        
    async def get_recent_payments(self, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """Get recent payments"""
        cursor = self.payments_collection.find().sort("created_at", -1).skip(offset).limit(limit)
        payments = []
        async for payment in cursor:
            payment["_id"] = str(payment["_id"])
            payments.append(payment)
        return payments
        
    async def get_recent_transfers(self, limit: int = 20, offset: int = 0, status: str = None) -> List[Dict[str, Any]]:
        """Get recent token transfers"""
        query = {}
        if status:
            query["status"] = status
            
        cursor = self.token_transfers_collection.find(query).sort("created_at", -1).skip(offset).limit(limit)
        transfers = []
        async for transfer in cursor:
            transfer["_id"] = str(transfer["_id"])
            transfers.append(transfer)
        return transfers