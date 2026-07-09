# =============== app/api/v1/upload.py ===============
"""
File upload endpoints
"""

from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
import os
import uuid
from pathlib import Path

from app.api.dependencies import (
    get_current_active_user,
    get_current_seller_user,
    rate_limiter,
    strict_rate_limiter,
    get_product_service
)
from app.services.upload_service import UploadService
from app.services.product_service import ProductService
from app.models.user import User
from app.config import settings

router = APIRouter()

@router.post("/image", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    purpose: str = Form(...),  # avatar, product, banner, etc.
    current_user: User = Depends(get_current_active_user),
    upload_service: UploadService = Depends(),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Upload an image file
    """
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Validate file size
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds {settings.MAX_FILE_SIZE} bytes"
        )
    
    # Reset file pointer
    file.file.seek(0)
    
    # Upload file
    try:
        upload_result = await upload_service.upload_image(
            file=file,
            folder=f"{purpose}s",  # products, avatars, etc.
            max_width=1200,
            max_height=800,
            quality=85
        )
        
        return {
            "file_url": upload_result,
            "url": upload_result,  # Add both for compatibility
            "filename": file.filename
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload image"
        )

@router.post("/product-with-images", status_code=status.HTTP_201_CREATED)
async def create_product_with_images(
    title: str = Form(...),
    description: str = Form(...),
    short_description: str = Form(...),
    category: str = Form(...),
    price: float = Form(...),
    tags: str = Form("[]"),
    version: str = Form("1.0.0"),
    license_type: str = Form("commercial"),
    images: List[UploadFile] = File([]),
    files: List[UploadFile] = File([]),
    demo_video: UploadFile = File(None),
    current_user: User = Depends(get_current_seller_user),
    upload_service: UploadService = Depends(),
    _: bool = Depends(strict_rate_limiter)
) -> Any:
    """
    Create product with images and files upload
    """
    try:
        from app.config.database import get_database
        from motor.motor_asyncio import AsyncIOMotorDatabase
        import json
        from datetime import datetime
        
        # Get database
        db = await get_database()
        
        # Upload images to uploads folder
        image_urls = []
        for image in images:
            if image.content_type and image.content_type.startswith("image/"):
                # Upload each image
                image_url = await upload_service.upload_image(
                    file=image,
                    folder="products/images",
                    max_width=1200,
                    max_height=800,
                    quality=85
                )
                image_urls.append(image_url)
        
        # Upload demo video if provided
        demo_video_url = None
        if demo_video and demo_video.filename:
            if demo_video.content_type and demo_video.content_type.startswith("video/"):
                demo_video_url = await upload_service.upload_file(
                    file=demo_video,
                    folder="products/videos",
                    allowed_types=["video/mp4", "video/quicktime", "video/x-msvideo"],
                    max_size=100 * 1024 * 1024  # 100MB
                )
        
        # Upload ZIP files to uploads folder
        file_urls = []
        for zip_file in files:
            if zip_file.filename and zip_file.filename.endswith('.zip'):
                file_url = await upload_service.upload_file(
                    file=zip_file,
                    folder="products/files",
                    allowed_types=["application/zip", "application/x-zip-compressed"],
                    max_size=500 * 1024 * 1024  # 500MB
                )
                file_urls.append({
                    "filename": zip_file.filename,
                    "url": file_url,
                    "size": zip_file.size if hasattr(zip_file, 'size') else 0
                })
        
        # Parse tags
        try:
            tags_list = json.loads(tags) if tags else []
        except:
            tags_list = [tag.strip() for tag in tags.split(',') if tag.strip()] if tags else []
        
        # Create product document
        product_doc = {
            "title": title,
            "description": description,
            "short_description": short_description,
            "category": category,
            "price": float(price),
            "tags": tags_list,
            "version": version,
            "license_type": license_type,
            "images": image_urls,  # Now these are actual file URLs
            "demo_video_url": demo_video_url,
            "files": file_urls,
            "seller_id": str(current_user.id),
            "seller_name": current_user.username or "Unknown Seller",
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "view_count": 0,
            "download_count": 0,
            "rating": 0.0,
            "rating_count": 0,
            "sales_count": 0,
            "featured": False,
            "is_active": True
        }
        
        # Insert into database
        result = await db.products.insert_one(product_doc)
        
        return {
            "success": True,
            "message": "Product created successfully",
            "product_id": str(result.inserted_id),
            "images_uploaded": len(image_urls),
            "files_uploaded": len(file_urls),
            "demo_video": demo_video_url is not None
        }
        
    except Exception as e:
        logger.error(f"Product creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create product: {str(e)}"
        )
        
        
@router.post("/product-file", status_code=status.HTTP_201_CREATED)
async def upload_product_file(
    file: UploadFile = File(...),
    product_id: str = Form(...),
    description: str = Form(""),
    current_user: User = Depends(get_current_seller_user),
    upload_service: UploadService = Depends(),
    product_service: ProductService = Depends(get_product_service),
    _: bool = Depends(strict_rate_limiter)
) -> Any:
    """
    Upload a product file (Seller only)
    """
    # Verify product ownership
    product = await product_service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product.seller_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload files for this product"
        )
    
    # Validate file type
    allowed_types = settings.ALLOWED_FILE_TYPES
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not allowed"
        )
    
    # Validate file size
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size"
        )
    
    # Reset file pointer
    file.file.seek(0)
    
    try:
        upload_result = await upload_service.upload_product_file(
            file=file,
            product_id=product_id,
            user_id=current_user.id,
            description=description
        )
        
        return {
            "file_id": upload_result["id"],
            "filename": upload_result["filename"],
            "file_size": upload_result["size"],
            "content_type": upload_result["content_type"]
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload product file"
        )

@router.get("/product-files/{product_id}")
async def get_product_files(
    product_id: str,
    current_user: User = Depends(get_current_active_user),
    upload_service: UploadService = Depends(),
    product_service: ProductService = Depends(get_product_service)
) -> Any:
    """
    Get product files list
    """
    # Verify product ownership or purchase
    product = await product_service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check if user is seller or has purchased the product
    if product.seller_id != str(current_user.id):
        # Check if user has purchased this product
        has_purchased = await product_service.user_has_purchased_product(
            user_id=current_user.id,
            product_id=product_id
        )
        
        if not has_purchased:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view product files"
            )
    
    files = await upload_service.get_product_files(product_id)
    return files

@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_active_user),
    upload_service: UploadService = Depends()
) -> Any:
    """
    Download a file
    """
    # Get file info and verify access
    file_info = await upload_service.get_file_info(file_id)
    if not file_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check access permissions
    has_access = await upload_service.user_has_file_access(
        user_id=current_user.id,
        file_id=file_id
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to download this file"
        )
    
    # Generate download stream
    try:
        file_stream = await upload_service.get_file_stream(file_id)
        
        return StreamingResponse(
            file_stream,
            media_type=file_info["content_type"],
            headers={
                "Content-Disposition": f"attachment; filename={file_info['filename']}"
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download file"
        )

@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_active_user),
    upload_service: UploadService = Depends()
) -> None:
    """
    Delete a file
    """
    # Get file info and verify ownership
    file_info = await upload_service.get_file_info(file_id)
    if not file_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check if user owns the file or is admin
    if file_info["user_id"] != str(current_user.id) and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this file"
        )
    
    success = await upload_service.delete_file(file_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file"
        )

@router.get("/user-files")
async def get_user_files(
    file_type: str = None,
    current_user: User = Depends(get_current_active_user),
    upload_service: UploadService = Depends()
) -> Any:
    """
    Get user's uploaded files
    """
    files = await upload_service.get_user_files(
        user_id=current_user.id,
        file_type=file_type
    )
    return files