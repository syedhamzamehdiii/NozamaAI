# =============== app/services/analytics_service.py ===============
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

class AnalyticsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.products_collection = db.products
        self.orders_collection = db.orders
        self.users_collection = db.users
        self.reviews_collection = db.reviews
    
    async def get_dashboard_stats(self, user_id: Optional[str] = None, role: str = "admin") -> Dict[str, Any]:
        """Get dashboard statistics"""
        try:
            if role == "admin":
                return await self._get_admin_stats()
            elif role == "seller":
                return await self._get_seller_stats(user_id)
            else:
                return await self._get_buyer_stats(user_id)
                
        except Exception as e:
            raise Exception(f"Failed to get dashboard stats: {str(e)}")
    
    async def _get_admin_stats(self) -> Dict[str, Any]:
        """Get admin dashboard statistics"""
        # Total users
        total_users = await self.users_collection.count_documents({})
        new_users_this_month = await self.users_collection.count_documents({
            "created_at": {"$gte": datetime.utcnow().replace(day=1)}
        })
        
        # Total products
        total_products = await self.products_collection.count_documents({})
        pending_products = await self.products_collection.count_documents({"status": "pending"})
        
        # Total orders and revenue
        total_orders = await self.orders_collection.count_documents({})
        total_revenue_pipeline = [
            {"$match": {"status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        revenue_result = await self.orders_collection.aggregate(total_revenue_pipeline).to_list(1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0
        
        # Monthly revenue
        this_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_revenue_pipeline = [
            {"$match": {"status": "completed", "created_at": {"$gte": this_month_start}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        monthly_result = await self.orders_collection.aggregate(monthly_revenue_pipeline).to_list(1)
        monthly_revenue = monthly_result[0]["total"] if monthly_result else 0
        
        return {
            "total_users": total_users,
            "new_users_this_month": new_users_this_month,
            "total_products": total_products,
            "pending_products": pending_products,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "monthly_revenue": monthly_revenue
        }
    
    async def _get_seller_stats(self, seller_id: str) -> Dict[str, Any]:
        """Get seller dashboard statistics"""
        # Products statistics
        total_products = await self.products_collection.count_documents({"seller_id": seller_id})
        active_products = await self.products_collection.count_documents({
            "seller_id": seller_id,
            "status": "approved",
            "is_active": True
        })
        
        # Sales statistics
        sales_pipeline = [
            {"$match": {"seller_id": seller_id}},
            {"$group": {
                "_id": None,
                "total_sales": {"$sum": "$sales_count"},
                "total_revenue": {"$sum": "$revenue"}
            }}
        ]
        sales_result = await self.products_collection.aggregate(sales_pipeline).to_list(1)
        sales_data = sales_result[0] if sales_result else {"total_sales": 0, "total_revenue": 0}
        
        # Reviews statistics
        reviews_pipeline = [
            {"$lookup": {
                "from": "products",
                "localField": "product_id",
                "foreignField": "_id",
                "as": "product"
            }},
            {"$match": {"product.seller_id": seller_id}},
            {"$group": {
                "_id": None,
                "total_reviews": {"$sum": 1},
                "average_rating": {"$avg": "$rating"}
            }}
        ]
        reviews_result = await self.reviews_collection.aggregate(reviews_pipeline).to_list(1)
        reviews_data = reviews_result[0] if reviews_result else {"total_reviews": 0, "average_rating": 0}
        
        return {
            "total_products": total_products,
            "active_products": active_products,
            "total_sales": sales_data["total_sales"],
            "total_revenue": sales_data["total_revenue"],
            "total_reviews": reviews_data["total_reviews"],
            "average_rating": round(reviews_data["average_rating"], 2) if reviews_data["average_rating"] else 0
        }
    
    async def _get_buyer_stats(self, user_id: str) -> Dict[str, Any]:
        """Get buyer dashboard statistics"""
        # Order statistics
        total_orders = await self.orders_collection.count_documents({"user_id": user_id})
        completed_orders = await self.orders_collection.count_documents({
            "user_id": user_id,
            "status": "completed"
        })
        
        # Spending statistics
        spending_pipeline = [
            {"$match": {"user_id": user_id, "status": "completed"}},
            {"$group": {"_id": None, "total_spent": {"$sum": "$total_amount"}}}
        ]
        spending_result = await self.orders_collection.aggregate(spending_pipeline).to_list(1)
        total_spent = spending_result[0]["total_spent"] if spending_result else 0
        
        return {
            "total_orders": total_orders,
            "completed_orders": completed_orders,
            "total_spent": total_spent
        }
    
    async def get_revenue_chart_data(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get revenue chart data for the last N days"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            pipeline = [
                {"$match": {
                    "status": "completed",
                    "created_at": {"$gte": start_date}
                }},
                {"$group": {
                    "_id": {
                        "year": {"$year": "$created_at"},
                        "month": {"$month": "$created_at"},
                        "day": {"$dayOfMonth": "$created_at"}
                    },
                    "revenue": {"$sum": "$total_amount"},
                    "orders": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}}
            ]
            
            results = await self.orders_collection.aggregate(pipeline).to_list(None)
            
            chart_data = []
            for result in results:
                date_obj = datetime(
                    result["_id"]["year"],
                    result["_id"]["month"],
                    result["_id"]["day"]
                )
                chart_data.append({
                    "date": date_obj.strftime("%Y-%m-%d"),
                    "revenue": result["revenue"],
                    "orders": result["orders"]
                })
            
            return chart_data
            
        except Exception as e:
            raise Exception(f"Failed to get revenue chart data: {str(e)}")
    
    async def get_top_products(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top-selling products"""
        try:
            pipeline = [
                {"$match": {"status": "approved", "is_active": True}},
                {"$sort": {"sales_count": -1}},
                {"$limit": limit},
                {"$project": {
                    "title": 1,
                    "seller_name": 1,
                    "sales_count": 1,
                    "revenue": 1,
                    "rating": 1,
                    "category": 1
                }}
            ]
            
            results = await self.products_collection.aggregate(pipeline).to_list(limit)
            return results
            
        except Exception as e:
            raise Exception(f"Failed to get top products: {str(e)}")
    
    async def get_category_stats(self) -> List[Dict[str, Any]]:
        """Get statistics by category"""
        try:
            pipeline = [
                {"$match": {"status": "approved", "is_active": True}},
                {"$group": {
                    "_id": "$category",
                    "product_count": {"$sum": 1},
                    "total_sales": {"$sum": "$sales_count"},
                    "total_revenue": {"$sum": "$revenue"},
                    "avg_price": {"$avg": "$price"}
                }},
                {"$sort": {"total_revenue": -1}}
            ]
            
            results = await self.products_collection.aggregate(pipeline).to_list(None)
            
            category_stats = []
            for result in results:
                category_stats.append({
                    "category": result["_id"],
                    "product_count": result["product_count"],
                    "total_sales": result["total_sales"],
                    "total_revenue": result["total_revenue"],
                    "avg_price": round(result["avg_price"], 2)
                })
            
            return category_stats
            
        except Exception as e:
            raise Exception(f"Failed to get category stats: {str(e)}")