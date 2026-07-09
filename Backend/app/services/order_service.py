# =============== app/services/order_service.py ===============
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import secrets
import string
import zipfile
import tempfile
import os
from pathlib import Path
    

from app.models.order import Order, OrderStatus, PaymentStatus, OrderItem, BillingAddress, PromoCode
from app.services.payment_service import PaymentService
from app.services.email_service import EmailService
from app.services.notification_service import NotificationService
from app.services.license_service import LicenseService

class OrderService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.orders_collection = db.orders
        self.products_collection = db.products
        self.users_collection = db.users
        self.payment_service = PaymentService()
        self.email_service = None
        self.notification_service = NotificationService(db)
        self.license_service = LicenseService(db)
    
    async def user_has_purchased_product(self, user_id: str, product_id: str) -> bool:
        """Check if the user has a completed order that includes the given product."""
        try:
            query = {
                "user_id": user_id,
                "status": OrderStatus.COMPLETED,
                "items": {"$elemMatch": {"product_id": product_id}}
            }
            count = await self.orders_collection.count_documents(query)
            return count > 0
        except Exception:
            return False

    async def create_order(self, order_data: Dict[str, Any], user_id: str) -> Order:
        """Create a new order"""
        try:
            # Get user information
            user_filter = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
            user = await self.users_collection.find_one(user_filter)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Validate cart items and calculate totals
            validated_items, subtotal = await self._validate_cart_items(order_data["items"])
            
            # Apply promo code if provided
            promo_code = None
            discount_amount = 0
            if order_data.get("promo_code"):
                promo_code, discount_amount = await self._validate_promo_code(
                    order_data["promo_code"], subtotal
                )
            
            # Calculate final total
            total_amount = subtotal - discount_amount
            
            # Generate unique order number
            order_number = await self._generate_order_number()
            
            # Create order object
            order = Order(
                order_number=order_number,
                user_id=user_id,
                user_email=user["email"],
                billing_address=BillingAddress(**order_data["billing_address"]),
                items=validated_items,
                subtotal=subtotal,
                discount_amount=discount_amount,
                total_amount=total_amount,
                promo_code=promo_code,
                status=OrderStatus.PENDING,
                payment_status=PaymentStatus.PENDING
            )
            
            # Insert order into database
            result = await self.orders_collection.insert_one(order.dict(by_alias=True))
            order.id = str(result.inserted_id)
            
            return order
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create order: {str(e)}"
            )
    
    async def process_payment(self, order_id: str, payment_data: Dict[str, Any]) -> Order:
        """Process payment for order"""
        try:
            order = await self.get_order_by_id(order_id)
            if not order:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Order not found"
                )
            
            if order.status != OrderStatus.PENDING:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Order is not in pending status"
                )
            
            # Process payment
            payment_result = await self.payment_service.process_payment(
                amount=order.total_amount,
                currency=order.currency,
                payment_method=payment_data["payment_method"],
                payment_details=payment_data,
                order_id=order_id
            )
            
            if payment_result["success"]:
                # Update order with payment information
                await self.orders_collection.update_one(
                    {"_id": ObjectId(order_id)},
                    {
                        "$set": {
                            "payment_status": PaymentStatus.PAID,
                            "status": OrderStatus.PROCESSING,
                            "payment_info": payment_result["payment_info"],
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                # Process order fulfillment
                await self._fulfill_order(order_id)
                
                # Send confirmation email
                await self._send_order_confirmation_email(order_id)
                
                return await self.get_order_by_id(order_id)
            else:
                # Update order with failed payment
                await self.orders_collection.update_one(
                    {"_id": ObjectId(order_id)},
                    {
                        "$set": {
                            "payment_status": PaymentStatus.FAILED,
                            "status": OrderStatus.FAILED,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Payment failed: {payment_result.get('error', 'Unknown error')}"
                )
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process payment: {str(e)}"
            )
    
    async def get_order_by_id(self, order_id: str) -> Optional[Order]:
        """Get order by ID"""
        try:
            order_data = await self.orders_collection.find_one({"_id": ObjectId(order_id)})
            if order_data:
                return Order(**order_data)
            return None
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch order: {str(e)}"
            )
    
    async def get_user_orders(
        self, 
        user_id: str, 
        skip: int = 0, 
        limit: int = 20,
        status: Optional[OrderStatus] = None
    ) -> Dict[str, Any]:
        """Get user's orders"""
        try:
            filter_query = {"user_id": user_id}
            if status:
                filter_query["status"] = status
            
            # Get total count
            total = await self.orders_collection.count_documents(filter_query)
            
            # Get orders
            cursor = self.orders_collection.find(filter_query)
            cursor.skip(skip).limit(limit).sort("created_at", -1)
            
            orders_data = await cursor.to_list(length=limit)
            orders = [Order(**order_data) for order_data in orders_data]
            
            return {
                "orders": [self._serialize_order(order) for order in orders],
                "total": total,
                "skip": skip,
                "limit": limit
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get user orders: {str(e)}"
            )
    
    async def _validate_cart_items(self, items_data: List[Dict[str, Any]]) -> tuple[List[OrderItem], float]:
        """Validate cart items and calculate subtotal"""
        validated_items = []
        subtotal = 0
        
        for item_data in items_data:
            # Get product details
            product = await self.products_collection.find_one({"_id": ObjectId(item_data["product_id"])})
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product {item_data['product_id']} not found"
                )
            
            if not product["is_active"] or product["status"] != "approved":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product {product['title']} is not available"
                )
            
            # Create order item
            quantity = item_data.get("quantity", 1)
            unit_price = product["price"]
            total_price = unit_price * quantity
            
            order_item = OrderItem(
                product_id=str(product["_id"]),
                product_title=product["title"],
                product_slug=product.get("slug"),
                seller_id=product["seller_id"],
                seller_name=product["seller_name"],
                quantity=quantity,
                unit_price=unit_price,
                total_price=total_price,
                license_type=product["license_type"]
            )
            
            validated_items.append(order_item)
            subtotal += total_price
        
        return validated_items, subtotal
    
    async def _validate_promo_code(self, promo_code: str, subtotal: float) -> tuple[PromoCode, float]:
        """Validate promo code and calculate discount"""
        # This would typically check against a promo_codes collection
        # For now, we'll use some hardcoded promo codes
        valid_codes = {
            "WELCOME10": {"discount": 10, "type": "percentage", "description": "10% off for new users"},
            "SAVE50": {"discount": 50, "type": "fixed", "description": "$50 off your order"},
            "STUDENT20": {"discount": 20, "type": "percentage", "description": "20% student discount"}
        }
        
        if promo_code not in valid_codes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid promo code"
            )
        
        code_data = valid_codes[promo_code]
        
        if code_data["type"] == "percentage":
            discount_amount = subtotal * (code_data["discount"] / 100)
        else:  # fixed
            discount_amount = min(code_data["discount"], subtotal)
        
        promo = PromoCode(
            code=promo_code,
            discount_amount=discount_amount,
            discount_type=code_data["type"],
            description=code_data["description"]
        )
        
        return promo, discount_amount
    
    async def _generate_order_number(self) -> str:
        """Generate unique order number"""
        while True:
            # Generate order number like ORD-2024-XXXXX
            year = datetime.now().year
            random_part = ''.join(secrets.choice(string.digits) for _ in range(5))
            order_number = f"ORD-{year}-{random_part}"
            
            # Check if it already exists
            existing = await self.orders_collection.find_one({"order_number": order_number})
            if not existing:
                return order_number
    
    async def _fulfill_order(self, order_id: str) -> None:
        """Fulfill order by generating download links and licenses"""
        try:
            order = await self.get_order_by_id(order_id)
            if not order:
                return
            
            # Generate download links for each item
            for item in order.items:
                # Generate secure download URL
                download_url = await self._generate_download_url(item.product_id, order_id)
                download_expires_at = datetime.utcnow() + timedelta(days=30)  # 30 days to download
                
                # Update item with download information
                await self.orders_collection.update_one(
                    {"_id": ObjectId(order_id), "items.product_id": item.product_id},
                    {
                        "$set": {
                            "items.$.download_url": download_url,
                            "items.$.download_expires_at": download_expires_at
                        }
                    }
                )
                
                # Generate license if needed
                await self.license_service.create_license(
                    product_id=item.product_id,
                    user_id=order.user_id,
                    order_id=order_id,
                    license_type=item.license_type
                )
                
                # Update product statistics
                await self.products_collection.update_one(
                    {"_id": ObjectId(item.product_id)},
                    {
                        "$inc": {
                            "sales_count": item.quantity,
                            "revenue": item.total_price
                        }
                    }
                )
                
                # Update seller statistics
                await self.users_collection.update_one(
                    {"_id": ObjectId(item.seller_id)},
                    {
                        "$inc": {
                            "total_sales": item.total_price
                        }
                    }
                )
            
            # Update buyer statistics
            await self.users_collection.update_one(
                {"_id": ObjectId(order.user_id)},
                {
                    "$inc": {
                        "total_purchases": len(order.items),
                        "total_spent": order.total_amount
                    }
                }
            )
            
            # Mark order as completed
            await self.orders_collection.update_one(
                {"_id": ObjectId(order_id)},
                {
                    "$set": {
                        "status": OrderStatus.COMPLETED,
                        "completed_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
        except Exception as e:
            # Log error but don't raise - order should still be marked as paid
            print(f"Error fulfilling order {order_id}: {str(e)}")
    
    async def _generate_download_url(self, product_id: str, order_id: str) -> str:
        """Generate secure download URL"""
        # In a real implementation, this would generate a signed URL
        # with expiration time and access restrictions
        token = secrets.token_urlsafe(32)
        return f"https://api.nozama.ai/downloads/{product_id}?token={token}&order={order_id}"
    
    async def create_order_zip_download(self, order_id: str) -> str:
        """Create ZIP file with all order files for download"""
        try:
            order = await self.get_order_by_id(order_id)
            if not order or order.status != OrderStatus.COMPLETED:
                raise HTTPException(status_code=400, detail="Order not completed")
            
            # Create temporary ZIP file
            temp_dir = tempfile.mkdtemp()
            zip_path = os.path.join(temp_dir, f"order_{order_id}_files.zip")
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for item in order.items:
                    # Get product files
                    product = await self.products_collection.find_one({"_id": ObjectId(item.product_id)})
                    if product and product.get("files"):
                        for file_path in product["files"]:
                            if os.path.exists(file_path):
                                # Add file to ZIP with product name prefix
                                arc_name = f"{item.product_title}/{os.path.basename(file_path)}"
                                zip_file.write(file_path, arc_name)
            
            return zip_path
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create download: {str(e)}")



    async def _send_order_confirmation_email(self, order_id: str) -> None:
        """Send order confirmation email"""
        try:
            order = await self.get_order_by_id(order_id)
            if not order:
                return
            
            await self.email_service.send_email(
                to_email=order.user_email,
                subject=f"Order Confirmation - {order.order_number}",
                template="order_confirmation",
                context={
                    "order": self._serialize_order(order),
                    "download_instructions": "Your download links are available in your account dashboard."
                }
            )
            
            # Send notification
            await self.notification_service.send_notification(
                user_id=order.user_id,
                title="Order Confirmed",
                message=f"Your order {order.order_number} has been confirmed and your files are ready for download.",
                notification_type="order_confirmation",
                data={"order_id": order_id}
            )
            
        except Exception as e:
            print(f"Error sending order confirmation email: {str(e)}")
    
    def _serialize_order(self, order: Order) -> Dict[str, Any]:
        """Serialize order for API response"""
        return {
            "id": str(order.id),
            "order_number": order.order_number,
            "user_email": order.user_email,
            "items": [item.dict() for item in order.items],
            "subtotal": order.subtotal,
            "discount_amount": order.discount_amount,
            "total_amount": order.total_amount,
            "currency": order.currency,
            "status": order.status,
            "payment_status": order.payment_status,
            "created_at": order.created_at.isoformat(),
            "completed_at": order.completed_at.isoformat() if order.completed_at else None
        }