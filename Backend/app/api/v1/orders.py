# =============== app/api/v1/orders.py - FIXED VERSION ===============
"""
Order management endpoints
"""
import json 
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from datetime import datetime, timedelta
from fastapi.responses import FileResponse
from app.config.database import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
import zipfile
import tempfile
import os
from pathlib import Path
import logging
import math
from bson import ObjectId

# Import the seller authentication pattern
from app.api.v1.seller import get_current_seller_simple

from app.api.dependencies import (
    get_current_active_user,
    get_current_admin_user,
    get_pagination_params,
    PaginationParams,
    rate_limiter,
    strict_rate_limiter,
    get_order_service,  # Add this
    get_payment_service,  # Add this
    get_product_service,  # Add this
    get_notification_service  # Add this
)
from app.schemas.order import (
    OrderResponse,
    OrderCreate,
    OrderUpdate,
    CheckoutRequest,
    CartItem,
    BillingAddressSchema
)
from app.services.order_service import OrderService
from app.services.payment_service import PaymentService
from app.services.product_service import ProductService
from app.services.notification_service import NotificationService
from app.models.user import User
from app.models.order import OrderStatus, PaymentStatus

router = APIRouter()
logger = logging.getLogger(__name__)

class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        elif isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)
    
@router.get("/")
async def get_user_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    current_user = Depends(get_current_seller_simple),  # Reuse seller auth pattern
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Any:
    """Get current user's orders with pagination"""
    try:
        logger.info(f"📦 Getting orders for user: {current_user['id']} ({current_user['name']})")
        
        # Build query for user's orders
        query_filter = {"user_id": current_user["id"]}
        
        if status_filter and status_filter != "all":
            query_filter["status"] = status_filter
        
        # Calculate skip
        skip = (page - 1) * limit
        
        # Get total count
        total_count = await db.orders.count_documents(query_filter)
        
        # Get orders
        cursor = db.orders.find(query_filter).sort("created_at", -1).skip(skip).limit(limit)
        orders = await cursor.to_list(length=limit)
        
        # Serialize orders
        for order in orders:
            if "_id" in order:
                order["id"] = str(order["_id"])
                order["_id"] = str(order["_id"])
        
        logger.info(f"✅ Found {len(orders)} orders for user {current_user['id']}")
        
        # If no orders found, log this for debugging
        if len(orders) == 0:
            logger.info(f"🔍 No orders found for user {current_user['id']}. Checking all orders...")
            all_orders_count = await db.orders.count_documents({})
            logger.info(f"📊 Total orders in database: {all_orders_count}")
            
            # Show a sample of all orders for debugging
            sample_orders = await db.orders.find({}).limit(3).to_list(length=3)
            for i, order in enumerate(sample_orders):
                logger.info(f"📦 Sample order {i+1}: user_id={order.get('user_id')}, total={order.get('total_amount')}")
        
        return {
            "success": True,
            "data": orders,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": math.ceil(total_count / limit) if total_count > 0 else 1
            },
            "user_info": current_user
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting user orders: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get orders: {str(e)}")

@router.get("/stats")
async def get_order_stats(
    current_user=Depends(get_current_seller_simple),  # FIX 1: Use the correct auth function
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get order statistics - FIXED ObjectId serialization"""
    try:
        user_id = current_user.get("id") or current_user.get("user_id") or current_user.get("_id")
        logger.info(f"📊 Getting order stats for user: {user_id}")
        
        # FIX 2: Get user orders directly from database instead of undefined function
        query_filter = {"user_id": user_id}
        cursor = db.orders.find(query_filter).sort("created_at", -1)
        orders_raw = await cursor.to_list(length=1000)  # Get all orders
        
        logger.info(f"📦 Found {len(orders_raw)} total orders for user {user_id}")
        
        # Convert to JSON string and back to remove ObjectIds completely
        orders_json = json.dumps(orders_raw, cls=MongoJSONEncoder)
        orders = json.loads(orders_json)
        
        # Calculate stats
        total_orders = len(orders)
        completed_orders = len([o for o in orders if o.get('status') == 'completed'])
        pending_orders = len([o for o in orders if o.get('status') in ['pending', 'processing']])
        total_spent = sum([float(o.get('total_amount', 0)) for o in orders if o.get('status') == 'completed'])
        
        # Process recent orders (first 5) - NO ObjectIds
        recent_orders_clean = []
        for order in orders[:5]:
            recent_order = {
                'id': order.get('_id', ''),
                'order_number': order.get('order_number', ''),
                'customer_email': order.get('customer_email', ''),
                'total_amount': order.get('total_amount', 0),
                'status': order.get('status', ''),
                'created_at': order.get('created_at', ''),
                'items': order.get('items', [])[:3]  # Limit items to first 3
            }
            recent_orders_clean.append(recent_order)
        
        # Build response - NO ObjectIds anywhere
        stats_response = {
            'total_orders': total_orders,
            'completed_orders': completed_orders,
            'pending_orders': pending_orders,
            'total_spent': round(total_spent, 2),
            'total_downloads': 0,
            'favorite_categories': [],
            'recent_orders': recent_orders_clean
        }
        
        logger.info(f"✅ Order stats calculated: total_orders={total_orders}, completed_orders={completed_orders}, pending_orders={pending_orders}, total_spent={total_spent}")
        
        return {
            "success": True,
            "data": stats_response
        }
        
    except Exception as e:
        logger.error(f"❌ Error in order stats: {str(e)}")
        import traceback
        logger.error(f"❌ Full traceback: {traceback.format_exc()}")
        return {
            "success": True,
            "data": {
                "total_orders": 0,
                "completed_orders": 0,
                "pending_orders": 0,
                "total_spent": 0.0,
                "total_downloads": 0,
                "favorite_categories": [],
                "recent_orders": []
            }
        }

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user = Depends(get_current_seller_simple),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Any:
    """
    Get order by ID
    """
    try:
        if not ObjectId.is_valid(order_id):
            raise HTTPException(status_code=400, detail="Invalid order ID")
        
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Check if user owns the order
        if order.get("user_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this order"
            )
        
        # Serialize order
        if "_id" in order:
            order["id"] = str(order["_id"])
            order["_id"] = str(order["_id"])
        
        return order
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate-cart")
async def validate_cart(
    cart_items: List[CartItem],
    promo_code: Optional[str] = None,
    current_user = Depends(get_current_seller_simple),
    order_service: OrderService = Depends(get_order_service),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Validate cart items and calculate totals
    """
    validation_result = await order_service.validate_cart_items(
        cart_items=cart_items,
        user_id=current_user["id"],
        promo_code=promo_code
    )
    
    if not validation_result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation_result["errors"]
        )
    
    return validation_result

@router.post("/checkout", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def checkout(
    checkout_data: CheckoutRequest,
    request: Request,
    current_user = Depends(get_current_seller_simple),
    order_service: OrderService = Depends(get_order_service),
    payment_service: PaymentService = Depends(get_payment_service),
    notification_service: NotificationService = Depends(get_notification_service),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Create order and process payment
    """
    try:
        # Validate cart items first
        cart_validation = await order_service.validate_cart_items(
            cart_items=checkout_data.items,
            user_id=current_user["id"],
            promo_code=checkout_data.promo_code
        )
        
        if not cart_validation["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=cart_validation["errors"]
            )
        
        # Create order with PENDING status
        order_data = OrderCreate(
            user_id=current_user["id"],
            items=checkout_data.items,
            billing_address=checkout_data.billing_address,
            promo_code=checkout_data.promo_code
        )
        
        order = await order_service.create_order(order_data, current_user["id"])
        
        # Process payment
        payment_result = await payment_service.process_payment(
            order_id=order.id,
            payment_method_id=checkout_data.payment_method_id,
            amount=order.total_amount,
            currency=order.currency,
            customer_email=current_user["email"],
            billing_address=checkout_data.billing_address
        )
        
        if payment_result.success:
            # Update order status to COMPLETED
            await order_service.update_order_status(
                order_id=order.id,
                status=OrderStatus.COMPLETED,
                payment_status=PaymentStatus.PAID
            )
            
            # Generate download links for digital products
            download_links = await order_service.generate_download_links(order.id)
            
            # Send order confirmation email
            await order_service.send_order_confirmation_email(order.id)
            
            # Update product sales counts
            await order_service.update_product_sales_stats(order.id)
            
            # Process affiliate commissions if applicable
            await order_service.process_affiliate_commissions(order.id, request)
            
            # Send notifications to sellers
            await order_service.notify_sellers_of_sale(order.id)
            
            # Update user purchase statistics
            await order_service.update_user_purchase_stats(current_user["id"], order.total_amount)
            
        else:
            # Update order status to FAILED
            await order_service.update_order_status(
                order_id=order.id,
                status=OrderStatus.FAILED,
                payment_status=PaymentStatus.FAILED
            )
            
            # Send payment failure notification
            await notification_service.send_payment_failure_notification(
                user_id=current_user["id"],
                order_id=order.id,
                error_message=payment_result.error
            )
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment failed: {payment_result.error}"
            )
    
    except Exception as e:
        # Log error and update order status if order was created
        if 'order' in locals():
            await order_service.update_order_status(
                order_id=order.id,
                status=OrderStatus.FAILED,
                payment_status=PaymentStatus.FAILED
            )
        
        # Re-raise HTTP exceptions
        if isinstance(e, HTTPException):
            raise e
        
        # Handle unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Checkout processing failed. Please try again."
        )
    
    # Return updated order with download links
    updated_order = await order_service.get_order_by_id(order.id)
    return updated_order

@router.get("/{order_id}/download-links")
async def get_download_links(
    order_id: str,
    current_user = Depends(get_current_seller_simple),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Any:
    """
    Get download links for an order
    """
    try:
        if not ObjectId.is_valid(order_id):
            raise HTTPException(status_code=400, detail="Invalid order ID")
        
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Check if user owns the order
        if order.get("user_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this order"
            )
        
        # Check if order is completed
        if order.get("status") != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order is not completed"
            )
        
        # Get download links from order items
        download_links = []
        for item in order.get("items", []):
            if item.get("product_id"):
                download_links.append({
                    "product_id": item["product_id"],
                    "product_title": item.get("title", "Unknown Product"),
                    "download_url": f"/api/v1/orders/download-product-files/{item['product_id']}"
                })
        
        return {"download_links": download_links}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting download links: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{order_id}/regenerate-links")
async def regenerate_download_links(
    order_id: str,
    current_user = Depends(get_current_seller_simple),
    order_service: OrderService = Depends(get_order_service),
    _: bool = Depends(strict_rate_limiter)
) -> Any:
    """
    Regenerate download links for an order (limited usage)
    """
    order = await order_service.get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if user owns the order
    if order.user_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this order"
        )
    
    # Check if order is completed
    if order.status != OrderStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is not completed"
        )
    
    # Check regeneration limits
    can_regenerate = await order_service.can_regenerate_download_links(order_id)
    if not can_regenerate:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Download link regeneration limit exceeded"
        )
    
    download_links = await order_service.regenerate_download_links(order_id)
    return {"download_links": download_links}

@router.post("/{order_id}/resend-email")
async def resend_order_email(
    order_id: str,
    current_user = Depends(get_current_seller_simple),
    order_service: OrderService = Depends(get_order_service),
    _: bool = Depends(strict_rate_limiter)
) -> Any:
    """
    Resend order confirmation email
    """
    order = await order_service.get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if user owns the order
    if order.user_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this order"
        )
    
    await order_service.send_order_confirmation_email(order_id)
    return {"message": "Order confirmation email sent"}

@router.post("/{order_id}/request-refund")
async def request_refund(
    order_id: str,
    reason: str,
    current_user = Depends(get_current_seller_simple),
    order_service: OrderService = Depends(get_order_service),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Request refund for an order
    """
    order = await order_service.get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if user owns the order
    if order.user_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to request refund for this order"
        )
    
    # Check if order is eligible for refund
    if order.status != OrderStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only completed orders can be refunded"
        )
    
    # Check refund time limit (e.g., 30 days)
    if order.completed_at and (datetime.utcnow() - order.completed_at).days > 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refund request period has expired"
        )
    
    refund_request = await order_service.create_refund_request(
        order_id=order_id,
        reason=reason,
        user_id=current_user["id"]
    )
    
    return {"message": "Refund request submitted successfully", "request_id": refund_request["id"]}

# Admin endpoints
@router.get("/admin/all", response_model=List[OrderResponse])
async def get_all_orders(
    pagination: PaginationParams = Depends(get_pagination_params),
    status_filter: Optional[OrderStatus] = None,
    payment_status_filter: Optional[PaymentStatus] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = Query(None),
    admin_user: User = Depends(get_current_admin_user),
    order_service: OrderService = Depends(get_order_service)
) -> Any:
    """
    Get all orders with admin filtering (Admin only)
    """
    orders = await order_service.get_all_orders_admin(
        status=status_filter,
        payment_status=payment_status_filter,
        start_date=start_date,
        end_date=end_date,
        search=search,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return orders

@router.get("/{order_id}/download-zip")
async def download_order_files(
    order_id: str,
    current_user = Depends(get_current_seller_simple),
    order_service: OrderService = Depends(get_order_service)
) -> Any:
    """Download all order files as ZIP"""
    order = await order_service.get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user owns the order
    if order.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if order is completed
    if order.status != OrderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Order not completed")
    
    try:
        zip_path = await order_service.create_order_zip_download(order_id)
        return FileResponse(
            path=zip_path,
            filename=f"order_{order_id}_files.zip",
            media_type='application/zip',
            headers={"Content-Disposition": f"attachment; filename=order_{order_id}_files.zip"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/checkout-no-auth", status_code=status.HTTP_201_CREATED)
async def checkout_no_auth(
    checkout_data: dict,
    order_service: OrderService = Depends(get_order_service)
) -> Any:
    """
    Create order without authentication (for payment completion)
    """
    try:
        # Simple order creation for payment completion
        order_doc = {
            "order_number": f"NZ-{int(datetime.utcnow().timestamp())}",
            "user_email": checkout_data.get("customer_email", "unknown@example.com"),
            "payment_intent_id": checkout_data.get("payment_method_id", ""),
            "items": checkout_data.get("items", []),
            "total_amount": checkout_data.get("total", 0),
            "status": "completed",
            "payment_status": "paid",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert into database
        result = await order_service.orders_collection.insert_one(order_doc)
        order_doc["_id"] = result.inserted_id
        order_doc["id"] = str(result.inserted_id)
        
        return order_doc
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Order creation failed: {str(e)}"
        )

@router.post("/save-order")
async def save_order_direct(
    order_data: dict,
     current_user = Depends(get_current_seller_simple),
    db: AsyncIOMotorDatabase = Depends(get_database)  # Direct DB access
) -> Any:
    """
    Save order directly to database without dependencies
    """
    try:
        # CRITICAL: Ensure the order has the correct user_id
        order_data["user_id"] = current_user["id"]
        order_data["user_email"] = current_user["email"]
        order_data["customer_email"] = current_user["email"]  # Also set this
        
        # Add timestamps if not present
        if "created_at" not in order_data:
            order_data["created_at"] = datetime.utcnow()
        if "updated_at" not in order_data:
            order_data["updated_at"] = datetime.utcnow()
            
        # Insert order directly into database
        result = await db.orders.insert_one(order_data)
        
        logger.info(f"✅ Order saved to database: {result.inserted_id} for user {current_user['id']} ({current_user['email']})")
        
        return {
            "success": True,
            "order_id": str(result.inserted_id),
            "user_id": current_user["id"],
            "user_email": current_user["email"],
            "message": "Order saved successfully"
            
        }
        
    except Exception as e:
        logger.error(f"❌ Error saving order: {e}")
        return {
            "success": False,
            "message": f"Order save failed: {str(e)}"
        }

@router.get("/download-product-files/{product_id}")
async def download_product_files(
    product_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Any:
    """
    Download actual ZIP files for a product - HANDLES BOTH OLD AND NEW FILE FORMATS
    """
    try:        
        logger.info(f"📥 Download request for product: {product_id}")
        
        # Get product details
        product = await db.products.find_one({"_id": ObjectId(product_id)})
        if not product:
            logger.info(f"❌ Product not found: {product_id}")
            raise HTTPException(status_code=404, detail="Product not found")
        
        logger.info(f"📦 Product found: {product.get('title', 'Unknown')}")
        
        # Check if product has files
        product_files = product.get("files", [])
        logger.info(f"📁 Product has {len(product_files)} files: {product_files}")
        
        if not product_files:
            logger.info(f"⚠️ No files available for product: {product_id}")
            raise HTTPException(status_code=404, detail="No files available for this product")
        
        # Helper function to get file path from different formats
        def get_file_path(file_item):
            if isinstance(file_item, str):
                # Old format: direct string path
                return file_item
            elif isinstance(file_item, dict):
                # New format: object with url/path
                return file_item.get('url') or file_item.get('path') or file_item.get('file_path')
            else:
                return None
        
        # Helper function to get filename
        def get_filename(file_item, file_path):
            if isinstance(file_item, dict):
                return file_item.get('filename') or os.path.basename(file_path)
            else:
                return os.path.basename(file_path)
        
        # Process files and get valid file paths
        valid_files = []
        for file_item in product_files:
            file_path = get_file_path(file_item)
            if file_path:
                # Convert relative path to absolute path
                if file_path.startswith('/uploads/'):
                    # Remove leading slash and prepend current directory
                    abs_path = os.path.join(os.getcwd(), file_path.lstrip('/'))
                else:
                    abs_path = file_path
                
                logger.info(f"🔍 Checking file: {abs_path}")
                
                if os.path.exists(abs_path):
                    valid_files.append({
                        'path': abs_path,
                        'filename': get_filename(file_item, abs_path),
                        'original': file_item
                    })
                    logger.info(f"✅ File exists: {abs_path}")
                else:
                    logger.info(f"❌ File not found: {abs_path}")
        
        if not valid_files:
            logger.info(f"❌ No valid files found for product: {product_id}")
            raise HTTPException(status_code=404, detail="No accessible files found for this product")
        
        # If only one file, return it directly
        if len(valid_files) == 1:
            file_info = valid_files[0]
            logger.info(f"📄 Single file download: {file_info['path']}")
            
            return FileResponse(
                path=file_info['path'],
                filename=file_info['filename'],
                media_type='application/zip'
            )
        
        # If multiple files, create a combined ZIP
        logger.info(f"📦 Creating combined ZIP for {len(valid_files)} files")
        temp_dir = tempfile.mkdtemp()
        combined_zip_path = os.path.join(temp_dir, f"{product.get('title', 'product').replace(' ', '_')}_all_files.zip")
        
        with zipfile.ZipFile(combined_zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for file_info in valid_files:
                zip_file.write(file_info['path'], file_info['filename'])
                logger.info(f"✅ Added to ZIP: {file_info['filename']}")
        
        logger.info(f"📦 Combined ZIP created: {combined_zip_path}")
        
        return FileResponse(
            path=combined_zip_path,
            filename=f"{product.get('title', 'product').replace(' ', '_')}_files.zip",
            media_type='application/zip'
        )
        
    except Exception as e:
        logger.error(f"❌ Error downloading product files: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")
    
    
@router.get("/admin/stats")
async def get_admin_order_stats(
    period: str = Query("30d", pattern="^(7d|30d|90d|1y)$"),
    admin_user: User = Depends(get_current_admin_user),
    order_service: OrderService = Depends(get_order_service)
) -> Any:
    """
    Get order statistics for admin dashboard
    """
    stats = await order_service.get_admin_order_stats(period)
    return stats

@router.put("/{order_id}/admin/status")
async def update_order_status_admin(
    order_id: str,
    order_update: OrderUpdate,
    admin_user: User = Depends(get_current_admin_user),
    order_service: OrderService = Depends(get_order_service)
) -> Any:
    """
    Update order status (Admin only)
    """
    updated_order = await order_service.update_order_admin(
        order_id=order_id,
        order_update=order_update,
        admin_id=admin_user.id
    )
    
    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    return {"message": "Order updated successfully"}

@router.get("/admin/refund-requests")
async def get_refund_requests(
    pagination: PaginationParams = Depends(get_pagination_params),
    status_filter: Optional[str] = Query(None),
    admin_user: User = Depends(get_current_admin_user),
    order_service: OrderService = Depends(get_order_service)
) -> Any:
    """
    Get refund requests (Admin only)
    """
    requests = await order_service.get_refund_requests(
        status=status_filter,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return requests

@router.put("/admin/refund-requests/{request_id}")
async def process_refund_request(
    request_id: str,
    action: str,  # approve, reject
    admin_notes: Optional[str] = None,
    admin_user: User = Depends(get_current_admin_user),
    order_service: OrderService = Depends(get_order_service),
    payment_service: PaymentService = Depends(get_payment_service)
) -> Any:
    """
    Process refund request (Admin only)
    """
    if action not in ["approve", "reject"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be 'approve' or 'reject'"
        )
    
    result = await order_service.process_refund_request(
        request_id=request_id,
        action=action,
        admin_notes=admin_notes,
        admin_id=admin_user.id,
        payment_service=payment_service
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return {"message": f"Refund request {action}d successfully"}

@router.get("/debug/all-orders")
async def debug_all_orders(
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Any:
    """Debug: See all orders in database"""
    try:
        all_orders = await db.orders.find({}).limit(10).to_list(length=10)
        
        # Serialize orders
        for order in all_orders:
            if "_id" in order:
                order["id"] = str(order["_id"])
                order["_id"] = str(order["_id"])
        
        return {
            "total_orders": len(all_orders),
            "orders": all_orders
        }
    except Exception as e:
        logger.error(f"❌ Error getting debug orders: {e}")
        return {"error": str(e)}

@router.post("/debug/fix-orders")
async def fix_existing_orders(
    current_user = Depends(get_current_seller_simple),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Any:
    """Fix existing orders to have the correct user_id"""
    try:
        user_email = current_user["email"]
        user_id = current_user["id"]
        
        logger.info(f"🔧 Fixing orders for user: {user_email} (ID: {user_id})")
        
        # Update orders that have the same email but no user_id
        result = await db.orders.update_many(
            {
                "$or": [
                    {"customer_email": user_email, "user_id": {"$exists": False}},
                    {"customer_email": user_email, "user_id": None}
                ]
            },
            {
                "$set": {
                    "user_id": user_id,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"✅ Fixed {result.modified_count} orders for user {user_email}")
        
        return {
            "success": True,
            "message": f"Fixed {result.modified_count} orders",
            "user_email": user_email,
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"❌ Error fixing orders: {e}")
        return {
            "success": False,
            "message": f"Failed to fix orders: {str(e)}"
        }