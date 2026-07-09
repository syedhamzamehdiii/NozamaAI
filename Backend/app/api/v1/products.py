# =============== app/api/v1/products.py ===============
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from app.models.product import Product
from app.config.database import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
from bson import ObjectId
import math
from datetime import datetime
from app.api.dependencies import (
    get_current_active_user,
    get_current_user_optional,
    get_review_service,
    get_product_service,
    get_order_service,
    get_notification_service
)
from app.schemas.review import ReviewCreate
from app.services.review_service import ReviewService
from app.services.product_service import ProductService
from app.services.order_service import OrderService
from app.services.notification_service import NotificationService
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# Convert ObjectId to string for JSON serialization
def serialize_product(product):
    if product and "_id" in product:
        product["_id"] = str(product["_id"])
    return product

@router.get("/", response_model=dict)
async def get_products(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    sort_by: Optional[str] = Query("created_at", description="Sort field"),
    sort_order: Optional[str] = Query("desc", description="Sort order (asc/desc)"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get products with pagination, search, and filtering
    """
    try:
        logger.info(f"📦 API CALLED: Getting products - page: {page}, limit: {limit}")
        logger.info(f"🔍 SEARCH TERM: '{search}'")
        logger.info(f"📂 CATEGORY: '{category}'")
        logger.info(f"🔄 SORT: {sort_by} {sort_order}")
        logger.info(f"💰 PRICE RANGE: {min_price} - {max_price}")
        
        # Validate parameters
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 20
        if sort_by not in ["price", "rating", "created_at", "sales_count", "title"]:
            sort_by = "created_at"
        if sort_order not in ["asc", "desc"]:
            sort_order = "desc"
        
        # Calculate skip
        skip = (page - 1) * limit
        
        # Get products collection
        products_collection = db.products
        
        # Build query filter
        query_filter = {}
        
        # Only show approved products
        query_filter["status"] = "approved"
        
        # Search filter
        if search and search.strip():
            search_term = search.strip()
            logger.info(f"🔍 APPLYING SEARCH FILTER: '{search_term}'")
            query_filter["$or"] = [
                {"title": {"$regex": search_term, "$options": "i"}},
                {"description": {"$regex": search_term, "$options": "i"}},
                {"short_description": {"$regex": search_term, "$options": "i"}},
                {"tags": {"$in": [{"$regex": search_term, "$options": "i"}]}},
                {"seller_name": {"$regex": search_term, "$options": "i"}},
                {"category": {"$regex": search_term, "$options": "i"}}
            ]
        
        # Category filter
        if category and category.strip():
            logger.info(f"📂 APPLYING CATEGORY FILTER: '{category}'")
            query_filter["category"] = {"$regex": category.strip(), "$options": "i"}
        
        # Price filters
        price_filter = {}
        if min_price is not None and min_price >= 0:
            price_filter["$gte"] = min_price
            logger.info(f"💰 APPLYING MIN PRICE: {min_price}")
        if max_price is not None and max_price >= 0:
            price_filter["$lte"] = max_price
            logger.info(f"💰 APPLYING MAX PRICE: {max_price}")
        if price_filter:
            query_filter["price"] = price_filter
        
        logger.info(f"🔍 Final query filter: {query_filter}")
        
        # Build sort
        sort_direction = 1 if sort_order == "asc" else -1
        logger.info(f"🔄 Sorting by: {sort_by} {sort_order} (direction: {sort_direction})")
        
        # Get total count
        total_count = await products_collection.count_documents(query_filter)
        
        # Get products with sorting
        try:
            cursor = products_collection.find(query_filter)
            
            # Add sorting
            if sort_by == "price":
                cursor = cursor.sort("price", sort_direction)
            elif sort_by == "rating":
                cursor = cursor.sort("rating", sort_direction)
            elif sort_by == "sales_count":
                cursor = cursor.sort("sales_count", sort_direction)
            elif sort_by == "created_at":
                cursor = cursor.sort("created_at", sort_direction)
            elif sort_by == "title":
                cursor = cursor.sort("title", sort_direction)
            else:
                cursor = cursor.sort("created_at", -1)  # Default to newest first
            
            cursor = cursor.skip(skip).limit(limit)
            products = await cursor.to_list(length=limit)
            
            logger.info(f"📦 PRODUCTS RETRIEVED: {len(products)} sorted by {sort_by} {sort_order}")
            
            # Debug: Log first product price
            if products and sort_by == "price":
                first_price = products[0].get('price', 'N/A')
                logger.info(f"💰 First product price after sort: {first_price}")
            
        except Exception as e:
            logger.error(f"Database query error: {e}")
            # Fallback to simple query without sorting if there's an issue
            cursor = products_collection.find(query_filter).skip(skip).limit(limit)
            products = await cursor.to_list(length=limit)
        
        # Serialize products
        serialized_products = [serialize_product(product) for product in products]
        
        # Calculate pagination info
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
        has_next = page < total_pages
        has_prev = page > 1
        
        logger.info(f"✅ Found {len(serialized_products)} products (total: {total_count})")
        
        if serialized_products:
            logger.info(f"📝 FIRST PRODUCT: {serialized_products[0].get('title', 'No title')} - Price: {serialized_products[0].get('price', 'N/A')}")

        return {
            "products": serialized_products,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": total_pages,
                "has_next": has_next,
                "has_prev": has_prev
            },
            # Legacy format for backward compatibility
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": total_pages,
            "has_next": has_next,
            "has_prev": has_prev,
            "success": True
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting products: {e}")
        logger.error(f"❌ Error type: {type(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to get products: {str(e)}")

# Support no-trailing-slash route as well: /api/v1/products
@router.get("", response_model=dict)
async def get_products_no_trailing_slash(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    sort_by: Optional[str] = Query("created_at", description="Sort field"),
    sort_order: Optional[str] = Query("desc", description="Sort order (asc/desc)"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await get_products(
        page=page,
        limit=limit,
        search=search,
        category=category,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
        sort_order=sort_order,
        db=db
    )

@router.get("/{product_id}", response_model=dict)
async def get_product(
    product_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get a single product by ID
    """
    try:
        logger.info(f"📦 Getting product: {product_id}")
        
        # Validate ObjectId
        if not ObjectId.is_valid(product_id):
            raise HTTPException(status_code=400, detail="Invalid product ID")
        
        products_collection = db.products
        product = await products_collection.find_one({"_id": ObjectId(product_id)})
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Increment view count
        await products_collection.update_one(
            {"_id": ObjectId(product_id)},
            {"$inc": {"view_count": 1}}
        )
        
        serialized_product = serialize_product(product)
        logger.info(f"✅ Found product: {serialized_product.get('title', 'Unknown')}")
        
        return {
            "product": serialized_product,
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting product {product_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get product: {str(e)}")



@router.get("/categories/list", response_model=dict)
async def get_categories(db: AsyncIOMotorDatabase = Depends(get_database)):
    """
    Get all product categories
    """
    try:
        logger.info("📋 Getting categories")
        
        products_collection = db.products
        
        # Get distinct categories from approved products
        categories = await products_collection.distinct("category", {"status": "approved"})
        
        # Filter out None and empty categories
        categories = [cat for cat in categories if cat and cat.strip()]
        
        # Count products per category
        category_list = []
        for cat in categories:
            count = await products_collection.count_documents({
                "category": cat,
                "status": "approved"
            })
            category_list.append({"name": cat, "count": count})

        logger.info(f"✅ Found {len(category_list)} categories")
        
        return {
            "categories": category_list,
            "success": True
        }

    except Exception as e:
        logger.error(f"❌ Error getting categories: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get categories: {str(e)}")

@router.post("/{product_id}/view")
async def increment_view_count(
    product_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Increment product view count
    """
    try:
        if not ObjectId.is_valid(product_id):
            raise HTTPException(status_code=400, detail="Invalid product ID")
        
        products_collection = db.products
        result = await products_collection.update_one(
            {"_id": ObjectId(product_id)},
            {"$inc": {"view_count": 1}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {"success": True, "message": "View count incremented"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error incrementing view count: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Debug endpoint to check database connection
@router.get("/debug/count")
async def debug_product_count(db: AsyncIOMotorDatabase = Depends(get_database)):
    """
    Debug endpoint to check how many products are in the database
    """
    try:
        products_collection = db.products
        
        total_count = await products_collection.count_documents({})
        approved_count = await products_collection.count_documents({"status": "approved"})
        
        # Get a sample product
        sample_product = await products_collection.find_one({})
        
        return {
            "total_products": total_count,
            "approved_products": approved_count,
            "sample_product": serialize_product(sample_product) if sample_product else None,
            "database_connected": True
        }
        
    except Exception as e:
        logger.error(f"❌ Debug endpoint error: {e}")
        return {
            "error": str(e),
            "database_connected": False
        }
    

# Add this at the end of your products.py file

@router.post("/{product_id}/reviews")
async def create_product_review(
    product_id: str,
    review_data: dict,
    current_user: User = Depends(get_current_active_user),
    review_service: ReviewService = Depends(get_review_service),
    order_service: OrderService = Depends(get_order_service),
    product_service: ProductService = Depends(get_product_service),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Create a review for a product (verified purchase required)."""
    try:
        # Verify product exists
        # Use a resilient product fetch to avoid validation errors for unusual schemas
        product_doc = await product_service.get_product_doc_by_id(product_id)
        if not product_doc:
            raise HTTPException(status_code=404, detail="Product not found")
        # check purchase against id only; other details not needed here

        # Check if user has purchased the product
        has_purchased = await order_service.user_has_purchased_product(
            user_id=current_user.id,
            product_id=product_id
        )
        if not has_purchased:
            raise HTTPException(status_code=400, detail="You can only review products you have purchased")

        # Check if user has already reviewed this product
        existing_review = await review_service.get_user_product_review(
            user_id=current_user.id,
            product_id=product_id
        )
        if existing_review:
            raise HTTPException(status_code=400, detail="You have already reviewed this product")

        # Check daily review limit (cooldown)
        recent_reviews = await review_service.get_user_recent_reviews(
            user_id=current_user.id,
            hours=24
        )
        if len(recent_reviews) >= 5:
            raise HTTPException(status_code=429, detail="You have reached the daily review limit")

        # Normalize incoming review payload
        create_payload = ReviewCreate(
            product_id=product_id,
            rating=int(review_data.get("rating", 5)),
            title=review_data.get("title"),
            content=review_data.get("content") or review_data.get("comment") or ""
        )

        # Create review (service auto-approves per configuration)
        review = await review_service.create_review(create_payload, current_user.id)

        # Notify seller
        try:
            await notification_service.notify_seller_new_review(
                seller_id=product_doc.get("seller_id"),
                product_title=product_doc.get("title", "Product"),
                review_rating=review.rating,
                review_id=review.id
            )
        except Exception:
            logger.warning("Failed to send seller notification for new review", exc_info=True)

        # Update product rating
        try:
            await product_service.update_product_rating(product_id)
        except Exception:
            logger.warning("Failed to update product rating after review", exc_info=True)

        # Ensure the review object is JSON serializable
        if "_id" in review:
            review.pop("_id", None)
        return review
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating product review: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{product_id}/reviews")
async def get_product_reviews(product_id: str, limit: int = 20, review_service: ReviewService = Depends(get_review_service)):
    """Get approved, visible reviews for a product."""
    try:
        reviews = await review_service.get_product_reviews(
            product_id=product_id,
            skip=0,
            limit=limit
        )
        return reviews
    except Exception as e:
        logger.error(f"Error fetching product reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))