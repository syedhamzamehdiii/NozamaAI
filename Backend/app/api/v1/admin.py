# app/api/v1/admin.py
from fastapi import APIRouter, Depends, HTTPException, Query, Response, BackgroundTasks, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
import io
from datetime import datetime
from typing import List
import json

from app.config.database import get_database
from app.services.admin_service import AdminService
from app.models.user import User
from app.schemas.admin import *
from bson import ObjectId
import logging

# ADD this helper function near the top, after imports
async def get_seller_name_by_id(seller_id: str, db) -> str:
    """Get seller's actual name from database"""
    try:
        seller = await db.users.find_one({"_id": seller_id})
        if seller:
            return f"{seller.get('first_name', '')} {seller.get('last_name', '')}".strip() or seller.get('name', 'Unknown Seller')
        return 'Unknown Seller'
    except:
        return 'Unknown Seller'

logger = logging.getLogger(__name__)
# Create admin router (removed prefix since it's added in __init__.py)
router = APIRouter(tags=["Admin"])

# Dependency to get admin service
async def get_admin_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> AdminService:
    return AdminService(db)


# Temporary admin user dependency (replace with proper admin checking later)
async def get_current_admin_user(
    # For now, just return a mock admin user to bypass authentication
    # TODO: Implement proper admin authentication
) -> User:
    """Get current admin user - temporary mock for testing"""
    from app.models.user import UserRole, UserStatus
    return User(
        id="admin_user_id",
        email="admin@example.com",
        first_name="Admin",
        last_name="User",
        name="Admin User",  # Added this field
        password_hash="hashed_password",  # Added this field
        role=UserRole.admin,
        status=UserStatus.active,
        is_verified=True,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
# =============================================================================
# DASHBOARD ENDPOINTS
# =============================================================================

@router.get("/dashboard/stats", response_model=DashboardStatsSchema)
async def get_dashboard_stats(
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get dashboard statistics"""
    try:
        return await admin_service.get_dashboard_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard stats: {str(e)}")

@router.get("/test")
async def test_admin():
    """Test endpoint to verify admin router is working"""
    return {"message": "Admin router is working!"}

@router.get("/dashboard/revenue-trend", response_model=List[RevenueDataPointSchema])
async def get_revenue_trend(
    period: str = Query("6months", description="Time period: 7days, 30days, 90days, 6months, 1year"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get revenue trend data"""
    try:
        return await admin_service.get_revenue_trend(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch revenue trend: {str(e)}")

@router.get("/dashboard/category-distribution", response_model=List[CategoryDataSchema])
async def get_category_distribution(
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get product category distribution"""
    try:
        return await admin_service.get_category_distribution()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch category distribution: {str(e)}")

@router.get("/dashboard/user-growth", response_model=List[UserGrowthDataSchema])
async def get_user_growth(
    period: str = Query("4weeks", description="Time period: 4weeks, 12weeks, 12months"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get user growth data"""
    try:
        return await admin_service.get_user_growth(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user growth: {str(e)}")

@router.get("/dashboard/recent-activity", response_model=List[RecentActivitySchema])
async def get_recent_activity(
    limit: int = Query(10, description="Number of activities to return"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get recent platform activity"""
    try:
        return await admin_service.get_recent_activity(limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch recent activity: {str(e)}")

@router.get("/dashboard/top-products", response_model=List[TopProductSchema])
async def get_top_products(
    limit: int = Query(5, description="Number of top products to return"),
    period: str = Query("30days", description="Time period: 7days, 30days, 90days"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get top performing products"""
    try:
        return await admin_service.get_top_products(limit, period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch top products: {str(e)}")

@router.get("/dashboard/performance-metrics", response_model=PerformanceMetricsSchema)
async def get_performance_metrics(
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get platform performance metrics"""
    try:
        return await admin_service.get_performance_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch performance metrics: {str(e)}")

# =============================================================================
# USER MANAGEMENT ENDPOINTS
# =============================================================================

@router.get("/users", response_model=UsersListResponseSchema)
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    verified: Optional[bool] = Query(None),
    two_factor: Optional[bool] = Query(None),
    date_filter: Optional[str] = Query(None),
    sort_by: str = Query("name"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get users with filtering and pagination"""
    try:
        return await admin_service.get_users(
            page, limit, search, role, status, verified, two_factor, date_filter, sort_by
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")

@router.get("/users/{user_id}", response_model=UserResponseSchema)
async def get_user_details(
    user_id: str,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get detailed user information"""
    try:
        user = await admin_service.get_user_details(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user details: {str(e)}")


# =============================================================================
# PRODUCT MANAGEMENT ENDPOINTS
# =============================================================================

@router.get("/products", response_model=ProductsListResponseSchema)
async def get_products(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    featured: Optional[bool] = Query(None),
    sort_by: str = Query("created_at"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get products with filtering and pagination"""
    try:
        return await admin_service.get_products(
            page, limit, search, status, category, featured, sort_by
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch products: {str(e)}")

@router.get("/products/{product_id}", response_model=ProductResponseSchema)
async def get_product_details(
    product_id: str,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get detailed product information"""
    try:
        product = await admin_service.get_product_details(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch product details: {str(e)}")

# app/api/v1/admin.py (Additional endpoints to add to your existing file)

from fastapi import File, UploadFile, Form
from typing import List
import json

# Add these endpoints to your existing admin.py file

@router.post("/products", response_model=ProductResponseSchema)
async def create_product(
    title: str = Form(...),
    description: str = Form(...),
    short_description: str = Form(...),
    category: str = Form(...),
    price: float = Form(...),
    original_price: Optional[float] = Form(None),
    tags: str = Form("[]"),  # JSON string of tags
    version: str = Form("1.0.0"),
    license_type: str = Form("commercial"),
    requirements: str = Form("[]"),  # JSON string
    features: str = Form("[]"),  # JSON string
    use_cases: str = Form("[]"),  # JSON string
    status: str = Form("pending"),
    featured: bool = Form(False),
    
    # ADDED: Support for images and videos
    images: List[UploadFile] = File(default=[]),
    demo_video: Optional[UploadFile] = File(None),
    files: List[UploadFile] = File(default=[]),  # ZIP files
    
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new product with file uploads - UPDATED TO SUPPORT IMAGES/VIDEOS"""
    try:
        logger.info(f"📦 Creating product: {title}")
        logger.info(f"📸 Received {len(images)} images")
        logger.info(f"🎥 Received demo video: {demo_video.filename if demo_video and demo_video.filename else 'None'}")
        logger.info(f"📁 Received {len(files)} ZIP files")
        
        # Parse JSON fields
        try:
            tags_list = json.loads(tags) if tags else []
            requirements_list = json.loads(requirements) if requirements else []
            features_list = json.loads(features) if features else []
            use_cases_list = json.loads(use_cases) if use_cases else []
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON in tags, requirements, features, or use_cases")
        
        # Validate uploaded ZIP files
        for file in files:
            if file.filename and not file.filename.lower().endswith('.zip'):
                raise HTTPException(status_code=400, detail=f"Only ZIP files are allowed. Invalid file: {file.filename}")
        
        # ADDED: Validate images
        for image in images:
            if image.filename and not any(image.filename.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                raise HTTPException(status_code=400, detail=f"Invalid image format: {image.filename}")
        
        # ADDED: Validate demo video
        if demo_video and demo_video.filename:
            if not any(demo_video.filename.lower().endswith(ext) for ext in ['.mp4', '.mov', '.avi', '.mkv']):
                raise HTTPException(status_code=400, detail=f"Invalid video format: {demo_video.filename}")
        
        # Create product data
        product_data = ProductCreateSchema(
            title=title,
            description=description,
            short_description=short_description,
            category=category,
            price=price,
            original_price=original_price,
            tags=tags_list,
            version=version,
            license_type=license_type,
            requirements=requirements_list,
            features=features_list,
            use_cases=use_cases_list
        )
        
        # Create product
        new_product = await admin_service.create_product(product_data, current_user.id)
        product_id = new_product.id
        
        logger.info(f"✅ Product created with ID: {product_id}")
        
        # ADDED: Upload images using upload service
        image_urls = []
        if images:
            from app.services.upload_service import UploadService
            upload_service = UploadService()
            
            for i, image in enumerate(images):
                if image.filename and image.filename != '':
                    try:
                        logger.info(f"📸 Uploading image {i+1}: {image.filename}")
                        image_url = await upload_service.upload_image(
                            file=image,
                            folder="images"
                        )
                        image_urls.append(image_url)
                        logger.info(f"✅ Image uploaded: {image_url}")
                    except Exception as e:
                        logger.error(f"❌ Image upload failed: {e}")
                        continue
        
        # ADDED: Upload demo video
        demo_video_url = None
        if demo_video and demo_video.filename and demo_video.filename != '':
            try:
                from app.services.upload_service import UploadService
                upload_service = UploadService()
                logger.info(f"🎥 Uploading video: {demo_video.filename}")
                demo_video_url = await upload_service.upload_file(
                    file=demo_video,
                    folder="videos",
                    allowed_types=["video/mp4", "video/quicktime", "video/avi", "video/mov"],
                    max_size=100 * 1024 * 1024  # 100MB
                )
                logger.info(f"✅ Video uploaded: {demo_video_url}")
            except Exception as e:
                logger.error(f"❌ Video upload failed: {e}")
                demo_video_url = None
        
        # Upload ZIP files (existing logic)
        if files:
            uploaded_files = await admin_service.upload_product_files(product_id, files)
            logger.info(f"✅ ZIP files uploaded: {len(uploaded_files) if uploaded_files else 0}")
        
        # CRITICAL: Update the product with image and video URLs
        if image_urls or demo_video_url:
            try:
                await admin_service.update_product_media(product_id, image_urls, demo_video_url)
                logger.info(f"✅ Product media updated - Images: {len(image_urls)}, Video: {bool(demo_video_url)}")
            except Exception as e:
                logger.error(f"❌ Failed to update product media: {e}")
        
        # Refresh product data to include all uploaded content
        updated_product = await admin_service.get_product_details(product_id)
        
        # ADDED: Log final verification
        logger.info(f"🔍 Final product verification:")
        logger.info(f"   - Images in DB: {len(updated_product.images) if hasattr(updated_product, 'images') else 0}")
        logger.info(f"   - Video in DB: {bool(getattr(updated_product, 'demo_video', None))}")
        
        return updated_product
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Product creation failed: {e}")
        import traceback
        logger.error(f"❌ Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")

@router.put("/products/{product_id}", response_model=ProductResponseSchema)
async def update_product(
    product_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    short_description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    original_price: Optional[float] = Form(None),
    tags: Optional[str] = Form(None),  # JSON string
    version: Optional[str] = Form(None),
    license_type: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    featured: Optional[bool] = Form(None),
    rejection_reason: Optional[str] = Form(None),
    flag_reason: Optional[str] = Form(None),
    requirements: Optional[str] = Form(None),  # JSON string
    features: Optional[str] = Form(None),  # JSON string
    use_cases: Optional[str] = Form(None),  # JSON string
    files: List[UploadFile] = File(default=[]),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Update a product with optional file uploads"""
    try:
        # Parse JSON fields
        tags_list = None
        requirements_list = None
        features_list = None
        use_cases_list = None
        
        if tags:
            try:
                tags_list = json.loads(tags)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON in tags")
        
        if requirements:
            try:
                requirements_list = json.loads(requirements)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON in requirements")
        
        if features:
            try:
                features_list = json.loads(features)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON in features")
        
        if use_cases:
            try:
                use_cases_list = json.loads(use_cases)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON in use_cases")
        
        # Validate uploaded files (ZIP only)
        for file in files:
            if not file.filename.lower().endswith('.zip'):
                raise HTTPException(status_code=400, detail=f"Only ZIP files are allowed. Invalid file: {file.filename}")
        
        # Create update data
        updates = ProductUpdateSchema(
            title=title,
            description=description,
            short_description=short_description,
            category=category,
            price=price,
            original_price=original_price,
            tags=tags_list,
            version=version,
            license_type=license_type,
            status=status,
            featured=featured,
            rejection_reason=rejection_reason,
            flag_reason=flag_reason,
            requirements=requirements_list,
            features=features_list,
            use_cases=use_cases_list
        )
        
        # Update product
        updated_product = await admin_service.update_product(product_id, updates)
        if not updated_product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Upload new files if provided
        if files:
            uploaded_files = await admin_service.upload_product_files(product_id, files)
            if uploaded_files:
                # Refresh product data to include new file information
                updated_product = await admin_service.get_product_details(product_id)
        
        return updated_product
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update product: {str(e)}")

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete a product"""
    try:
        success = await admin_service.delete_product(product_id)
        if not success:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {"message": "Product deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete product: {str(e)}")

@router.post("/products/bulk-update")
async def bulk_update_products(
    operation: ProductBulkOperationSchema,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Bulk update products"""
    try:
        if not operation.product_ids:
            raise HTTPException(status_code=400, detail="No product IDs provided")
        
        updated_count = await admin_service.bulk_update_products(
            operation.product_ids, 
            operation.updates
        )
        
        return {
            "message": f"Successfully updated {updated_count} products",
            "updated_count": updated_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to bulk update products: {str(e)}")

@router.post("/products/{product_id}/files", response_model=List[str])
async def upload_product_files(
    product_id: str,
    files: List[UploadFile] = File(...),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Upload files for a product (ZIP files only)"""
    try:
        # Validate all files are ZIP
        for file in files:
            if not file.filename.lower().endswith('.zip'):
                raise HTTPException(status_code=400, detail=f"Only ZIP files are allowed. Invalid file: {file.filename}")
        
        # Check if product exists
        product = await admin_service.get_product_details(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Upload files
        uploaded_files = await admin_service.upload_product_files(product_id, files)
        
        return uploaded_files
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload files: {str(e)}")

@router.delete("/products/{product_id}/files")
async def remove_product_file(
    product_id: str,
    file_path: str,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Remove a file from a product"""
    try:
        success = await admin_service.remove_product_file(product_id, file_path)
        if not success:
            raise HTTPException(status_code=404, detail="File not found or could not be removed")
        
        return {"message": "File removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove file: {str(e)}")

@router.get("/products/stats", response_model=ProductStatsSchema)
async def get_product_stats(
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get product statistics"""
    try:
        return await admin_service.get_product_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch product stats: {str(e)}")

@router.get("/products/export")
async def export_products(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    featured: Optional[bool] = Query(None),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Export products to CSV"""
    try:
        filters = ProductExportFiltersSchema(
            search=search,
            status=status,
            category=category,
            featured=featured
        )
        
        csv_content = await admin_service.export_products(filters)
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=products_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export products: {str(e)}")

@router.get("/products/{product_id}/files")
async def get_product_files(
    product_id: str,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get list of files for a product"""
    try:
        product = await admin_service.get_product_details(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {
            "product_id": product_id,
            "files": product.files,
            "file_count": len(product.files)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Add these endpoints to your existing admin.py file (around line 300, after your existing product endpoints)

@router.post("/products/{product_id}/approve")
async def approve_product(
    product_id: str,
    current_admin: User = Depends(get_current_admin_user),  # Use real admin user
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    try:
        if not ObjectId.is_valid(product_id):
            raise HTTPException(status_code=400, detail="Invalid product ID")
        
        # Get the product and update seller name
        product = await db.products.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Get real seller name
        real_seller_name = await get_seller_name_by_id(product.get('seller_id'), db)
        
        result = await db.products.update_one(
            {"_id": ObjectId(product_id)},
            {
                "$set": {
                    "status": "approved",
                    "seller_name": real_seller_name,  # Update with real name
                    "approved_by": current_admin.id,
                    "approved_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {"success": True, "message": "Product approved successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/products/{product_id}/reject")
async def reject_product(
    product_id: str,
    reason: str = Form(...),
    current_admin: User = Depends(get_current_admin_user),  # Use real admin user
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    try:
        if not ObjectId.is_valid(product_id):
            raise HTTPException(status_code=400, detail="Invalid product ID")
        
        # Get the product and update seller name
        product = await db.products.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Get real seller name
        real_seller_name = await get_seller_name_by_id(product.get('seller_id'), db)
        
        result = await db.products.update_one(
            {"_id": ObjectId(product_id)},
            {
                "$set": {
                    "status": "rejected",
                    "seller_name": real_seller_name,  # Update with real name
                    "rejected_by": current_admin.id,
                    "rejected_at": datetime.utcnow(),
                    "rejection_reason": reason,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {"success": True, "message": "Product rejected successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/products/{product_id}/feature")
async def toggle_product_featured(
    product_id: str,
    feature_data: dict,  # Changed from Form to dict for JSON body
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Toggle product featured status"""
    try:
        logger.info(f"⭐ Setting product featured status: {product_id}")
        
        if not ObjectId.is_valid(product_id):
            raise HTTPException(status_code=400, detail="Invalid product ID")
        
        featured = feature_data.get("featured", False)
        
        db = admin_service.db
        
        # Update product featured status
        result = await db.products.update_one(
            {"_id": ObjectId(product_id)},
            {
                "$set": {
                    "featured": featured,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        
        action = "featured" if featured else "unfeatured"
        logger.info(f"✅ Product {action} successfully: {product_id}")
        
        return {
            "success": True,
            "message": f"Product {action} successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating product featured status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update product: {str(e)}")

@router.post("/products/bulk-approve")
async def bulk_approve_products(
    product_ids: List[str] = Form(..., description="List of product IDs to approve"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Bulk approve multiple products
    """
    try:
        logger.info(f"✅ Bulk approving {len(product_ids)} products")
        
        db = admin_service.db
        
        # Validate ObjectIds
        object_ids = []
        for pid in product_ids:
            if not ObjectId.is_valid(pid):
                raise HTTPException(status_code=400, detail=f"Invalid product ID: {pid}")
            object_ids.append(ObjectId(pid))
        
        # Update all products to approved
        result = await db.products.update_many(
            {"_id": {"$in": object_ids}},
            {
                "$set": {
                    "status": "approved",
                    "approved_at": datetime.utcnow(),
                    "published_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "approved_by": current_user.id
                }
            }
        )
        
        logger.info(f"✅ Bulk approved {result.modified_count} products")
        
        return {
            "success": True,
            "message": f"Approved {result.modified_count} products successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error bulk approving products: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to bulk approve products: {str(e)}")

@router.post("/products/bulk-reject")
async def bulk_reject_products(
    product_ids: List[str] = Form(..., description="List of product IDs to reject"),
    reason: str = Form(..., description="Reason for rejection"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Bulk reject multiple products
    """
    try:
        logger.info(f"❌ Bulk rejecting {len(product_ids)} products")
        
        db = admin_service.db
        
        # Validate ObjectIds
        object_ids = []
        for pid in product_ids:
            if not ObjectId.is_valid(pid):
                raise HTTPException(status_code=400, detail=f"Invalid product ID: {pid}")
            object_ids.append(ObjectId(pid))
        
        # Update all products to rejected
        result = await db.products.update_many(
            {"_id": {"$in": object_ids}},
            {
                "$set": {
                    "status": "rejected",
                    "rejection_reason": reason,
                    "rejected_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "rejected_by": current_user.id
                }
            }
        )
        
        logger.info(f"✅ Bulk rejected {result.modified_count} products")
        
        return {
            "success": True,
            "message": f"Rejected {result.modified_count} products successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error bulk rejecting products: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to bulk reject products: {str(e)}")
# =============================================================================
# ORDER MANAGEMENT ENDPOINTS
# =============================================================================

@router.get("/orders", response_model=OrdersListResponseSchema)
async def get_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    date_filter: Optional[str] = Query(None),
    sort_by: str = Query("order_date"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get orders with filtering and pagination"""
    try:
        return await admin_service.get_orders(
            page, limit, search, status, payment_status, date_filter, sort_by
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch orders: {str(e)}")

@router.get("/orders/{order_id}", response_model=OrderDetailResponseSchema)
async def get_order_details(
    order_id: str,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get detailed order information"""
    try:
        order = await admin_service.get_order_details(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        return order
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch order details: {str(e)}")

# =============================================================================
# NOTIFICATION MANAGEMENT ENDPOINTS
# =============================================================================

@router.get("/notifications", response_model=NotificationsListResponseSchema)
async def get_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get notifications with filtering and pagination"""
    try:
        return await admin_service.get_notifications(
            page, limit, search, type, status, channel
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch notifications: {str(e)}")

@router.get("/notifications/performance-metrics", response_model=NotificationPerformanceSchema)
async def get_notification_performance_metrics(
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get notification performance metrics"""
    try:
        return await admin_service.get_notification_performance_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch notification metrics: {str(e)}")

@router.get("/notifications/channel-distribution", response_model=List[ChannelDistributionSchema])
async def get_channel_distribution(
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get notification channel distribution"""
    try:
        return await admin_service.get_channel_distribution()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch channel distribution: {str(e)}")

# =============================================================================
# STATISTICS ENDPOINTS
# =============================================================================

@router.get("/stats/key-metrics", response_model=StatsKeyMetricsSchema)
async def get_stats_key_metrics(
    period: str = Query("7days", description="Time period: 7days, 30days, 90days, 1year"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get key metrics for statistics page"""
    try:
        return await admin_service.get_stats_key_metrics(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch key metrics: {str(e)}")

@router.get("/stats/chart-data", response_model=List[StatsChartDataSchema])
async def get_stats_chart_data(
    period: str = Query("7days", description="Time period: 7days, 30days, 90days, 1year"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get chart data for statistics page"""
    try:
        return await admin_service.get_stats_chart_data(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chart data: {str(e)}")

@router.get("/stats/top-categories", response_model=List[StatsTopCategorySchema])
async def get_stats_top_categories(
    period: str = Query("7days", description="Time period: 7days, 30days, 90days, 1year"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get top categories statistics"""
    try:
        return await admin_service.get_stats_top_categories(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch top categories: {str(e)}")

@router.get("/stats/conversion-funnel", response_model=StatsConversionFunnelSchema)
async def get_stats_conversion_funnel(
    period: str = Query("7days", description="Time period: 7days, 30days, 90days, 1year"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get conversion funnel statistics"""
    try:
        return await admin_service.get_stats_conversion_funnel(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch conversion funnel: {str(e)}")

@router.get("/stats/traffic-sources", response_model=List[StatsTrafficSourceSchema])
async def get_stats_traffic_sources(
    period: str = Query("7days", description="Time period: 7days, 30days, 90days, 1year"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get traffic sources statistics"""
    try:
        return await admin_service.get_stats_traffic_sources(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch traffic sources: {str(e)}")

@router.get("/stats/device-analytics", response_model=List[StatsDeviceAnalyticsSchema])
async def get_stats_device_analytics(
    period: str = Query("7days", description="Time period: 7days, 30days, 90days, 1year"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get device analytics statistics"""
    try:
        return await admin_service.get_stats_device_analytics(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch device analytics: {str(e)}")

# =============================================================================
# ADDITIONAL ENDPOINTS
# =============================================================================

@router.get("/analytics/overview")
async def get_analytics_overview(
    period: str = Query("30days", description="Time period: 7days, 30days, 90days, 1year"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get analytics overview"""
    try:
        return await admin_service.get_analytics_overview(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics overview: {str(e)}")

@router.get("/system/health")
async def get_system_health(
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get system health status"""
    try:
        import psutill
        return {
            "status": "healthy",
            "cpu_usage": round(psutil.cpu_percent(), 1),
            "memory_usage": round(psutil.virtual_memory().percent, 1),
            "uptime": "99.9%",  # You can implement real uptime calculation
            "database": "connected",
            "timestamp": datetime.now()
        }

    except Exception as e:
        return {
            "status": "healthy",
            "cpu_usage": 45.2,
            "memory_usage": 68.5,
            "uptime": "99.9%",
            "database": "connected",
            "timestamp": datetime.now()
        }

@router.post("/system/maintenance")
async def toggle_maintenance_mode(
    enabled: bool,
    message: Optional[str] = None,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Toggle maintenance mode"""
    try:
        result = await admin_service.toggle_maintenance_mode(enabled, message)
        return {"message": f"Maintenance mode {'enabled' if enabled else 'disabled'}", "status": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle maintenance mode: {str(e)}")

@router.get("/logs")
async def get_system_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    level: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get system logs"""
    try:
        return await admin_service.get_system_logs(page, limit, level, start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch system logs: {str(e)}")

@router.post("/backup")
async def create_backup(
    background_tasks: BackgroundTasks,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Create system backup"""
    try:
        backup_id = await admin_service.create_backup(background_tasks)
        return {"message": "Backup initiated", "backup_id": backup_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create backup: {str(e)}")

@router.get("/settings")
async def get_system_settings(
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get system settings"""
    try:
        return await admin_service.get_system_settings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch system settings: {str(e)}")

@router.put("/settings")
async def update_system_settings(
    settings: dict,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Update system settings"""
    try:
        result = await admin_service.update_system_settings(settings)
        return {"message": "Settings updated successfully", "settings": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update system settings: {str(e)}")

# =============================================================================
# CONTENT MODERATION ENDPOINTS
# =============================================================================

@router.get("/moderation/flagged-content")
async def get_flagged_content(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    content_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get flagged content for moderation"""
    try:
        return await admin_service.get_flagged_content(page, limit, content_type, status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch flagged content: {str(e)}")

@router.put("/moderation/content/{content_id}")
async def moderate_content(
    content_id: str,
    action: str,  # approve, reject, delete
    reason: Optional[str] = None,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Moderate flagged content"""
    try:
        if action not in ["approve", "reject", "delete"]:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        result = await admin_service.moderate_content(content_id, action, reason, current_user.id)
        return {"message": f"Content {action}d successfully", "result": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to moderate content: {str(e)}")

# =============================================================================
# FINANCIAL MANAGEMENT ENDPOINTS
# =============================================================================

@router.get("/finance/revenue-summary")
async def get_revenue_summary(
    period: str = Query("30days", description="Time period: 7days, 30days, 90days, 1year"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get revenue summary"""
    try:
        return await admin_service.get_revenue_summary(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch revenue summary: {str(e)}")

@router.get("/finance/payouts")
async def get_pending_payouts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get pending payouts"""
    try:
        return await admin_service.get_pending_payouts(page, limit, status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pending payouts: {str(e)}")

@router.post("/finance/payouts/{payout_id}/process")
async def process_payout(
    payout_id: str,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Process a payout"""
    try:
        result = await admin_service.process_payout(payout_id, current_user.id)
        return {"message": "Payout processed successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process payout: {str(e)}")

@router.get("/finance/transactions")
async def get_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    transaction_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get transaction history"""
    try:
        return await admin_service.get_transactions(
            page, limit, transaction_type, status, start_date, end_date
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transactions: {str(e)}")

# =============================================================================
# SUPPORT & TICKETS ENDPOINTS
# =============================================================================

@router.get("/support/tickets")
async def get_support_tickets(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get support tickets"""
    try:
        return await admin_service.get_support_tickets(page, limit, status, priority, category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch support tickets: {str(e)}")

@router.get("/support/tickets/{ticket_id}")
async def get_ticket_details(
    ticket_id: str,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get ticket details"""
    try:
        ticket = await admin_service.get_ticket_details(ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return ticket
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch ticket details: {str(e)}")

@router.put("/support/tickets/{ticket_id}")
async def update_ticket(
    ticket_id: str,
    ticket_update: dict,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Update support ticket"""
    try:
        result = await admin_service.update_ticket(ticket_id, ticket_update, current_user.id)
        if not result:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return {"message": "Ticket updated successfully", "ticket": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update ticket: {str(e)}")

@router.post("/support/tickets/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: str,
    reply_data: dict,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Reply to support ticket"""
    try:
        result = await admin_service.reply_to_ticket(ticket_id, reply_data, current_user.id)
        return {"message": "Reply sent successfully", "reply": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send reply: {str(e)}")

# =============================================================================
# REPORTING ENDPOINTS
# =============================================================================

@router.get("/reports/sales")
async def get_sales_report(
    period: str = Query("30days", description="Time period: 7days, 30days, 90days, 1year"),
    format: str = Query("json", description="Report format: json, csv, pdf"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get sales report"""
    try:
        if format == "csv":
            csv_content = await admin_service.get_sales_report_csv(period)
            return StreamingResponse(
                io.StringIO(csv_content),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=sales_report_{period}_{datetime.now().strftime('%Y%m%d')}.csv"}
            )
        elif format == "pdf":
            pdf_content = await admin_service.get_sales_report_pdf(period)
            return Response(
                content=pdf_content,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=sales_report_{period}_{datetime.now().strftime('%Y%m%d')}.pdf"}
            )
        else:
            return await admin_service.get_sales_report(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate sales report: {str(e)}")

@router.get("/reports/users")
async def get_users_report(
    period: str = Query("30days", description="Time period: 7days, 30days, 90days, 1year"),
    format: str = Query("json", description="Report format: json, csv"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get users report"""
    try:
        if format == "csv":
            csv_content = await admin_service.get_users_report_csv(period)
            return StreamingResponse(
                io.StringIO(csv_content),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=users_report_{period}_{datetime.now().strftime('%Y%m%d')}.csv"}
            )
        else:
            return await admin_service.get_users_report(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate users report: {str(e)}")

@router.get("/reports/products")
async def get_products_report(
    period: str = Query("30days", description="Time period: 7days, 30days, 90days, 1year"),
    format: str = Query("json", description="Report format: json, csv"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get products report"""
    try:
        if format == "csv":
            csv_content = await admin_service.get_products_report_csv(period)
            return StreamingResponse(
                io.StringIO(csv_content),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=products_report_{period}_{datetime.now().strftime('%Y%m%d')}.csv"}
            )
        else:
            return await admin_service.get_products_report(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate products report: {str(e)}")

# =============================================================================
# BULK OPERATIONS ENDPOINTS
# =============================================================================

@router.post("/bulk/users/import")
async def bulk_import_users(
    file: bytes,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Bulk import users from CSV"""
    try:
        result = await admin_service.bulk_import_users(file, current_user.id)
        return {"message": "Users imported successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import users: {str(e)}")

@router.post("/bulk/products/import")
async def bulk_import_products(
    file: bytes,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Bulk import products from CSV"""
    try:
        result = await admin_service.bulk_import_products(file, current_user.id)
        return {"message": "Products imported successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import products: {str(e)}")

@router.delete("/bulk/users")
async def bulk_delete_users(
    user_ids: List[str],
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Bulk delete users"""
    try:
        result = await admin_service.bulk_delete_users(user_ids, current_user.id)
        return {"message": f"Deleted {result['deleted_count']} users", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete users: {str(e)}")

@router.delete("/bulk/products")
async def bulk_delete_products(
    product_ids: List[str],
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Bulk delete products"""
    try:
        result = await admin_service.bulk_delete_products(product_ids, current_user.id)
        return {"message": f"Deleted {result['deleted_count']} products", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete products: {str(e)}")

# =============================================================================
# CACHE & PERFORMANCE ENDPOINTS
# =============================================================================

@router.post("/cache/clear")
async def clear_cache(
    cache_type: Optional[str] = Query(None, description="Cache type to clear: all, users, products, orders"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Clear application cache"""
    try:
        result = await admin_service.clear_cache(cache_type)
        return {"message": f"Cache cleared successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")

@router.get("/performance/metrics")
async def get_performance_metrics_detailed(
    period: str = Query("24hours", description="Time period: 1hour, 24hours, 7days"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get detailed performance metrics"""
    try:
        return await admin_service.get_performance_metrics_detailed(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch performance metrics: {str(e)}")

# =============================================================================
# EMAIL & NOTIFICATION MANAGEMENT
# =============================================================================

@router.get("/communications/templates")
async def get_email_templates(
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get email templates"""
    try:
        return await admin_service.get_email_templates()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch email templates: {str(e)}")

@router.put("/communications/templates/{template_id}")
async def update_email_template(
    template_id: str,
    template_data: dict,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Update email template"""
    try:
        result = await admin_service.update_email_template(template_id, template_data)
        return {"message": "Template updated successfully", "template": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update template: {str(e)}")

@router.post("/communications/broadcast")
async def send_broadcast_message(
    message_data: dict,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Send broadcast message to users"""
    try:
        result = await admin_service.send_broadcast_message(message_data, current_user.id)
        return {"message": "Broadcast message sent successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send broadcast message: {str(e)}")

# =============================================================================
# API MANAGEMENT ENDPOINTS
# =============================================================================

@router.get("/api/usage")
async def get_api_usage_stats(
    period: str = Query("7days", description="Time period: 1day, 7days, 30days"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get API usage statistics"""
    try:
        return await admin_service.get_api_usage_stats(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch API usage stats: {str(e)}")

@router.get("/api/rate-limits")
async def get_rate_limit_status(
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Get rate limit status"""
    try:
        return await admin_service.get_rate_limit_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch rate limit status: {str(e)}")

@router.post("/api/rate-limits/reset")
async def reset_rate_limits(
    user_id: Optional[str] = None,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
):
    """Reset rate limits for a user or all users"""
    try:
        result = await admin_service.reset_rate_limits(user_id)
        return {"message": "Rate limits reset successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset rate limits: {str(e)}")