# =============== app/services/review_service.py ===============
"""
Review management service
"""

from typing import Any, List, Optional, Dict
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
import re

from app.config.database import AsyncIOMotorDatabase
from app.models.review import ReviewStatus
from app.schemas.review import ReviewCreate, ReviewUpdate, SellerResponse, ReviewHelpful

class ReviewService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.reviews_collection = self.db["reviews"]
        self.helpful_votes_collection = self.db["review_helpful_votes"]
        self.reports_collection = self.db["review_reports"]
        
        # Create indexes
        self._create_indexes()
    
    def _create_indexes(self):
        """Create database indexes for performance"""
        # Reviews indexes
        self.reviews_collection.create_index([("product_id", ASCENDING)])
        self.reviews_collection.create_index([("user_id", ASCENDING)])
        self.reviews_collection.create_index([("created_at", DESCENDING)])
        self.reviews_collection.create_index([("rating", DESCENDING)])
        self.reviews_collection.create_index([("status", ASCENDING)])
        self.reviews_collection.create_index([("verified_purchase", ASCENDING)])
        self.reviews_collection.create_index([("is_featured", DESCENDING)])
        
        # Compound indexes
        self.reviews_collection.create_index([
            ("product_id", ASCENDING),
            ("user_id", ASCENDING)
        ], unique=True)
        
        # Helpful votes indexes
        self.helpful_votes_collection.create_index([
            ("review_id", ASCENDING),
            ("user_id", ASCENDING)
        ], unique=True)
        
        # Reports indexes
        self.reports_collection.create_index([("review_id", ASCENDING)])
        self.reports_collection.create_index([("reporter_id", ASCENDING)])
        self.reports_collection.create_index([("status", ASCENDING)])
    
    # =============== Review CRUD ===============
    async def get_reviews(
        self,
        product_id: Optional[str] = None,
        user_id: Optional[str] = None,
        rating: Optional[int] = None,
        status: ReviewStatus = ReviewStatus.APPROVED,
        verified_only: bool = False,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get reviews with advanced filtering"""
        # Build query
        query = {"status": status}
        
        if product_id:
            query["product_id"] = product_id
        if user_id:
            query["user_id"] = user_id
        if rating:
            query["rating"] = rating
        if verified_only:
            query["verified_purchase"] = True
        
        # Build sort
        sort_direction = DESCENDING if sort_order == "desc" else ASCENDING
        sort_field = sort_by if sort_by in ["created_at", "rating", "helpful_count"] else "created_at"
        
        # Get reviews
        reviews = []
        cursor = self.reviews_collection.find(query).sort(sort_field, sort_direction).skip(skip).limit(limit)
        
        async for review in cursor:
            review_data = await self._enrich_review_data(review)
            reviews.append(review_data)
        
        return reviews
    
    async def get_product_reviews(
        self,
        product_id: str,
        rating_filter: Optional[int] = None,
        verified_only: bool = False,
        with_photos: bool = False,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get reviews for a specific product (approved and visible)"""
        query = {
            "product_id": product_id,
            "status": ReviewStatus.APPROVED
        }
        
        if rating_filter:
            query["rating"] = rating_filter
        if verified_only:
            query["verified_purchase"] = True
        if with_photos:
            query["metadata.photos"] = {"$exists": True, "$ne": []}
        
        # Build sort
        sort_direction = DESCENDING if sort_order == "desc" else ASCENDING
        sort_field = sort_by if sort_by in ["created_at", "rating", "helpful_count"] else "created_at"
        
        # Get reviews
        reviews = []
        cursor = self.reviews_collection.find(query).sort(sort_field, sort_direction).skip(skip).limit(limit)
        
        async for review in cursor:
            review_data = await self._enrich_review_data(review)
            reviews.append(review_data)
        
        return reviews
    
    async def get_product_review_summary(self, product_id: str) -> Dict[str, Any]:
        """Get review summary statistics for a product"""
        # Get all approved reviews for the product
        pipeline = [
            {"$match": {"product_id": product_id, "status": ReviewStatus.APPROVED}},
            {"$group": {
                "_id": None,
                "total_reviews": {"$sum": 1},
                "average_rating": {"$avg": "$rating"},
                "rating_distribution": {
                    "$push": "$rating"
                },
                "verified_reviews": {
                    "$sum": {"$cond": ["$verified_purchase", 1, 0]}
                },
                "total_helpful_votes": {"$sum": "$helpful_count"}
            }}
        ]
        
        result = await self.reviews_collection.aggregate(pipeline).to_list(1)
        
        if result:
            summary = result[0]
            ratings = summary["rating_distribution"]
            
            # Calculate rating distribution
            rating_counts = {}
            for i in range(1, 6):
                rating_counts[f"{i}_star"] = ratings.count(i)
            
            return {
                "total_reviews": summary["total_reviews"],
                "average_rating": round(summary["average_rating"], 1) if summary["average_rating"] else 0,
                "verified_reviews": summary["verified_reviews"],
                "total_helpful_votes": summary["total_helpful_votes"],
                "rating_distribution": rating_counts
            }
        
        return {
            "total_reviews": 0,
            "average_rating": 0,
            "verified_reviews": 0,
            "total_helpful_votes": 0,
            "rating_distribution": {f"{i}_star": 0 for i in range(1, 6)}
        }
    
    async def get_review_by_id(self, review_id: str) -> Optional[Dict[str, Any]]:
        """Get review by ID"""
        try:
            review = await self.reviews_collection.find_one({"_id": ObjectId(review_id)})
            if review:
                return await self._enrich_review_data(review)
            return None
        except:
            return None
    
    async def create_review(self, review_data: ReviewCreate, user_id: str) -> Dict[str, Any]:
        """Create a new review"""
        # Get product info
        product = await self.db["products"].find_one({"_id": ObjectId(review_data.product_id)})
        if not product:
            raise ValueError("Product not found")
        
        # Get user info (support ObjectId or string _id)
        try:
            user_filter = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
        except Exception:
            user_filter = {"_id": user_id}
        user = await self.db["users"].find_one(user_filter)
        if not user:
            raise ValueError("User not found")
        
        # Create review (auto-approve per business rule)
        review = {
            "product_id": str(review_data.product_id),
            "product_title": product.get("title", "Unknown Product"),
            "user_id": str(user_id),
            "user_name": user.get("first_name", user.get("name", "Anonymous")),
            "user_avatar": user.get("avatar"),
            "verified_purchase": True,  # Only verified purchases can review
            "rating": review_data.rating,
            "title": review_data.title,
            "content": review_data.content,
            "status": ReviewStatus.APPROVED,  # Auto-approve so reviews show globally
            "is_featured": False,
            "helpful_count": 0,
            "not_helpful_count": 0,
            "seller_response": None,
            "seller_response_date": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "metadata": getattr(review_data, "metadata", {}) or {}
        }
        
        result = await self.reviews_collection.insert_one(review)
        review["id"] = str(result.inserted_id)
        
        return review
    
    async def update_review(self, review_id: str, review_update: ReviewUpdate) -> Optional[Dict[str, Any]]:
        """Update a review"""
        update_data = {"updated_at": datetime.utcnow()}
        
        if review_update.rating is not None:
            update_data["rating"] = review_update.rating
        if review_update.title is not None:
            update_data["title"] = review_update.title
        if review_update.content is not None:
            update_data["content"] = review_update.content
        if review_update.metadata is not None:
            update_data["metadata"] = review_update.metadata
        
        result = await self.reviews_collection.update_one(
            {"_id": ObjectId(review_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_review_by_id(review_id)
        return None
    
    async def delete_review(self, review_id: str) -> bool:
        """Delete a review"""
        result = await self.reviews_collection.delete_one({"_id": ObjectId(review_id)})
        return result.deleted_count > 0
    
    # =============== User-specific methods ===============
    async def get_user_product_review(self, user_id: str, product_id: str) -> Optional[Dict[str, Any]]:
        """Get user's review for a specific product"""
        review = await self.reviews_collection.find_one({
            "user_id": user_id,
            "product_id": product_id
        })
        
        if review:
            return await self._enrich_review_data(review)
        return None
    
    async def get_user_reviews(
        self,
        user_id: str,
        product_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get user's reviews"""
        query = {"user_id": user_id}
        if product_id:
            query["product_id"] = product_id
        
        reviews = []
        cursor = self.reviews_collection.find(query).sort("created_at", DESCENDING).skip(skip).limit(limit)
        
        async for review in cursor:
            review_data = await self._enrich_review_data(review)
            reviews.append(review_data)
        
        return reviews
    
    async def get_user_public_reviews(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get user's public reviews (approved only)"""
        query = {
            "user_id": user_id,
            "status": ReviewStatus.APPROVED
        }
        
        reviews = []
        cursor = self.reviews_collection.find(query).sort("created_at", DESCENDING).skip(skip).limit(limit)
        
        async for review in cursor:
            review_data = await self._enrich_review_data(review)
            reviews.append(review_data)
        
        return reviews
    
    async def get_user_recent_reviews(self, user_id: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Get user's recent reviews within specified hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        query = {
            "user_id": user_id,
            "created_at": {"$gte": cutoff_time}
        }
        
        reviews = []
        cursor = self.reviews_collection.find(query).sort("created_at", DESCENDING)
        
        async for review in cursor:
            review_data = await self._enrich_review_data(review)
            reviews.append(review_data)
        
        return reviews
    
    async def get_user_review_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user's review statistics"""
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": None,
                "total_reviews": {"$sum": 1},
                "average_rating": {"$avg": "$rating"},
                "verified_reviews": {"$sum": {"$cond": ["$verified_purchase", 1, 0]}},
                "total_helpful_votes": {"$sum": "$helpful_count"},
                "pending_reviews": {"$sum": {"$cond": [{"$eq": ["$status", ReviewStatus.PENDING]}, 1, 0]}},
                "approved_reviews": {"$sum": {"$cond": [{"$eq": ["$status", ReviewStatus.APPROVED]}, 1, 0]}}
            }}
        ]
        
        result = await self.reviews_collection.aggregate(pipeline).to_list(1)
        
        if result:
            stats = result[0]
            return {
                "total_reviews": stats["total_reviews"],
                "average_rating": round(stats["average_rating"], 1) if stats["average_rating"] else 0,
                "verified_reviews": stats["verified_reviews"],
                "total_helpful_votes": stats["total_helpful_votes"],
                "pending_reviews": stats["pending_reviews"],
                "approved_reviews": stats["approved_reviews"]
            }
        
        return {
            "total_reviews": 0,
            "average_rating": 0,
            "verified_reviews": 0,
            "total_helpful_votes": 0,
            "pending_reviews": 0,
            "approved_reviews": 0
        }
    
    # =============== Helpful votes ===============
    async def mark_review_helpful(
        self,
        review_id: str,
        user_id: str,
        helpful: bool
    ) -> Dict[str, Any]:
        """Mark review as helpful or not helpful"""
        # Check if user already voted
        existing_vote = await self.helpful_votes_collection.find_one({
            "review_id": review_id,
            "user_id": user_id
        })
        
        if existing_vote:
            # Update existing vote
            if existing_vote["helpful"] != helpful:
                # Change vote
                await self.helpful_votes_collection.update_one(
                    {"_id": existing_vote["_id"]},
                    {"$set": {"helpful": helpful, "updated_at": datetime.utcnow()}}
                )
                
                # Update review counts
                if helpful:
                    await self.reviews_collection.update_one(
                        {"_id": ObjectId(review_id)},
                        {"$inc": {"helpful_count": 1, "not_helpful_count": -1}}
                    )
                else:
                    await self.reviews_collection.update_one(
                        {"_id": ObjectId(review_id)},
                        {"$inc": {"helpful_count": -1, "not_helpful_count": 1}}
                    )
            else:
                # Remove vote
                await self.helpful_votes_collection.delete_one({"_id": existing_vote["_id"]})
                
                # Update review counts
                if helpful:
                    await self.reviews_collection.update_one(
                        {"_id": ObjectId(review_id)},
                        {"$inc": {"helpful_count": -1}}
                    )
                else:
                    await self.reviews_collection.update_one(
                        {"_id": ObjectId(review_id)},
                        {"$inc": {"not_helpful_count": -1}}
                    )
        else:
            # Create new vote
            await self.helpful_votes_collection.insert_one({
                "review_id": review_id,
                "user_id": user_id,
                "helpful": helpful,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            
            # Update review counts
            if helpful:
                await self.reviews_collection.update_one(
                    {"_id": ObjectId(review_id)},
                    {"$inc": {"helpful_count": 1}}
                )
            else:
                await self.reviews_collection.update_one(
                    {"_id": ObjectId(review_id)},
                    {"$inc": {"not_helpful_count": 1}}
                )
        
        # Get updated counts
        review = await self.reviews_collection.find_one({"_id": ObjectId(review_id)})
        return {
            "helpful_count": review.get("helpful_count", 0) if review else 0,
            "not_helpful_count": review.get("not_helpful_count", 0) if review else 0
        }
    
    # =============== Seller responses ===============
    async def add_seller_response(self, review_id: str, response: str) -> Optional[Dict[str, Any]]:
        """Add seller response to a review"""
        update_data = {
            "seller_response": response,
            "seller_response_date": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await self.reviews_collection.update_one(
            {"_id": ObjectId(review_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_review_by_id(review_id)
        return None
    
    async def update_seller_response(self, review_id: str, response: str) -> Optional[Dict[str, Any]]:
        """Update seller response to a review"""
        update_data = {
            "seller_response": response,
            "seller_response_date": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await self.reviews_collection.update_one(
            {"_id": ObjectId(review_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_review_by_id(review_id)
        return None
    
    async def delete_seller_response(self, review_id: str) -> bool:
        """Delete seller response to a review"""
        result = await self.reviews_collection.update_one(
            {"_id": ObjectId(review_id)},
            {
                "$unset": {"seller_response": "", "seller_response_date": ""},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return result.modified_count > 0
    
    # =============== Reports ===============
    async def create_review_report(
        self,
        review_id: str,
        reporter_id: str,
        reason: str,
        details: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a review report"""
        report = {
            "review_id": review_id,
            "reporter_id": reporter_id,
            "reason": reason,
            "details": details,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "resolved_at": None,
            "resolved_by": None,
            "resolution_action": None
        }
        
        result = await self.reports_collection.insert_one(report)
        report["id"] = str(result.inserted_id)
        
        return report
    
    async def user_has_reported_review(self, user_id: str, review_id: str) -> bool:
        """Check if user has already reported this review"""
        report = await self.reports_collection.find_one({
            "review_id": review_id,
            "reporter_id": user_id
        })
        
        return bool(report)
    
    async def get_review_reports(self, skip: int = 0, limit: int = 20) -> List[Dict[str, Any]]:
        """Get review reports"""
        reports = []
        cursor = self.reports_collection.find().sort("created_at", DESCENDING).skip(skip).limit(limit)
        
        async for report in cursor:
            report["id"] = str(report["_id"])
            reports.append(report)
        
        return reports
    
    async def resolve_review_report(
        self,
        report_id: str,
        action: str,
        admin_id: str,
        reason: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Resolve a review report"""
        report = await self.reports_collection.find_one({"_id": ObjectId(report_id)})
        if not report:
            return None
        
        update_data = {
            "status": "resolved",
            "resolved_at": datetime.utcnow(),
            "resolved_by": admin_id,
            "resolution_action": action
        }
        
        if reason:
            update_data["resolution_reason"] = reason
        
        await self.reports_collection.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": update_data}
        )
        
        # Handle resolution actions
        if action == "reject_review":
            await self.update_review_status(
                report["review_id"],
                ReviewStatus.REJECTED,
                admin_id,
                reason
            )
        
        report["id"] = str(report["_id"])
        return report
    
    # =============== Moderation ===============
    async def get_reviews_by_status(
        self,
        status: ReviewStatus,
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get reviews by status"""
        reviews = []
        cursor = self.reviews_collection.find({"status": status}).sort("created_at", ASCENDING).skip(skip).limit(limit)
        
        async for review in cursor:
            review_data = await self._enrich_review_data(review)
            reviews.append(review_data)
        
        return reviews
    
    async def update_review_status(
        self,
        review_id: str,
        new_status: ReviewStatus,
        admin_id: str,
        reason: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Update review status"""
        update_data = {
            "status": new_status,
            "updated_at": datetime.utcnow(),
            "moderated_by": admin_id,
            "moderated_at": datetime.utcnow()
        }
        
        if reason:
            update_data["moderation_reason"] = reason
        
        result = await self.reviews_collection.update_one(
            {"_id": ObjectId(review_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_review_by_id(review_id)
        return None
    
    # =============== Utility methods ===============
    async def is_review_editable(self, review_id: str) -> bool:
        """Check if review is still editable (within 48 hours)"""
        review = await self.reviews_collection.find_one({"_id": ObjectId(review_id)})
        if not review:
            return False
        
        edit_window = review["created_at"] + timedelta(hours=48)
        return datetime.utcnow() <= edit_window
    
    async def add_user_context_to_review(
        self,
        review: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        """Add user-specific context to review (e.g., if user voted helpful)"""
        # Check if user voted helpful
        vote = await self.helpful_votes_collection.find_one({
            "review_id": review["id"],
            "user_id": user_id
        })
        
        if vote:
            review["user_helpful_vote"] = vote["helpful"]
        else:
            review["user_helpful_vote"] = None
        
        return review
    
    async def get_review_analytics(self, period: str = "30d") -> Dict[str, Any]:
        """Get review analytics for admin dashboard"""
        # Calculate date range
        now = datetime.utcnow()
        if period == "7d":
            start_date = now - timedelta(days=7)
        elif period == "30d":
            start_date = now - timedelta(days=30)
        elif period == "90d":
            start_date = now - timedelta(days=90)
        elif period == "1y":
            start_date = now - timedelta(days=365)
        else:
            start_date = now - timedelta(days=30)
        
        # Get review counts by status
        pipeline = [
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        status_counts = await self.reviews_collection.aggregate(pipeline).to_list(None)
        
        # Get average rating
        rating_pipeline = [
            {"$match": {
                "created_at": {"$gte": start_date},
                "status": ReviewStatus.APPROVED
            }},
            {"$group": {
                "_id": None,
                "average_rating": {"$avg": "$rating"},
                "total_reviews": {"$sum": 1}
            }}
        ]
        
        rating_result = await self.reviews_collection.aggregate(rating_pipeline).to_list(1)
        
        # Get reports count
        report_count = await self.reports_collection.count_documents({
            "created_at": {"$gte": start_date},
            "status": "pending"
        })
        
        return {
            "period": period,
            "status_counts": {item["_id"]: item["count"] for item in status_counts},
            "average_rating": round(rating_result[0]["average_rating"], 1) if rating_result else 0,
            "total_approved_reviews": rating_result[0]["total_reviews"] if rating_result else 0,
            "pending_reports": report_count
        }
    
    # =============== Helper methods ===============
    async def _enrich_review_data(self, review: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich review data with additional information"""
        review["id"] = str(review.get("_id")) if review.get("_id") is not None else review.get("id")
        # Remove Mongo ObjectId to ensure JSON serialization
        if "_id" in review:
            try:
                review.pop("_id")
            except Exception:
                pass
        
        # Get product info
        product = await self.db["products"].find_one({"_id": ObjectId(review["product_id"])})
        if product:
            review["product_title"] = product.get("title", "Unknown Product")
            review["product_image"] = product.get("images", [None])[0] if product.get("images") else None
        
        # Get user info
        try:
            user = await self.db["users"].find_one({"_id": ObjectId(review["user_id"])})
        except Exception:
            user = await self.db["users"].find_one({"_id": review["user_id"]})
        if user:
            review["user_name"] = user.get("first_name", user.get("name", "Anonymous"))
            review["user_avatar"] = user.get("avatar")
        
        return review

