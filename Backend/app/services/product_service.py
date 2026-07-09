# =============== app/services/product_service.py ===============
from typing import Optional, Dict, Any, List
from datetime import datetime
from fastapi import HTTPException, status, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import re
from urllib.parse import quote

from app.models.product import Product, ProductStatus, ProductCategory, ProductFile, LicenseType
from app.services.upload_service import UploadService
from app.services.notification_service import NotificationService

class ProductService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.products_collection = db.products
        self.reviews_collection = db.reviews
        self.upload_service = UploadService()
        self.notification_service = NotificationService(db)
    
    def _to_product_model(self, product_data: Dict[str, Any]) -> Product:
        """Convert raw Mongo document to Product model, coercing _id to string."""
        if product_data is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        try:
            if product_data.get("_id") is not None:
                product_data["_id"] = str(product_data["_id"])
            return Product(**product_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to parse product: {str(e)}"
            )

    async def get_product_doc_by_id(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Return raw product document with serialized id, without strict schema validation."""
        try:
            product_data = await self.products_collection.find_one({"_id": ObjectId(product_id)})
            if not product_data:
                return None
            product_data["_id"] = str(product_data["_id"])
            return product_data
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch product: {str(e)}"
            )
    
    async def create_product(self, product_data: Dict[str, Any], seller_id: str) -> Product:
        """Create a new product"""
        try:
            # Get seller information
            seller = await self.db.users.find_one({"_id": ObjectId(seller_id)})
            if not seller:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Seller not found"
                )
            
            # Generate slug from title
            slug = self._generate_slug(product_data["title"])
            
            # Ensure slug is unique
            slug = await self._ensure_unique_slug(slug)
            
            # Create product object
            product = Product(
                title=product_data["title"],
                description=product_data["description"],
                short_description=product_data["short_description"],
                seller_id=seller_id,
                seller_name=f"{seller['first_name']} {seller['last_name']}",
                category=ProductCategory(product_data["category"]),
                subcategory=product_data.get("subcategory"),
                tags=product_data.get("tags", []),
                price=float(product_data["price"]),
                original_price=product_data.get("original_price"),
                version=product_data.get("version", "1.0.0"),
                license_type=LicenseType(product_data.get("license_type", "commercial")),
                requirements=product_data.get("requirements", []),
                features=product_data.get("features", []),
                use_cases=product_data.get("use_cases", []),
                slug=slug,
                status=ProductStatus.DRAFT
            )
            
            # Insert product into database
            result = await self.products_collection.insert_one(product.dict(by_alias=True))
            product.id = str(result.inserted_id)
            
            # Update seller's product count
            await self.db.users.update_one(
                {"_id": ObjectId(seller_id)},
                {"$inc": {"products_listed": 1}}
            )
            
            return product
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create product: {str(e)}"
            )
    
    async def get_product_by_id(self, product_id: str) -> Optional[Product]:
        """Get product by ID"""
        try:
            product_data = await self.products_collection.find_one({"_id": ObjectId(product_id)})
            if product_data:
                return self._to_product_model(product_data)
            return None
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch product: {str(e)}"
            )
    
    async def get_product_by_slug(self, slug: str) -> Optional[Product]:
        """Get product by slug"""
        try:
            product_data = await self.products_collection.find_one({"slug": slug})
            if product_data:
                # Increment view count
                await self.products_collection.update_one(
                    {"_id": product_data["_id"]},
                    {"$inc": {"view_count": 1}}
                )
                return self._to_product_model(product_data)
            return None
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch product: {str(e)}"
            )
    
    async def update_product(self, product_id: str, update_data: Dict[str, Any], seller_id: str) -> Product:
        """Update product"""
        try:
            # Check if product exists and belongs to seller
            product = await self.get_product_by_id(product_id)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Product not found"
                )
            
            if product.seller_id != seller_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to update this product"
                )
            
            # Update slug if title changed
            if "title" in update_data and update_data["title"] != product.title:
                new_slug = self._generate_slug(update_data["title"])
                new_slug = await self._ensure_unique_slug(new_slug, exclude_id=product_id)
                update_data["slug"] = new_slug
            
            # Add updated timestamp
            update_data["updated_at"] = datetime.utcnow()
            
            # If product was approved and now being edited, change status to pending
            if product.status == ProductStatus.APPROVED:
                update_data["status"] = ProductStatus.PENDING
            
            # Update product in database
            result = await self.products_collection.update_one(
                {"_id": ObjectId(product_id)},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No changes made to product"
                )
            
            return await self.get_product_by_id(product_id)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update product: {str(e)}"
            )
    
    async def upload_product_image(self, product_id: str, image_file: UploadFile, seller_id: str) -> str:
        """Upload product image"""
        try:
            # Verify product ownership
            product = await self.get_product_by_id(product_id)
            if not product or product.seller_id != seller_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to upload images for this product"
                )
            
            # Upload image
            image_url = await self.upload_service.upload_file(
                file=image_file,
                folder=f"products/{product_id}",
                allowed_types=["image/jpeg", "image/png", "image/webp"]
            )
            
            # Add image to product
            await self.products_collection.update_one(
                {"_id": ObjectId(product_id)},
                {
                    "$push": {"images": image_url},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            return image_url
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload image: {str(e)}"
            )
    
    async def upload_product_file(self, product_id: str, file: UploadFile, seller_id: str) -> ProductFile:
        """Upload product file"""
        try:
            # Verify product ownership
            product = await self.get_product_by_id(product_id)
            if not product or product.seller_id != seller_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to upload files for this product"
                )
            
            # Upload file
            file_url = await self.upload_service.upload_file(
                file=file,
                folder=f"products/{product_id}/files",
                allowed_types=None  # Allow all file types for product files
            )
            
            # Create product file object
            product_file = ProductFile(
                filename=file.filename,
                file_path=file_url,
                file_size=file.size,
                mime_type=file.content_type
            )
            
            # Add file to product
            await self.products_collection.update_one(
                {"_id": ObjectId(product_id)},
                {
                    "$push": {"files": product_file.dict()},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            return product_file
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file: {str(e)}"
            )
    
    async def get_products_list(
        self,
        skip: int = 0,
        limit: int = 20,
        category: Optional[ProductCategory] = None,
        status: Optional[ProductStatus] = None,
        seller_id: Optional[str] = None,
        search: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        tags: Optional[List[str]] = None,
        sort_by: str = "created_at",
        sort_order: int = -1
    ) -> Dict[str, Any]:
        """Get paginated list of products"""
        try:
            # Build filter query
            filter_query = {"is_active": True}
            
            if category:
                filter_query["category"] = category
            
            if status:
                filter_query["status"] = status
            else:
                # Default to approved products for public listing
                filter_query["status"] = ProductStatus.APPROVED
            
            if seller_id:
                filter_query["seller_id"] = seller_id
            
            if search:
                filter_query["$or"] = [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"description": {"$regex": search, "$options": "i"}},
                    {"tags": {"$regex": search, "$options": "i"}},
                    {"seller_name": {"$regex": search, "$options": "i"}}
                ]
            
            if min_price is not None or max_price is not None:
                price_filter = {}
                if min_price is not None:
                    price_filter["$gte"] = min_price
                if max_price is not None:
                    price_filter["$lte"] = max_price
                filter_query["price"] = price_filter
            
            if tags:
                filter_query["tags"] = {"$in": tags}
            
            # Get total count
            total = await self.products_collection.count_documents(filter_query)
            
            # Get products
            cursor = self.products_collection.find(filter_query)
            cursor.skip(skip).limit(limit).sort(sort_by, sort_order)
            
            products_data = await cursor.to_list(length=limit)
            products = [Product(**product_data) for product_data in products_data]
            
            return {
                "products": [self._serialize_product(product) for product in products],
                "total": total,
                "skip": skip,
                "limit": limit
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get products list: {str(e)}"
            )
    
    async def approve_product(self, product_id: str, admin_id: str) -> Product:
        """Approve product (admin only)"""
        try:
            product = await self.get_product_by_id(product_id)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Product not found"
                )
            
            # Update product status
            await self.products_collection.update_one(
                {"_id": ObjectId(product_id)},
                {
                    "$set": {
                        "status": ProductStatus.APPROVED,
                        "published_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Send notification to seller
            await self.notification_service.send_notification(
                user_id=product.seller_id,
                title="Product Approved",
                message=f"Your product '{product.title}' has been approved and is now live on the marketplace.",
                notification_type="product_approved",
                data={"product_id": product_id}
            )
            
            return await self.get_product_by_id(product_id)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to approve product: {str(e)}"
            )
    
    async def reject_product(self, product_id: str, admin_id: str, reason: str) -> Product:
        """Reject product (admin only)"""
        try:
            product = await self.get_product_by_id(product_id)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Product not found"
                )
            
            # Update product status
            await self.products_collection.update_one(
                {"_id": ObjectId(product_id)},
                {
                    "$set": {
                        "status": ProductStatus.REJECTED,
                        "updated_at": datetime.utcnow(),
                        "rejection_reason": reason
                    }
                }
            )
            
            # Send notification to seller
            await self.notification_service.send_notification(
                user_id=product.seller_id,
                title="Product Rejected",
                message=f"Your product '{product.title}' has been rejected. Reason: {reason}",
                notification_type="product_rejected",
                data={"product_id": product_id, "reason": reason}
            )
            
            return await self.get_product_by_id(product_id)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to reject product: {str(e)}"
            )
    
    async def delete_product(self, product_id: str, seller_id: str) -> Dict[str, Any]:
        """Delete product"""
        try:
            # Check if product exists and belongs to seller
            product = await self.get_product_by_id(product_id)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Product not found"
                )
            
            if product.seller_id != seller_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to delete this product"
                )
            
            # Check if product has any sales
            orders_count = await self.db.orders.count_documents({
                "items.product_id": product_id,
                "status": "completed"
            })
            
            if orders_count > 0:
                # Soft delete - deactivate instead of removing
                await self.products_collection.update_one(
                    {"_id": ObjectId(product_id)},
                    {
                        "$set": {
                            "is_active": False,
                            "status": ProductStatus.ARCHIVED,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                return {"message": "Product has been archived due to existing sales"}
            else:
                # Hard delete if no sales
                await self.products_collection.delete_one({"_id": ObjectId(product_id)})
                
                # Update seller's product count
                await self.db.users.update_one(
                    {"_id": ObjectId(seller_id)},
                    {"$inc": {"products_listed": -1}}
                )
                
                return {"message": "Product has been permanently deleted"}
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete product: {str(e)}"
            )
    
    async def get_featured_products(self, limit: int = 10) -> List[Product]:
        """Get featured products"""
        try:
            cursor = self.products_collection.find({
                "featured": True,
                "status": ProductStatus.APPROVED,
                "is_active": True
            }).limit(limit).sort("created_at", -1)
            
            products_data = await cursor.to_list(length=limit)
            return [self._to_product_model(product_data) for product_data in products_data]
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get featured products: {str(e)}"
            )
    
    async def get_related_products(self, product_id: str, limit: int = 6) -> List[Product]:
        """Get related products based on category and tags"""
        try:
            product = await self.get_product_by_id(product_id)
            if not product:
                return []
            
            # Find products with same category or similar tags
            cursor = self.products_collection.find({
                "_id": {"$ne": ObjectId(product_id)},
                "status": ProductStatus.APPROVED,
                "is_active": True,
                "$or": [
                    {"category": product.category},
                    {"tags": {"$in": product.tags}}
                ]
            }).limit(limit).sort("rating", -1)
            
            products_data = await cursor.to_list(length=limit)
            return [self._to_product_model(product_data) for product_data in products_data]
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get related products: {str(e)}"
            )
    
    def _generate_slug(self, title: str) -> str:
        """Generate URL slug from title"""
        # Convert to lowercase and replace spaces with hyphens
        slug = re.sub(r'[^\w\s-]', '', title.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')
    
    async def _ensure_unique_slug(self, slug: str, exclude_id: Optional[str] = None) -> str:
        """Ensure slug is unique"""
        original_slug = slug
        counter = 1
        
        while True:
            query = {"slug": slug}
            if exclude_id:
                query["_id"] = {"$ne": ObjectId(exclude_id)}
            
            existing = await self.products_collection.find_one(query)
            if not existing:
                return slug
            
            slug = f"{original_slug}-{counter}"
            counter += 1
    
    def _serialize_product(self, product: Product) -> Dict[str, Any]:
        """Serialize product for API response"""
        return {
           
            "id": str(product.id),
            "title": product.title,
            "description": product.description,
            "short_description": product.short_description,
            "slug": product.slug,
            "seller_id": product.seller_id,
            "seller_name": product.seller_name,
            "category": product.category,
            "subcategory": product.subcategory,
            "tags": product.tags,
            "price": product.price,
            "original_price": product.original_price,
            "currency": product.currency,
            "images": product.images,
            "demo_video_url": str(product.demo_video_url) if product.demo_video_url else None,
            "demo_url": str(product.demo_url) if product.demo_url else None,
            "version": product.version,
            "license_type": product.license_type,
            "features": product.features,
            "use_cases": product.use_cases,
            "status": product.status,
            "featured": product.featured,
            "view_count": product.view_count,
            "download_count": product.download_count,
            "rating": product.rating,
            "rating_count": product.rating_count,
            "sales_count": product.sales_count,
            "created_at": product.created_at.isoformat(),
            "updated_at": product.updated_at.isoformat(),
            "published_at": product.published_at.isoformat() if product.published_at else None
        }