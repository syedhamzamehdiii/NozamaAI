# backend/app/api/v1/simple_admin_products.py - COMPLETE FIXED VERSION
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from typing import Optional, List
from bson import ObjectId
from datetime import datetime
import json
import logging
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

# Create router for simple admin product operations
simple_admin_products_router = APIRouter(prefix="/simple-admin", tags=["Simple Admin Products"])

# Import authentication from the fixed backend
from .simple_admin_backend import get_current_simple_admin, get_database

# =================== SIMPLE FILE UPLOAD HANDLER ===================

async def save_uploaded_file(file: UploadFile, folder: str) -> str:
    """Simple file upload handler - saves to uploads directory"""
    try:
        # Create uploads directory structure
        upload_dir = Path("uploads") / folder
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = upload_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Return URL path (with forward slashes for web)
        url_path = f"/uploads/{folder}/{unique_filename}".replace("\\", "/")
        logger.info(f"📁 File saved: {file.filename} -> {url_path}")
        
        return url_path
        
    except Exception as e:
        logger.error(f"❌ File upload failed: {e}")
        raise Exception(f"Failed to upload {file.filename}: {str(e)}")

# =================== PRODUCT ENDPOINTS ===================

@simple_admin_products_router.post("/products")
async def create_my_product(
    title: str = Form(...),
    description: str = Form(...),
    short_description: str = Form(...),
    category: str = Form(...),
    price: float = Form(...),
    original_price: Optional[float] = Form(None),
    tags: str = Form("[]"),
    version: str = Form("1.0.0"),
    license_type: str = Form("commercial"),
    requirements: str = Form("[]"),
    features: str = Form("[]"),
    use_cases: str = Form("[]"),
    images: List[UploadFile] = File(default=[]),
    demo_video: Optional[UploadFile] = File(None),
    files: List[UploadFile] = File(default=[]),
    current_simple_admin = Depends(get_current_simple_admin)
):
    """Create product as simple admin - RESTRICTED to own products only"""
    try:
        logger.info(f"🆕 Simple Admin {current_simple_admin['email']} creating product: {title}")
        
        # Get database
        db = await get_database()
        
        # Parse JSON fields safely
        try:
            tags_list = json.loads(tags) if tags else []
            requirements_list = json.loads(requirements) if requirements else []
            features_list = json.loads(features) if features else []
            use_cases_list = json.loads(use_cases) if use_cases else []
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON parse error: {e}")
            raise HTTPException(status_code=400, detail="Invalid JSON in form fields")
        
        # Handle file uploads
        uploaded_images = []
        demo_video_url = None
        uploaded_files = []
        
        # Upload images
        if images:
            for i, image in enumerate(images):
                if image.filename and image.filename.strip():
                    try:
                        # Validate image type
                        if not any(image.filename.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                            logger.warning(f"⚠️ Skipping invalid image type: {image.filename}")
                            continue
                        
                        image_url = await save_uploaded_file(image, "images")
                        uploaded_images.append(image_url)
                        logger.info(f"📸 Image {i+1} uploaded: {image_url}")
                        
                    except Exception as e:
                        logger.error(f"❌ Image upload failed: {e}")
                        continue
        
        # Upload demo video
        if demo_video and demo_video.filename and demo_video.filename.strip():
            try:
                if any(demo_video.filename.lower().endswith(ext) for ext in ['.mp4', '.mov', '.avi', '.mkv']):
                    demo_video_url = await save_uploaded_file(demo_video, "videos")
                    logger.info(f"🎥 Video uploaded: {demo_video_url}")
                else:
                    logger.warning(f"⚠️ Invalid video format: {demo_video.filename}")
            except Exception as e:
                logger.error(f"❌ Video upload failed: {e}")
        
        # Upload ZIP files
        if files:
            for file in files:
                if file.filename and file.filename.strip():
                    try:
                        if file.filename.lower().endswith('.zip'):
                            file_url = await save_uploaded_file(file, "files")
                            uploaded_files.append(file_url)
                            logger.info(f"📁 File uploaded: {file_url}")
                        else:
                            logger.warning(f"⚠️ Only ZIP files allowed: {file.filename}")
                    except Exception as e:
                        logger.error(f"❌ File upload failed: {e}")
                        continue
        
        # Create product document
        product_doc = {
            "title": title.strip(),
            "description": description.strip(),
            "short_description": short_description.strip(),
            "category": category,
            "price": float(price),
            "original_price": float(original_price) if original_price else None,
            "tags": tags_list,
            "version": version,
            "license_type": license_type,
            "requirements": requirements_list,
            "features": features_list,
            "use_cases": use_cases_list,
            "images": uploaded_images,
            "demo_video": demo_video_url,
            "files": uploaded_files,
            
            # CRITICAL: Simple admin restrictions
            "status": "pending",  # Always pending for simple admin
            "featured": False,    # Cannot be featured
            
            # Track creator
            "created_by_simple_admin_id": ObjectId(current_simple_admin["_id"]),
            "simple_admin_name": current_simple_admin.get("name"),
            "simple_admin_email": current_simple_admin.get("email"),
            
            # Timestamps
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            
            # Initialize stats
            "view_count": 0,
            "download_count": 0,
            "sales_count": 0,
            "rating": 0,
            "rating_count": 0,
            "revenue": 0
        }
        
        # Insert product into database
        result = await db.products.insert_one(product_doc)
        product_id = result.inserted_id
        
        logger.info(f"✅ Product created successfully: {product_id}")
        
        # Prepare response
        product_doc["id"] = str(product_id)
        product_doc["_id"] = str(product_id)
        product_doc["created_by_simple_admin_id"] = str(product_doc["created_by_simple_admin_id"])
        
        return {
            "success": True,
            "message": "Product created successfully and submitted for Super Admin review",
            "product": product_doc,
            "status": "pending",
            "note": "Your product is now pending Super Admin approval"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating product: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")

@simple_admin_products_router.put("/products/{product_id}")
async def update_my_product(
    product_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    short_description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    original_price: Optional[float] = Form(None),
    tags: Optional[str] = Form(None),
    version: Optional[str] = Form(None),
    license_type: Optional[str] = Form(None),
    requirements: Optional[str] = Form(None),
    features: Optional[str] = Form(None),
    use_cases: Optional[str] = Form(None),
    images: List[UploadFile] = File(default=[]),
    demo_video: Optional[UploadFile] = File(None),
    files: List[UploadFile] = File(default=[]),
    current_simple_admin = Depends(get_current_simple_admin)
):
    """Update product as simple admin - ONLY own pending products"""
    try:
        logger.info(f"✏️ Simple Admin {current_simple_admin['email']} updating product: {product_id}")
        
        # Validate product ID
        if not ObjectId.is_valid(product_id):
            raise HTTPException(status_code=400, detail="Invalid product ID")
        
        db = await get_database()
        object_id = ObjectId(product_id)
        
        # CRITICAL: Check ownership and status
        product = await db.products.find_one({
            "_id": object_id,
            "created_by_simple_admin_id": ObjectId(current_simple_admin["_id"])
        })
        
        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found or you don't have permission to edit this product"
            )
        
        # RESTRICTION: Can only edit pending products
        if product.get("status") != "pending":
            raise HTTPException(
                status_code=403,
                detail=f"Cannot edit {product.get('status')} products. Only pending products can be modified."
            )
        
        # Build update data
        update_data = {}
        
        if title:
            update_data["title"] = title.strip()
        if description:
            update_data["description"] = description.strip()
        if short_description:
            update_data["short_description"] = short_description.strip()
        if category:
            update_data["category"] = category
        if price is not None:
            update_data["price"] = float(price)
        if original_price is not None:
            update_data["original_price"] = float(original_price)
        if version:
            update_data["version"] = version
        if license_type:
            update_data["license_type"] = license_type
        
        # Parse JSON fields
        try:
            if tags:
                update_data["tags"] = json.loads(tags)
            if requirements:
                update_data["requirements"] = json.loads(requirements)
            if features:
                update_data["features"] = json.loads(features)
            if use_cases:
                update_data["use_cases"] = json.loads(use_cases)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON in form fields")
        
        # Handle new file uploads
        if images and any(img.filename and img.filename.strip() for img in images):
            uploaded_images = []
            for image in images:
                if image.filename and image.filename.strip():
                    try:
                        if any(image.filename.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                            image_url = await save_uploaded_file(image, "images")
                            uploaded_images.append(image_url)
                    except Exception as e:
                        logger.error(f"❌ Image upload failed: {e}")
                        continue
            
            if uploaded_images:
                update_data["images"] = uploaded_images
        
        if demo_video and demo_video.filename and demo_video.filename.strip():
            try:
                if any(demo_video.filename.lower().endswith(ext) for ext in ['.mp4', '.mov', '.avi', '.mkv']):
                    demo_video_url = await save_uploaded_file(demo_video, "videos")
                    update_data["demo_video"] = demo_video_url
            except Exception as e:
                logger.error(f"❌ Video upload failed: {e}")
        
        if files and any(f.filename and f.filename.strip() for f in files):
            uploaded_files = []
            for file in files:
                if file.filename and file.filename.strip():
                    try:
                        if file.filename.lower().endswith('.zip'):
                            file_url = await save_uploaded_file(file, "files")
                            uploaded_files.append(file_url)
                    except Exception as e:
                        logger.error(f"❌ File upload failed: {e}")
                        continue
            
            if uploaded_files:
                # Add to existing files
                existing_files = product.get("files", [])
                update_data["files"] = existing_files + uploaded_files
        
        # CRITICAL: Reset to pending and update timestamp
        update_data["status"] = "pending"
        update_data["updated_at"] = datetime.utcnow()
        
        # Update product
        await db.products.update_one(
            {"_id": object_id},
            {"$set": update_data}
        )
        
        logger.info(f"✅ Product updated successfully: {product_id}")
        
        return {
            "success": True,
            "message": "Product updated successfully and resubmitted for Super Admin review",
            "product_id": product_id,
            "status": "pending"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating product: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update product: {str(e)}")

@simple_admin_products_router.get("/products/{product_id}")
async def get_my_product(
    product_id: str,
    current_simple_admin = Depends(get_current_simple_admin)
):
    """Get product details - ONLY own products"""
    try:
        if not ObjectId.is_valid(product_id):
            raise HTTPException(status_code=400, detail="Invalid product ID")
        
        db = await get_database()
        object_id = ObjectId(product_id)
        
        # Check ownership
        product = await db.products.find_one({
            "_id": object_id,
            "created_by_simple_admin_id": ObjectId(current_simple_admin["_id"])
        })
        
        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found or you don't have permission to view this product"
            )
        
        # Convert ObjectIds for response
        product["id"] = str(product["_id"])
        del product["_id"]
        if "created_by_simple_admin_id" in product:
            product["created_by_simple_admin_id"] = str(product["created_by_simple_admin_id"])
        
        return {
            "success": True,
            "product": product
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting product: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@simple_admin_products_router.get("/products")
async def get_my_products(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    current_simple_admin = Depends(get_current_simple_admin)
):
    """Get products created by this simple admin - ONLY own products"""
    try:
        db = await get_database()
        simple_admin_id = ObjectId(current_simple_admin["_id"])
        
        # Build query - ONLY products created by this simple admin
        query = {"created_by_simple_admin_id": simple_admin_id}
        if status:
            query["status"] = status
        
        logger.info(f"📦 Query: {query}")
        
        # Get products
        cursor = db.products.find(query).skip(skip).limit(limit).sort("created_at", -1)
        products = await cursor.to_list(length=limit)
        total = await db.products.count_documents(query)
        
        # Convert ObjectIds for JSON response
        for product in products:
            product["id"] = str(product["_id"])
            del product["_id"]
            if "created_by_simple_admin_id" in product:
                product["created_by_simple_admin_id"] = str(product["created_by_simple_admin_id"])
        
        # Get stats for this simple admin only
        stats = {
            "total": total,
            "myProducts": total,
            "pending": await db.products.count_documents({
                "created_by_simple_admin_id": simple_admin_id,
                "status": "pending"
            }),
            "approved": await db.products.count_documents({
                "created_by_simple_admin_id": simple_admin_id,
                "status": "approved"
            }),
            "rejected": await db.products.count_documents({
                "created_by_simple_admin_id": simple_admin_id,
                "status": "rejected"
            })
        }
        
        logger.info(f"✅ Returned {len(products)} products for Simple Admin {current_simple_admin['email']}")
        
        return {
            "success": True,
            "products": products,
            "total": total,
            "stats": stats,
            "simple_admin": {
                "id": str(current_simple_admin["_id"]),
                "name": current_simple_admin.get("name"),
                "email": current_simple_admin.get("email")
            },
            "restrictions": {
                "can_create": True,
                "can_edit_pending": True,
                "can_edit_approved": False,
                "can_delete": False,
                "can_approve": False,
                "can_feature": False
            },
            "note": "You can only see and edit YOUR products. Products start as 'pending' and require Super Admin approval."
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting products: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =================== RESTRICTED OPERATIONS ===================
# These endpoints are intentionally NOT implemented for Simple Admins:
# - DELETE /products/{id} (Simple admins cannot delete products)
# - PUT /products/{id}/approve (Only Super Admin can approve)
# - PUT /products/{id}/reject (Only Super Admin can reject)
# - PUT /products/{id}/feature (Only Super Admin can feature)

logger.info("✅ Simple Admin Products router loaded successfully!")
logger.info("🔒 RESTRICTIONS ENFORCED:")
logger.info("   - Simple Admin can only CREATE products (status: pending)")
logger.info("   - Simple Admin can only UPDATE own pending products")
logger.info("   - Simple Admin can only VIEW own products")
logger.info("   - Simple Admin CANNOT delete, approve, reject, or feature products")
logger.info("   - All products require Super Admin approval to go live")