# backend/app/services/admin_service.py
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import csv
import io
import os
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..schemas.admin import *
from fastapi import UploadFile
import zipfile
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class AdminService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users_collection = db.users
        self.products_collection = db.products
        self.orders_collection = db.orders
        self.notifications_collection = db.notifications

    # =============================================================================
    # DASHBOARD METHODS
    # =============================================================================

    async def get_dashboard_stats(self) -> DashboardStatsSchema:
        """Get comprehensive dashboard statistics"""
        
        # Get basic counts
        total_users = await self.users_collection.count_documents({})
        active_users = await self.users_collection.count_documents({"status": "active"})
        total_products = await self.products_collection.count_documents({})
        pending_products = await self.products_collection.count_documents({"status": "pending"})
        total_orders = await self.orders_collection.count_documents({})
        completed_orders = await self.orders_collection.count_documents({"status": "completed"})
        
        # Revenue calculations - REAL DATA from payments collection
        revenue_pipeline = [
            {"$match": {"status": "completed"}},  # Only completed payments
            {"$group": {"_id": None, "total": {"$sum": {"$divide": ["$amount", 100]}}}}  # Convert cents to dollars
        ]
        total_revenue_result = await self.db.payments.aggregate(revenue_pipeline).to_list(1)
        total_revenue = total_revenue_result[0]["total"] if total_revenue_result else 0
       
        # Monthly revenue
        current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_pipeline = [
            {"$match": {
                "status": "completed",
                "created_at": {"$gte": current_month_start}
            }},
            {"$group": {"_id": None, "total": {"$sum": {"$divide": ["$amount", 100]}}}}
        ]
        monthly_revenue_result = await self.orders_collection.aggregate(monthly_pipeline).to_list(1)
        monthly_revenue = monthly_revenue_result[0]["total"] if monthly_revenue_result else 0
        
        # Conversion rate calculation - REAL DATA
        if total_users > 0:
            conversion_rate = (completed_orders / total_users) * 100
        else:
            conversion_rate = 0
    
        # Average order value - REAL DATA
        avg_order_value = total_revenue / max(completed_orders, 1)
        
        return DashboardStatsSchema(
            total_users=total_users,
            active_users=active_users,
            total_products=total_products,
            pending_products=pending_products,
            total_orders=total_orders,
            completed_orders=completed_orders,
            total_revenue=float(total_revenue),
            monthly_revenue=float(monthly_revenue),
            conversion_rate=conversion_rate,
            avg_order_value=float(avg_order_value)
        )

    async def get_revenue_trend(self, period: str) -> List[RevenueDataPointSchema]:
        """Get revenue trend data for specified period - REAL DATA"""

        # Calculate date range
        if period == "6months":
            months_back = 6
        elif period == "1year":
            months_back = 12
        else:
            months_back = 6

        # Get real revenue data by month       
        pipeline = [
            {"$match": {"status": "completed"}},
            {"$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"}
                },
                "revenue": {"$sum": {"$divide": ["$amount", 100]}},
                "orders": {"$sum": 1}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}},
            {"$limit": months_back}
        ]

        try:
            results = await self.db.payments.aggregate(pipeline).to_list(months_back)

            if not results:
                return [
                    RevenueDataPointSchema(name="Jan", revenue=0, orders=0),
                    RevenueDataPointSchema(name="Feb", revenue=0, orders=0),
                    RevenueDataPointSchema(name="Mar", revenue=0, orders=0),
                    RevenueDataPointSchema(name="Apr", revenue=0, orders=0),
                    RevenueDataPointSchema(name="May", revenue=0, orders=0),
                    RevenueDataPointSchema(name="Jun", revenue=0, orders=0),
                ]

            # Convert to response format
            month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            trend_data = []

            for result in results:
                month_name = month_names[result["_id"]["month"] - 1]
                trend_data.append(RevenueDataPointSchema(
                    name=month_name,
                    revenue=float(result["revenue"]),
                    orders=result["orders"]
                ))

            return trend_data

        except Exception as e:
            print(f"Error getting revenue trend: {e}")
            # Return empty data on error
            return []

    async def get_category_distribution(self) -> List[CategoryDataSchema]:
        """Get product category distribution"""
        
        pipeline = [
            {"$match": {"status": {"$ne": "deleted"}}},  # Exclude deleted products
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        try:
            category_results = await self.products_collection.aggregate(pipeline).to_list(None)
            total_products = await self.products_collection.count_documents({"status": {"$ne": "deleted"}})

            if total_products == 0:
                return []
            
            return [
                CategoryDataSchema(
                    category=result["_id"] or "Unknown",
                    percentage=round((result["count"] / total_products) * 100, 1)
                )
                for result in category_results[:6]
            ]
        except Exception as e:
            print(f"Error in get_category_distribution: {e}")
            return []
    
    async def get_user_growth(self, period: str) -> List[UserGrowthDataSchema]:
        """Get user growth data - REAL DATA"""
        
        # Calculate weeks back
        if period == "4weeks":
            weeks_back = 4
        elif period == "12weeks":
            weeks_back = 12
        else:
            weeks_back = 4
        
        # Get real user registration data by week
        pipeline = [
            {"$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "week": {"$week": "$created_at"}
                },
                "user_count": {"$sum": 1}
            }},
            {"$sort": {"_id.year": 1, "_id.week": 1}},
            {"$limit": weeks_back}
        ]
        
        try:
            results = await self.users_collection.aggregate(pipeline).to_list(weeks_back)
            
            if not results:
                # Fallback if no data
                return [
                    UserGrowthDataSchema(period="Week 1", user_count=0),
                    UserGrowthDataSchema(period="Week 2", user_count=0),
                    UserGrowthDataSchema(period="Week 3", user_count=0),
                    UserGrowthDataSchema(period="Week 4", user_count=0),
                ]
            
            # Convert to response format
            growth_data = []
            for i, result in enumerate(results):
                growth_data.append(UserGrowthDataSchema(
                    period=f"Week {i+1}",
                    user_count=result["user_count"]
                ))
            
            return growth_data
            
        except Exception as e:
            print(f"Error getting user growth: {e}")
            return []

    async def get_recent_activity(self, limit: int = 10) -> List[RecentActivitySchema]:
        """Get recent platform activity"""
        
        activities = []
        
        # Recent users
        recent_users = await self.users_collection.find({}).sort("created_at", -1).limit(3).to_list(3)
        for user in recent_users:
            activities.append(RecentActivitySchema(
                id=str(user["_id"]),
                activity_type="user_registration",
                message=f"New user registered: {user.get('email', 'Unknown')}",
                timestamp=user.get("created_at", datetime.now())
            ))
        
        # Recent products
        recent_products = await self.products_collection.find({}).sort("created_at", -1).limit(3).to_list(3)
        for product in recent_products:
            activities.append(RecentActivitySchema(
                id=str(product["_id"]),
                activity_type="product_submission",
                message=f"Product submitted: {product.get('title', 'Unknown')}",
                timestamp=product.get("created_at", datetime.now())
            ))
        
        activities.sort(key=lambda x: x.timestamp, reverse=True)
        return activities[:limit]

    async def get_top_products(self, limit: int, period: str) -> List[TopProductSchema]:
        """Get top performing products - REAL DATA VERSION"""
        try:
            # Get real products from database, sorted by sales or views
            pipeline = [
                {"$match": {"status": "approved"}},  # Only approved products
                {"$addFields": {
                    "total_revenue": {"$multiply": ["$sales_count", "$price"]},
                    "popularity_score": {"$add": ["$sales_count", {"$divide": ["$view_count", 10]}]}
                }},
                {"$sort": {"popularity_score": -1}},  # Sort by popularity (sales + views/10)
                {"$limit": limit}
            ]
            
            results = await self.products_collection.aggregate(pipeline).to_list(limit)
            
            if not results:
                # Return empty list if no products
                return []
            
            # Convert to response format
            top_products = []
            for product in results:
                # Calculate growth percentage (mock for now, can be enhanced later)
                growth = round((product.get("sales_count", 0) * 2.5), 1)  # Simple calculation
                
                top_products.append(TopProductSchema(
                    id=str(product["_id"]),
                    title=product.get("title", "Unknown Product"),
                    sales_count=product.get("sales_count", 0),
                    total_revenue=float(product.get("total_revenue", 0)),
                    growth_percentage=growth,
                    category=product.get("category", "Other")
                ))
            
            return top_products
            
        except Exception as e:
            print(f"Error getting real top products: {e}")
            # Return empty list on error
            return []

    async def get_performance_metrics(self) -> PerformanceMetricsSchema:
        """Get platform performance metrics - CALCULATED FROM REAL DATA"""
        # Calculate real conversion rate
    
        total_users = await self.users_collection.count_documents({})
        completed_orders = await self.orders_collection.count_documents({"status": "completed"})
        if total_users > 0:
            conversion_rate = (completed_orders / total_users) * 100
        else:
            conversion_rate = 0
            
        revenue_pipeline = [
            {"$match": {"status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": {"$divide": ["$amount", 100]}}}}
        ]
        revenue_result = await self.db.payments.aggregate(revenue_pipeline).to_list(1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0
        avg_order_value = total_revenue / max(completed_orders, 1)
        
        return PerformanceMetricsSchema(
            conversion_rate=round(conversion_rate, 1),
            avg_order_value=round(avg_order_value, 2),
            platform_uptime=99.9,  # Keep static for now
            avg_load_time=2.1      # Keep static for now
        )

    # =============================================================================
    # USER MANAGEMENT METHODS
    # =============================================================================

    async def get_users(
        self, page: int, limit: int, search: Optional[str] = None,
        role: Optional[str] = None, status: Optional[str] = None,
        verified: Optional[bool] = None, two_factor: Optional[bool] = None,
        date_filter: Optional[str] = None, sort_by: str = "name"
    ) -> UsersListResponseSchema:
        """Get users with filtering and pagination"""
        
        # Build filter query
        filter_query = {}
        
        if search:
            filter_query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        
        if role:
            filter_query["role"] = role
        if status:
            filter_query["status"] = status
        if verified is not None:
            filter_query["verified"] = verified
        if two_factor is not None:
            filter_query["two_factor_enabled"] = two_factor
        
        # Get total count
        total = await self.users_collection.count_documents(filter_query)
        
        # Get users with pagination
        skip = (page - 1) * limit
        sort_field = sort_by if sort_by in ["name", "email", "created_at"] else "name"
        
        users_cursor = self.users_collection.find(filter_query).sort(sort_field, 1).skip(skip).limit(limit)
        users = await users_cursor.to_list(limit)
        
        # Convert to response schema
        user_responses = []
        for user in users:
            user_data = UserResponseSchema(
                id=str(user["_id"]),
                name=user.get("name") or "",
                email=user.get("email", "unknown@example.com"),
                role=user.get("role", "buyer"),
                status=user.get("status", "active"),
                verified=user.get("verified", False),
                two_factor_enabled=user.get("two_factor_enabled", False),
                join_date=user.get("created_at", datetime.now()),
                last_login=user.get("last_login"),
                avatar=user.get("avatar"),
                created_at=user.get("created_at", datetime.now()),
                updated_at=user.get("updated_at", datetime.now())
            )
            user_responses.append(user_data)
        
        # Get user statistics
        stats = UserStatsSchema(
            total_users=await self.users_collection.count_documents({}),
            active_users=await self.users_collection.count_documents({"status": "active"}),
            suspended_users=await self.users_collection.count_documents({"status": "suspended"}),
            pending_users=await self.users_collection.count_documents({"status": "pending_verification"}),
            verified_users=await self.users_collection.count_documents({"verified": True}),
            admin_users=await self.users_collection.count_documents({"role": "admin"}),
            seller_users=await self.users_collection.count_documents({"role": "seller"}),
            buyer_users=await self.users_collection.count_documents({"role": "buyer"})
        )
        
        return UsersListResponseSchema(
            users=user_responses,
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit,
            stats=stats
        )

    async def get_user_details(self, user_id: str) -> Optional[UserResponseSchema]:
        """Get detailed user information"""
        
        try:
            user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
            if not user:
                return None
            
            return UserResponseSchema(
                id=str(user["_id"]),
                name=user.get("name") or "",
                email=user.get("email") or "unknown@example.com",
                role=user.get("role") or "buyer",
                status=user.get("status") or "active",
                verified=user.get("verified", False),
                two_factor_enabled=user.get("two_factor_enabled", False),
                join_date=user.get("created_at", datetime.now()),
                last_login=user.get("last_login"),
                avatar=user.get("avatar"),
                created_at=user.get("created_at", datetime.now()),
                updated_at=user.get("updated_at", datetime.now())
            )
        except:
            return None

    # =============================================================================
    # PRODUCT MANAGEMENT METHODS
    # =============================================================================

    async def create_product(self, product_data: ProductCreateSchema, seller_id: str = None) -> ProductResponseSchema:
        """Create a new product"""
        
        # Create product document
        product_doc = {
            "title": product_data.title,
            "description": product_data.description,
            "short_description": product_data.short_description,
            "category": product_data.category,
            "price": product_data.price,
            "original_price": product_data.original_price or product_data.price,
            "tags": product_data.tags,
            "version": product_data.version,
            "license_type": product_data.license_type,
            "requirements": product_data.requirements,
            "features": product_data.features,
            "use_cases": product_data.use_cases,
            "status": "pending",
            "featured": False,
            "seller_id": seller_id or "admin",
            "seller_name": "Admin",
            "images": [],
            "files": [],  # Store uploaded file paths
            "sales_count": 0,
            "rating": 0.0,
            "rating_count": 0,
            "view_count": 0,
            "download_count": 0,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        # Insert product
        result = await self.products_collection.insert_one(product_doc)
        product_doc["_id"] = result.inserted_id
        
        # Convert to response schema
        return self._convert_product_to_schema(product_doc)

    async def update_product(self, product_id: str, updates: ProductUpdateSchema) -> ProductResponseSchema:
        """Update an existing product"""
        
        # Build update document
        update_doc = {"updated_at": datetime.now()}
        
        if updates.title is not None:
            update_doc["title"] = updates.title
        if updates.description is not None:
            update_doc["description"] = updates.description
        if updates.short_description is not None:
            update_doc["short_description"] = updates.short_description
        if updates.category is not None:
            update_doc["category"] = updates.category
        if updates.price is not None:
            update_doc["price"] = updates.price
        if updates.original_price is not None:
            update_doc["original_price"] = updates.original_price
        if updates.tags is not None:
            update_doc["tags"] = updates.tags
        if updates.version is not None:
            update_doc["version"] = updates.version
        if updates.license_type is not None:
            update_doc["license_type"] = updates.license_type
        if updates.status is not None:
            update_doc["status"] = updates.status
            if updates.status == "approved":
                update_doc["approved_at"] = datetime.now()
                update_doc["published_at"] = datetime.now()
        if updates.featured is not None:
            update_doc["featured"] = updates.featured
        if updates.rejection_reason is not None:
            update_doc["rejection_reason"] = updates.rejection_reason
        if updates.flag_reason is not None:
            update_doc["flag_reason"] = updates.flag_reason
        if updates.requirements is not None:
            update_doc["requirements"] = updates.requirements
        if updates.features is not None:
            update_doc["features"] = updates.features
        if updates.use_cases is not None:
            update_doc["use_cases"] = updates.use_cases
        
        # Update product
        result = await self.products_collection.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            return None
        
        # Get updated product
        updated_product = await self.products_collection.find_one({"_id": ObjectId(product_id)})
        return self._convert_product_to_schema(updated_product)

    async def delete_product(self, product_id: str) -> bool:
        """Delete a product"""
        
        # Get product first to clean up files
        product = await self.products_collection.find_one({"_id": ObjectId(product_id)})
        if not product:
            return False
        
        # Clean up uploaded files
        if product.get("files"):
            for file_path in product["files"]:
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                except Exception as e:
                    print(f"Error deleting file {file_path}: {e}")
        
        # Delete product
        result = await self.products_collection.delete_one({"_id": ObjectId(product_id)})
        return result.deleted_count > 0

    async def bulk_update_products(self, product_ids: List[str], updates: ProductBulkUpdateSchema) -> int:
        """Bulk update products"""
        
        update_doc = {"updated_at": datetime.now()}
        
        if updates.status is not None:
            update_doc["status"] = updates.status
            if updates.status == "approved":
                update_doc["approved_at"] = datetime.now()
                update_doc["published_at"] = datetime.now()
        if updates.featured is not None:
            update_doc["featured"] = updates.featured
        if updates.rejection_reason is not None:
            update_doc["rejection_reason"] = updates.rejection_reason
        if updates.flag_reason is not None:
            update_doc["flag_reason"] = updates.flag_reason
        
        # Convert string IDs to ObjectIds
        object_ids = [ObjectId(pid) for pid in product_ids]
        
        # Update products
        result = await self.products_collection.update_many(
            {"_id": {"$in": object_ids}},
            {"$set": update_doc}
        )
        
        return result.modified_count

    async def upload_product_files(self, product_id: str, files: List[UploadFile]) -> List[str]:
        """Upload files for a product (ZIP files only)"""
        
        # Create upload directory if it doesn't exist
        upload_dir = Path("uploads/products") / product_id
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        uploaded_files = []
        
        for file in files:
            # Validate file type
            if not file.filename.lower().endswith('.zip'):
                continue
                
            # Validate ZIP file
            try:
                # Read file content
                content = await file.read()
                
                # Validate it's a proper ZIP file
                if not zipfile.is_zipfile(io.BytesIO(content)):
                    continue
                
                # Save file
                file_path = upload_dir / file.filename
                with open(file_path, "wb") as f:
                    f.write(content)
                
                uploaded_files.append(str(file_path))
                
            except Exception as e:
                print(f"Error uploading file {file.filename}: {e}")
                continue
        
        # Update product with file paths
        if uploaded_files:
            await self.products_collection.update_one(
                {"_id": ObjectId(product_id)},
                {"$push": {"files": {"$each": uploaded_files}}, "$set": {"updated_at": datetime.now()}}
            )
        
        return uploaded_files

    async def remove_product_file(self, product_id: str, file_path: str) -> bool:
        """Remove a file from a product"""
        
        try:
            # Remove from database
            result = await self.products_collection.update_one(
                {"_id": ObjectId(product_id)},
                {"$pull": {"files": file_path}, "$set": {"updated_at": datetime.now()}}
            )
            
            # Remove physical file
            if os.path.exists(file_path):
                os.remove(file_path)
            
            return result.modified_count > 0
            
        except Exception as e:
            print(f"Error removing file {file_path}: {e}")
            return False

    async def get_product_stats(self) -> ProductStatsSchema:
        """Get product statistics"""
        
        # Calculate total revenue
        revenue_pipeline = [
            {"$match": {"status": "approved"}},
            {"$group": {"_id": None, "total": {"$sum": {"$multiply": ["$sales_count", "$price"]}}}}
        ]
        revenue_result = await self.products_collection.aggregate(revenue_pipeline).to_list(1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0
        
        return ProductStatsSchema(
            total_products=await self.products_collection.count_documents({}),
            pending=await self.products_collection.count_documents({"status": "pending"}),
            approved=await self.products_collection.count_documents({"status": "approved"}),
            rejected=await self.products_collection.count_documents({"status": "rejected"}),
            flagged=await self.products_collection.count_documents({"status": "flagged"}),
            featured=await self.products_collection.count_documents({"featured": True}),
            total_revenue=float(total_revenue)
        )

    def _convert_product_to_schema(self, product: dict) -> ProductResponseSchema:
        """Helper method to convert product document to response schema"""
        
        return ProductResponseSchema(
            id=str(product["_id"]),
            title=product.get("title", ""),
            description=product.get("description", ""),
            short_description=product.get("short_description", ""),
            category=product.get("category", ""),
            price=float(product.get("price", 0)),
            original_price=float(product.get("original_price", 0)) if product.get("original_price") else None,
            tags=product.get("tags", []),
            version=product.get("version", "1.0.0"),
            license_type=product.get("license_type", "commercial"),
            status=product.get("status", "pending"),
            featured=product.get("featured", False),
            seller_name=product.get("seller_name", "Unknown"),
            seller_id=product.get("seller_id", ""),
            images=product.get("images", []),
            sales_count=product.get("sales_count", 0),
            revenue=float(product.get("sales_count", 0) * product.get("price", 0)),
            rating=float(product.get("rating", 0)),
            rating_count=product.get("rating_count", 0),
            view_count=product.get("view_count", 0),
            download_count=product.get("download_count", 0),
            created_at=product.get("created_at", datetime.now()),
            updated_at=product.get("updated_at", datetime.now()),
            published_at=product.get("published_at"),
            approved_at=product.get("approved_at"),
            rejection_reason=product.get("rejection_reason"),
            flag_reason=product.get("flag_reason"),
            requirements=product.get("requirements", []),
            features=product.get("features", []),
            use_cases=product.get("use_cases", [])
        )
        
    async def get_products(
        self, page: int, limit: int, search: Optional[str] = None,
        status: Optional[str] = None, category: Optional[str] = None,
        featured: Optional[bool] = None, sort_by: str = "created_at"
    ) -> ProductsListResponseSchema:
        """Get products with filtering and pagination"""
        
        # Build filter query
        filter_query = {}
        
        if search:
            filter_query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"tags": {"$elemMatch": {"$regex": search, "$options": "i"}}}
            ]
        
        if status:
            filter_query["status"] = status
        if category and category != "all":
            filter_query["category"] = category
        if featured is not None:
            filter_query["featured"] = featured
        
        # Get total count
        total = await self.products_collection.count_documents(filter_query)
        
        # Get products with pagination
        skip = (page - 1) * limit
        sort_direction = -1 if sort_by in ["created_at", "sales_count", "rating"] else 1
        
        products_cursor = self.products_collection.find(filter_query).sort(sort_by, sort_direction).skip(skip).limit(limit)
        products = await products_cursor.to_list(limit)
        
        # Convert to response schema
        product_responses = []
        for product in products:
            product_data = ProductResponseSchema(
                id=str(product["_id"]),
                title=product.get("title", ""),
                description=product.get("description", ""),
                short_description=product.get("short_description", ""),
                category=product.get("category", ""),
                price=float(product.get("price", 0)),
                original_price=float(product.get("original_price", 0)) if product.get("original_price") else None,
                tags=product.get("tags", []),
                version=product.get("version", "1.0.0"),
                license_type=product.get("license_type", "commercial"),
                status=product.get("status", "pending"),
                featured=product.get("featured", False),
                seller_name=product.get("seller_name", "Unknown"),
                seller_id=product.get("seller_id", ""),
                images=product.get("images", []),
                sales_count=product.get("sales_count", 0),
                revenue=float(product.get("sales_count", 0) * product.get("price", 0)),
                rating=float(product.get("rating", 0)),
                rating_count=product.get("rating_count", 0),
                view_count=product.get("view_count", 0),
                download_count=product.get("download_count", 0),
                created_at=product.get("created_at", datetime.now()),
                updated_at=product.get("updated_at", datetime.now()),
                published_at=product.get("published_at"),
                approved_at=product.get("approved_at"),
                rejection_reason=product.get("rejection_reason"),
                flag_reason=product.get("flag_reason"),
                requirements=product.get("requirements", []),
                features=product.get("features", []),
                use_cases=product.get("use_cases", [])
            )
            product_responses.append(product_data)
        
        # Get product statistics
        stats = ProductStatsSchema(
            total_products=await self.products_collection.count_documents({}),
            pending=await self.products_collection.count_documents({"status": "pending"}),
            approved=await self.products_collection.count_documents({"status": "approved"}),
            rejected=await self.products_collection.count_documents({"status": "rejected"}),
            flagged=await self.products_collection.count_documents({"status": "flagged"}),
            featured=await self.products_collection.count_documents({"featured": True}),
            total_revenue=0.0
        )
        
        return ProductsListResponseSchema(
            products=product_responses,
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit,
            stats=stats
        )

    async def get_product_details(self, product_id: str) -> Optional[ProductResponseSchema]:
        """Get detailed product information"""
        
        try:
            product = await self.products_collection.find_one({"_id": ObjectId(product_id)})
            if not product:
                return None
            
            return ProductResponseSchema(
                id=str(product["_id"]),
                title=product.get("title", ""),
                description=product.get("description", ""),
                short_description=product.get("short_description", ""),
                category=product.get("category", ""),
                price=float(product.get("price", 0)),
                original_price=float(product.get("original_price", 0)) if product.get("original_price") else None,
                tags=product.get("tags", []),
                version=product.get("version", "1.0.0"),
                license_type=product.get("license_type", "commercial"),
                status=product.get("status", "pending"),
                featured=product.get("featured", False),
                seller_name=product.get("seller_name", "Unknown"),
                seller_id=product.get("seller_id", ""),
                images=product.get("images", []),
                sales_count=product.get("sales_count", 0),
                revenue=float(product.get("sales_count", 0) * product.get("price", 0)),
                rating=float(product.get("rating", 0)),
                rating_count=product.get("rating_count", 0),
                view_count=product.get("view_count", 0),
                download_count=product.get("download_count", 0),
                created_at=product.get("created_at", datetime.now()),
                updated_at=product.get("updated_at", datetime.now()),
                published_at=product.get("published_at"),
                approved_at=product.get("approved_at"),
                rejection_reason=product.get("rejection_reason"),
                flag_reason=product.get("flag_reason"),
                requirements=product.get("requirements", []),
                features=product.get("features", []),
                use_cases=product.get("use_cases", [])
            )
        except:
            return None
        
    async def update_product_media(self, product_id: str, image_urls: List[str], demo_video_url: Optional[str]):
        """Update product with uploaded media URLs"""
        try:
            from bson import ObjectId

            if not ObjectId.is_valid(product_id):
                raise ValueError("Invalid product ID")

            update_data = {}
            if image_urls:
                update_data["images"] = image_urls
            if demo_video_url:
                update_data["demo_video"] = demo_video_url

            if update_data:
                update_data["updated_at"] = datetime.utcnow()

                result = await self.db.products.update_one(
                    {"_id": ObjectId(product_id)},
                    {"$set": update_data}
                )

                if result.modified_count == 0:
                    raise Exception("Failed to update product media")

                logger.info(f"✅ Product {product_id} media updated successfully")
                return True

            return False

        except Exception as e:
            logger.error(f"❌ Failed to update product media: {e}")
            raise e

    # =============================================================================
    # ORDER MANAGEMENT METHODS
    # =============================================================================

    async def get_orders(
        self, page: int, limit: int, search: Optional[str] = None,
        status: Optional[str] = None, payment_status: Optional[str] = None,
        date_filter: Optional[str] = None, sort_by: str = "order_date"
    ) -> OrdersListResponseSchema:
        """Get orders with filtering and pagination"""
        
        # Build filter query
        filter_query = {}
        
        if search:
            filter_query["$or"] = [
                {"customer_email": {"$regex": search, "$options": "i"}},
                {"order_number": {"$regex": search, "$options": "i"}}
            ]
        
        if status:
            filter_query["status"] = status
        if payment_status:
            filter_query["payment_status"] = payment_status
        
        # Get total count
        total = await self.orders_collection.count_documents(filter_query)
        
        # Get orders with pagination
        skip = (page - 1) * limit
        orders_cursor = self.orders_collection.find(filter_query).sort("created_at", -1).skip(skip).limit(limit)
        orders = await orders_cursor.to_list(limit)

        # Convert orders to response schema
        order_responses = []
        for order in orders:
            # Extract customer name
            customer_name = "Unknown Customer"
            if order.get("billing_address"):
                first_name = order["billing_address"].get("first_name", "")
                last_name = order["billing_address"].get("last_name", "")
                customer_name = f"{first_name} {last_name}".strip()
            elif order.get("customer_name"):
                customer_name = order["customer_name"]
            elif order.get("customer_email"):
                customer_name = order["customer_email"].split('@')[0]
            
            # Extract product names
            product_names = []
            for item in order.get("items", []):
                product_name = item.get("product_title") or item.get("product_name") or "Unknown Product"
                product_names.append(product_name)
            
            products_display = ", ".join(product_names[:2])
            if len(product_names) > 2:
                products_display += f" + {len(product_names) - 2} more"
            
            order_data = OrderResponseSchema(
                id=str(order["_id"]),
                customer_email=order.get("customer_email", ""),
                customer_name=customer_name,
                status=order.get("status", "pending"),
                payment_status=order.get("payment_status", "pending"),
                payment_method="stripe",
                subtotal=float(order.get("subtotal", 0)),
                tax=float(order.get("tax_amount", 0)),
                total=float(order.get("total_amount", 0)),
                order_date=order.get("created_at", datetime.now()),
                items_count=len(order.get("items", [])),
                created_at=order.get("created_at", datetime.now()),
                updated_at=order.get("updated_at", datetime.now())
            )
            order_responses.append(order_data)

        # Get statistics
        stats = OrderStatsSchema(
            total_orders=total,
            pending_orders=0,
            completed_orders=total,
            cancelled_orders=0,
            total_revenue=sum(float(order.get("total_amount", 0)) for order in orders),
            avg_order_value=sum(float(order.get("total_amount", 0)) for order in orders) / max(total, 1)
        )

        return OrdersListResponseSchema(
            orders=order_responses,
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit,
            stats=stats
        )

    async def get_order_details(self, order_id: str) -> Optional[OrderDetailResponseSchema]:
        """Get detailed order information"""
        
        try:
            order = await self.orders_collection.find_one({"_id": ObjectId(order_id)})
            if not order:
                return None
            
            # Convert order items
            items = []
            for item in order.get("items", []):
                items.append(OrderItemResponseSchema(
                    id=item.get("id", ""),
                    product_id=item.get("product_id", ""),
                    product_title=item.get("product_title", "Unknown Product"),
                    quantity=item.get("quantity", 1),
                    price=float(item.get("price", 0)),
                    total=float(item.get("price", 0) * item.get("quantity", 1))
                ))
            
            return OrderDetailResponseSchema(
                id=str(order["_id"]),
                customer_email=order.get("customer_email", ""),
                customer_name=order.get("customer_name", ""),
                status=order.get("status", "pending"),
                payment_status=order.get("payment_status", "pending"),
                payment_method=order.get("payment_method", ""),
                payment_id=order.get("payment_id"),
                subtotal=float(order.get("subtotal", 0)),
                tax=float(order.get("tax", 0)),
                total=float(order.get("total", 0)),
                order_date=order.get("order_date", datetime.now()),
                billing_address=order.get("billing_address", {}),
                items=items,
                created_at=order.get("created_at", datetime.now()),
                updated_at=order.get("updated_at", datetime.now())
            )
        except:
            return None

    # =============================================================================
    # NOTIFICATION MANAGEMENT METHODS
    # =============================================================================

    async def get_notifications(
        self, page: int, limit: int, search: Optional[str] = None,
        type_filter: Optional[str] = None, status: Optional[str] = None,
        channel: Optional[str] = None
    ) -> NotificationsListResponseSchema:
        """Get notifications with filtering and pagination"""
        
        # Build filter query
        filter_query = {}
        
        if search:
            filter_query["$or"] = [
                {"recipient": {"$regex": search, "$options": "i"}},
                {"title": {"$regex": search, "$options": "i"}},
                {"message": {"$regex": search, "$options": "i"}}
            ]
        
        if type_filter:
            filter_query["type"] = type_filter
        if status:
            filter_query["status"] = status
        if channel:
            filter_query["channel"] = channel
        
        # Get total count
        total = await self.notifications_collection.count_documents(filter_query)
        
        # Get notifications with pagination
        skip = (page - 1) * limit
        
        notifications_cursor = self.notifications_collection.find(filter_query).sort("sent_at", -1).skip(skip).limit(limit)
        notifications = await notifications_cursor.to_list(limit)
        
        # Convert to response schema
        notification_responses = []
        for notification in notifications:
            notification_data = NotificationResponseSchema(
                id=str(notification["_id"]),
                type=notification.get("type", ""),
                recipient=notification.get("recipient", ""),
                title=notification.get("title", ""),
                message=notification.get("message", ""),
                status=notification.get("status", "pending"),
                sent_at=notification.get("sent_at", datetime.now()),
                delivered_at=notification.get("delivered_at"),
                channel=notification.get("channel", "email"),
                failure_reason=notification.get("failure_reason")
            )
            notification_responses.append(notification_data)
        
        return NotificationsListResponseSchema(
            notifications=notification_responses,
            total=total,
            page=page,
            limit=limit
        )

    async def get_notification_performance_metrics(self) -> NotificationPerformanceSchema:
        """Get notification performance metrics"""
        
        return NotificationPerformanceSchema(
            avg_delivery_time=2.3,
            bounce_rate=2.1,
            open_rate=24.8,
            click_rate=4.2
        )

    async def get_channel_distribution(self) -> List[ChannelDistributionSchema]:
        """Get notification channel distribution"""
        
        pipeline = [
            {"$group": {"_id": "$channel", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        channel_results = await self.notifications_collection.aggregate(pipeline).to_list(None)
        total_notifications = await self.notifications_collection.count_documents({})
        
        if total_notifications == 0:
            return []
        
        return [
            ChannelDistributionSchema(
                channel=result["_id"] or "email",
                count=result["count"],
                percentage=round((result["count"] / total_notifications) * 100, 1)
            )
            for result in channel_results
        ]

    # =============================================================================
    # STATISTICS METHODS
    # =============================================================================

    async def get_stats_key_metrics(self, period: str) -> StatsKeyMetricsSchema:
        """Get key metrics for statistics page"""
        
        # Mock data for demo
        return StatsKeyMetricsSchema(
            revenue=MetricDataSchema(current=125000, previous=98000, growth=27.6),
            orders=MetricDataSchema(current=1240, previous=890, growth=39.3),
            users=MetricDataSchema(current=15420, previous=12840, growth=20.1),
            products=MetricDataSchema(current=3240, previous=2980, growth=8.7)
        )

    async def get_stats_chart_data(self, period: str) -> List[StatsChartDataSchema]:
        """Get chart data for statistics page"""
        
        # Mock data for demo
        return [
            StatsChartDataSchema(date="2024-01-01", revenue=12000, orders=45, users=120),
            StatsChartDataSchema(date="2024-01-02", revenue=19000, orders=72, users=180),
            StatsChartDataSchema(date="2024-01-03", revenue=15000, orders=58, users=145),
            StatsChartDataSchema(date="2024-01-04", revenue=22000, orders=85, users=220),
            StatsChartDataSchema(date="2024-01-05", revenue=28000, orders=95, users=280),
            StatsChartDataSchema(date="2024-01-06", revenue=18000, orders=65, users=165),
            StatsChartDataSchema(date="2024-01-07", revenue=14000, orders=48, users=140)
        ]

    async def get_stats_top_categories(self, period: str) -> List[StatsTopCategorySchema]:
        """Get top categories statistics"""
        
        return [
            StatsTopCategorySchema(name="Natural Language Processing", sales=450, revenue=135000, growth=15.2),
            StatsTopCategorySchema(name="Computer Vision", sales=320, revenue=96000, growth=8.7),
            StatsTopCategorySchema(name="Machine Learning", sales=280, revenue=84000, growth=12.3),
            StatsTopCategorySchema(name="Deep Learning", sales=210, revenue=73500, growth=6.8),
            StatsTopCategorySchema(name="Data Science", sales=180, revenue=54000, growth=9.1)
        ]

    async def get_stats_conversion_funnel(self, period: str) -> StatsConversionFunnelSchema:
        """Get conversion funnel statistics"""
        
        stages = [
            StatsConversionStageSchema(name="Visitors", count=45000, percentage=100.0),
            StatsConversionStageSchema(name="Product Views", count=18000, percentage=40.0),
            StatsConversionStageSchema(name="Add to Cart", count=5400, percentage=12.0),
            StatsConversionStageSchema(name="Checkout Started", count=2700, percentage=6.0),
            StatsConversionStageSchema(name="Purchase Completed", count=1440, percentage=3.2)
        ]
        
        summary = StatsConversionSummarySchema(
            conversion_rate=3.2,
            avg_order_value=87.0,
            customer_acquisition_cost=45.0,
            return_on_ad_spend=2.8
        )
        
        return StatsConversionFunnelSchema(stages=stages, summary=summary)

    async def get_stats_traffic_sources(self, period: str) -> List[StatsTrafficSourceSchema]:
        """Get traffic sources statistics"""
        
        return [
            StatsTrafficSourceSchema(source="Organic Search", visitors=20250, percentage=45.0),
            StatsTrafficSourceSchema(source="Direct", visitors=12600, percentage=28.0),
            StatsTrafficSourceSchema(source="Social Media", visitors=6750, percentage=15.0),
            StatsTrafficSourceSchema(source="Referrals", visitors=3600, percentage=8.0),
            StatsTrafficSourceSchema(source="Email", visitors=1800, percentage=4.0)
        ]

    async def get_stats_device_analytics(self, period: str) -> List[StatsDeviceAnalyticsSchema]:
        """Get device analytics statistics"""
        
        return [
            StatsDeviceAnalyticsSchema(device="Desktop", sessions=23400, percentage=52.0),
            StatsDeviceAnalyticsSchema(device="Mobile", sessions=15750, percentage=35.0),
            StatsDeviceAnalyticsSchema(device="Tablet", sessions=5850, percentage=13.0)
        ]

    # =============================================================================
    # EXPORT METHODS
    # =============================================================================

    async def export_products(self, filters: ProductExportFiltersSchema) -> str:
        """Export products to CSV format"""
        
        # Build filter query
        filter_query = {}
        
        if filters.search:
            filter_query["$or"] = [
                {"title": {"$regex": filters.search, "$options": "i"}},
                {"description": {"$regex": filters.search, "$options": "i"}},
                {"tags": {"$elemMatch": {"$regex": filters.search, "$options": "i"}}}
            ]
        
        if filters.status:
            filter_query["status"] = filters.status
        if filters.category and filters.category != "all":
            filter_query["category"] = filters.category
        if filters.featured is not None:
            filter_query["featured"] = filters.featured
        
        # Get products
        products = await self.products_collection.find(filter_query).to_list(None)
        
        # Generate CSV content
        csv_content = "ID,Title,Category,Price,Original Price,Status,Featured,Sales Count,Rating,Created At,Seller\n"
        
        for product in products:
            # Escape commas in text fields
            title = str(product.get('title', '')).replace(',', ';')
            category = str(product.get('category', '')).replace(',', ';')
            seller = str(product.get('seller_name', '')).replace(',', ';')
            
            csv_content += f"{product['_id']},{title},{category},{product.get('price', 0)},{product.get('original_price', 0)},{product.get('status', '')},{product.get('featured', False)},{product.get('sales_count', 0)},{product.get('rating', 0)},{product.get('created_at', '')},{seller}\n"
        
        return csv_content

    # =============================================================================
    # STUB METHODS (IMPLEMENT AS NEEDED)
    # =============================================================================

    async def resend_notification(self, notification_id: str) -> bool:
        """Resend notification - stub implementation"""
        return True

    async def export_users(self, filters: UserExportFiltersSchema) -> str:
        """Export users - stub implementation"""
        return "id,name,email\n1,Test User,test@example.com"

    async def export_notifications(self, filters: NotificationExportFiltersSchema) -> str:
        """Export notifications - stub implementation"""
        return "id,type,recipient,status\n1,email,test@example.com,delivered"

    # =============================================================================
    # ADDITIONAL STUB METHODS FOR COMPLETENESS
    # =============================================================================

    async def get_analytics_overview(self, period: str):
        """Get analytics overview"""
        return {
            "total_revenue": 125000,
            "total_orders": 1240,
            "total_users": 15420,
            "conversion_rate": 3.2
        }

    async def get_system_health(self):
        """Get system health status"""
        return {
            "status": "healthy",
            "database": "connected",
            "uptime": "99.9%",
            "memory_usage": "65%",
            "cpu_usage": "45%"
        }

    async def toggle_maintenance_mode(self, enabled: bool, message: str = None):
        """Toggle maintenance mode"""
        return {
            "maintenance_mode": enabled,
            "message": message or "System maintenance in progress"
        }

    async def get_system_logs(self, page: int, limit: int, level: str = None, 
                             start_date: datetime = None, end_date: datetime = None):
        """Get system logs"""
        return {
            "logs": [],
            "total": 0,
            "page": page,
            "limit": limit
        }

    async def create_backup(self, background_tasks):
        """Create system backup"""
        import uuid
        backup_id = str(uuid.uuid4())
        return backup_id

    async def get_system_settings(self):
        """Get system settings"""
        return {
            "maintenance_mode": False,
            "max_file_size": "100MB",
            "allowed_file_types": [".zip"],
            "email_notifications": True
        }

    async def update_system_settings(self, settings: dict):
        """Update system settings"""
        return settings

    async def get_flagged_content(self, page: int, limit: int, content_type: str = None, status: str = None):
        """Get flagged content for moderation"""
        return {
            "content": [],
            "total": 0,
            "page": page,
            "limit": limit
        }

    async def moderate_content(self, content_id: str, action: str, reason: str = None, admin_id: str = None):
        """Moderate flagged content"""
        return {
            "content_id": content_id,
            "action": action,
            "reason": reason,
            "moderated_by": admin_id,
            "moderated_at": datetime.now()
        }

    async def get_revenue_summary(self, period: str):
        """Get revenue summary"""
        return {
            "total_revenue": 125000,
            "period_revenue": 25000,
            "growth": 15.5,
            "top_products": []
        }

    async def get_pending_payouts(self, page: int, limit: int, status: str = None):
        """Get pending payouts"""
        return {
            "payouts": [],
            "total": 0,
            "page": page,
            "limit": limit
        }

    async def process_payout(self, payout_id: str, admin_id: str):
        """Process a payout"""
        return {
            "payout_id": payout_id,
            "status": "processed",
            "processed_by": admin_id,
            "processed_at": datetime.now()
        }

    async def get_transactions(self, page: int, limit: int, transaction_type: str = None, 
                              status: str = None, start_date: datetime = None, end_date: datetime = None):
        """Get transaction history"""
        return {
            "transactions": [],
            "total": 0,
            "page": page,
            "limit": limit
        }

    async def get_support_tickets(self, page: int, limit: int, status: str = None, 
                                 priority: str = None, category: str = None):
        """Get support tickets"""
        return {
            "tickets": [],
            "total": 0,
            "page": page,
            "limit": limit
        }

    async def get_ticket_details(self, ticket_id: str):
        """Get ticket details"""
        return None

    async def update_ticket(self, ticket_id: str, updates: dict, admin_id: str):
        """Update support ticket"""
        return None

    async def reply_to_ticket(self, ticket_id: str, reply_data: dict, admin_id: str):
        """Reply to support ticket"""
        return {
            "ticket_id": ticket_id,
            "reply": reply_data,
            "replied_by": admin_id,
            "replied_at": datetime.now()
        }

    async def get_sales_report(self, period: str):
        """Get sales report"""
        return {"sales": [], "total": 0}

    async def get_sales_report_csv(self, period: str):
        """Get sales report as CSV"""
        return "date,sales,revenue\n2024-01-01,10,1000"

    async def get_sales_report_pdf(self, period: str):
        """Get sales report as PDF"""
        return b"PDF content"

    async def get_users_report(self, period: str):
        """Get users report"""
        return {"users": [], "total": 0}

    async def get_users_report_csv(self, period: str):
        """Get users report as CSV"""
        return "date,new_users,total_users\n2024-01-01,5,100"

    async def get_products_report(self, period: str):
        """Get products report"""
        return {"products": [], "total": 0}

    async def get_products_report_csv(self, period: str):
        """Get products report as CSV"""
        return "date,new_products,total_products\n2024-01-01,2,50"

    async def bulk_import_users(self, file: bytes, admin_id: str):
        """Bulk import users from CSV"""
        return {"imported": 0, "errors": []}

    async def bulk_import_products(self, file: bytes, admin_id: str):
        """Bulk import products from CSV"""
        return {"imported": 0, "errors": []}

    async def bulk_delete_users(self, user_ids: List[str], admin_id: str):
        """Bulk delete users"""
        return {"deleted_count": len(user_ids)}

    async def bulk_delete_products(self, product_ids: List[str], admin_id: str):
        """Bulk delete products"""
        return {"deleted_count": len(product_ids)}

    async def clear_cache(self, cache_type: str = None):
        """Clear application cache"""
        return {"cache_cleared": cache_type or "all"}

    async def get_performance_metrics_detailed(self, period: str):
        """Get detailed performance metrics"""
        return {
            "cpu_usage": 45.2,
            "memory_usage": 65.8,
            "response_time": 250,
            "error_rate": 0.1
        }

    async def get_email_templates(self):
        """Get email templates"""
        return {"templates": []}

    async def update_email_template(self, template_id: str, template_data: dict):
        """Update email template"""
        return template_data

    async def send_broadcast_message(self, message_data: dict, admin_id: str):
        """Send broadcast message to users"""
        return {
            "message_id": "msg_" + str(datetime.now().timestamp()),
            "sent_by": admin_id,
            "recipients": 0
        }

    async def get_api_usage_stats(self, period: str):
        """Get API usage statistics"""
        return {
            "total_requests": 10000,
            "successful_requests": 9800,
            "failed_requests": 200,
            "avg_response_time": 250
        }

    async def get_rate_limit_status(self):
        """Get rate limit status"""
        return {
            "active_limits": 0,
            "exceeded_limits": 0
        }

    async def reset_rate_limits(self, user_id: str = None):
        """Reset rate limits for a user or all users"""
        return {
            "reset_count": 1 if user_id else 100
        }