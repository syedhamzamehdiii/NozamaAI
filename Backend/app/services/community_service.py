# =============== app/services/community_service.py ===============
"""
Community forum service
"""

from typing import Any, List, Optional, Dict
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
import re

from app.config.database import AsyncIOMotorDatabase
from app.models.user import User
from app.models.review import ReviewStatus

class CommunityService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.posts_collection = self.db["community_posts"]
        self.replies_collection = self.db["community_replies"]
        self.categories_collection = self.db["community_categories"]
        self.likes_collection = self.db["community_likes"]
        self.views_collection = self.db["community_views"]
        self.reports_collection = self.db["community_reports"]
        
        # Create indexes
        self._create_indexes()
    
    def _create_indexes(self):
        """Create database indexes for performance"""
        # Posts indexes
        self.posts_collection.create_index([("category_id", ASCENDING)])
        self.posts_collection.create_index([("user_id", ASCENDING)])
        self.posts_collection.create_index([("created_at", DESCENDING)])
        self.posts_collection.create_index([("likes", DESCENDING)])
        self.posts_collection.create_index([("views", DESCENDING)])
        self.posts_collection.create_index([("is_pinned", DESCENDING)])
        self.posts_collection.create_index([("status", ASCENDING)])
        
        # Full-text search index
        self.posts_collection.create_index([
            ("title", "text"),
            ("content", "text"),
            ("tags", "text")
        ])
        
        # Replies indexes
        self.replies_collection.create_index([("post_id", ASCENDING)])
        self.replies_collection.create_index([("user_id", ASCENDING)])
        self.replies_collection.create_index([("created_at", DESCENDING)])
        
        # Likes indexes
        self.likes_collection.create_index([
            ("content_type", ASCENDING),
            ("content_id", ASCENDING),
            ("user_id", ASCENDING)
        ], unique=True)
        
        # Views indexes
        self.views_collection.create_index([
            ("post_id", ASCENDING),
            ("user_id", ASCENDING)
        ])
    
    # =============== Categories ===============
    async def get_forum_categories(self) -> List[Dict[str, Any]]:
        """Get all forum categories with post counts"""
        categories = []
        async for category in self.categories_collection.find({"status": "active"}):
            # Get post count for this category
            post_count = await self.posts_collection.count_documents({
                "category_id": str(category["_id"]),
                "status": "active"
            })
            
            categories.append({
                "id": str(category["_id"]),
                "name": category["name"],
                "description": category["description"],
                "color": category.get("color", "#3B82F6"),
                "post_count": post_count,
                "created_at": category["created_at"]
            })
        
        return categories
    
    async def create_forum_category(self, name: str, description: str) -> Dict[str, Any]:
        """Create a new forum category"""
        category = {
            "name": name,
            "description": description,
            "color": "#3B82F6",  # Default blue
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await self.categories_collection.insert_one(category)
        category["id"] = str(result.inserted_id)
        return category
    
    # =============== Posts ===============
    async def get_forum_posts(
        self,
        category_id: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        skip: int = 0,
        limit: int = 20,
        user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get forum posts with filtering and search"""
        # Build query
        query = {"status": "active"}
        
        if category_id:
            query["category_id"] = category_id
        
        if search:
            # Use text search if available, otherwise regex
            try:
                query["$text"] = {"$search": search}
            except:
                # Fallback to regex search
                regex_pattern = re.compile(search, re.IGNORECASE)
                query["$or"] = [
                    {"title": regex_pattern},
                    {"content": regex_pattern},
                    {"tags": {"$in": [regex_pattern]}}
                ]
        
        # Build sort
        sort_direction = DESCENDING if sort_order == "desc" else ASCENDING
        sort_field = sort_by if sort_by in ["created_at", "likes", "views"] else "created_at"
        
        # Get posts
        posts = []
        cursor = self.posts_collection.find(query).sort(sort_field, sort_direction).skip(skip).limit(limit)
        
        async for post in cursor:
            # Get additional data
            post_data = await self._enrich_post_data(post, user_id)
            posts.append(post_data)
        
        return posts
    
    async def get_forum_post_by_id(self, post_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific forum post by ID"""
        try:
            post = await self.posts_collection.find_one({"_id": ObjectId(post_id)})
            if post:
                return await self._enrich_post_data(post)
            return None
        except:
            return None
    
    async def create_forum_post(
        self,
        title: str,
        content: str,
        category_id: str,
        tags: List[str],
        user_id: str
    ) -> Dict[str, Any]:
        """Create a new forum post"""
        # Validate category exists
        category = await self.categories_collection.find_one({"_id": ObjectId(category_id)})
        if not category:
            raise ValueError("Category not found")
        
        # Create post
        post = {
            "title": title,
            "content": content,
            "category_id": category_id,
            "tags": tags,
            "user_id": user_id,
            "likes": 0,
            "views": 0,
            "replies": 0,
            "is_pinned": False,
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_activity": datetime.utcnow()
        }
        
        result = await self.posts_collection.insert_one(post)
        # Return freshly loaded and enriched post to avoid ObjectId serialization
        return await self.get_forum_post_by_id(str(result.inserted_id))
    
    async def update_forum_post(
        self,
        post_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """Update a forum post"""
        update_data: Dict[str, Any] = {"updated_at": datetime.utcnow()}
        
        if title is not None:
            update_data["title"] = title
        if content is not None:
            update_data["content"] = content
        if tags is not None:
            update_data["tags"] = tags
        
        # Support non-ObjectId ids
        try:
            result = await self.posts_collection.update_one(
                {"_id": ObjectId(post_id)},
                {"$set": update_data}
            )
        except Exception:
            result = await self.posts_collection.update_one(
                {"_id": post_id},
                {"$set": update_data}
            )
        
        if result.modified_count > 0:
            return await self.get_forum_post_by_id(post_id)
        return None
    
    async def delete_forum_post(self, post_id: str) -> bool:
        """Delete a forum post"""
        try:
            result = await self.posts_collection.delete_one({"_id": ObjectId(post_id)})
        except Exception:
            result = await self.posts_collection.delete_one({"_id": post_id})
        return result.deleted_count > 0
    
    async def increment_post_views(self, post_id: str) -> None:
        """Increment post view count"""
        await self.posts_collection.update_one(
            {"_id": ObjectId(post_id)},
            {"$inc": {"views": 1}}
        )
    
    async def track_post_view(self, post_id: str, user_id: str) -> None:
        """Track individual user view"""
        await self.views_collection.update_one(
            {"post_id": post_id, "user_id": user_id},
            {"$set": {"viewed_at": datetime.utcnow()}},
            upsert=True
        )
    
    # =============== Likes ===============
    async def toggle_post_like(self, post_id: str, user_id: str) -> Dict[str, Any]:
        """Toggle like on a post"""
        # Check if user already liked
        existing_like = await self.likes_collection.find_one({
            "content_type": "post",
            "content_id": post_id,
            "user_id": user_id
        })
        
        if existing_like:
            # Unlike
            await self.likes_collection.delete_one({"_id": existing_like["_id"]})
            await self.posts_collection.update_one(
                {"_id": ObjectId(post_id)},
                {"$inc": {"likes": -1}}
            )
            liked = False
        else:
            # Like
            await self.likes_collection.insert_one({
                "content_type": "post",
                "content_id": post_id,
                "user_id": user_id,
                "created_at": datetime.utcnow()
            })
            await self.posts_collection.update_one(
                {"_id": ObjectId(post_id)},
                {"$inc": {"likes": 1}}
            )
            liked = True
        
        # Get updated like count
        post = await self.posts_collection.find_one({"_id": ObjectId(post_id)})
        like_count = post.get("likes", 0) if post else 0
        
        return {"liked": liked, "like_count": like_count}
    
    async def toggle_reply_like(self, reply_id: str, user_id: str) -> Dict[str, Any]:
        """Toggle like on a reply"""
        # Check if user already liked
        existing_like = await self.likes_collection.find_one({
            "content_type": "reply",
            "content_id": reply_id,
            "user_id": user_id
        })
        
        if existing_like:
            # Unlike
            await self.likes_collection.delete_one({"_id": existing_like["_id"]})
            await self.replies_collection.update_one(
                {"_id": ObjectId(reply_id)},
                {"$inc": {"likes": -1}}
            )
            liked = False
        else:
            # Like
            await self.likes_collection.insert_one({
                "content_type": "reply",
                "content_id": reply_id,
                "user_id": user_id,
                "created_at": datetime.utcnow()
            })
            await self.replies_collection.update_one(
                {"_id": ObjectId(reply_id)},
                {"$inc": {"likes": 1}}
            )
            liked = True
        
        # Get updated like count
        reply = await self.replies_collection.find_one({"_id": ObjectId(reply_id)})
        like_count = reply.get("likes", 0) if reply else 0
        
        return {"liked": liked, "like_count": like_count}
    
    # =============== Replies ===============
    async def get_post_replies(
        self,
        post_id: str,
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get replies for a forum post"""
        replies = []
        cursor = self.replies_collection.find({"post_id": post_id}).sort("created_at", ASCENDING).skip(skip).limit(limit)
        
        async for reply in cursor:
            # Get user info
            user = await self.db["users"].find_one({"_id": ObjectId(reply["user_id"])})
            if user:
                reply["user_name"] = user.get("first_name", user.get("name", "Anonymous"))
                reply["user_avatar"] = user.get("avatar")
            
            reply["id"] = str(reply["_id"])
            replies.append(reply)
        
        return replies
    
    async def create_post_reply(
        self,
        post_id: str,
        content: str,
        user_id: str,
        parent_reply_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a reply to a forum post"""
        # Validate post exists
        post = await self.posts_collection.find_one({"_id": ObjectId(post_id)})
        if not post:
            raise ValueError("Post not found")
        
        # Create reply
        reply = {
            "post_id": post_id,
            "content": content,
            "user_id": user_id,
            "parent_reply_id": parent_reply_id,
            "likes": 0,
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await self.replies_collection.insert_one(reply)
        reply["id"] = str(result.inserted_id)
        
        # Update post reply count and last activity
        await self.posts_collection.update_one(
            {"_id": ObjectId(post_id)},
            {
                "$inc": {"replies": 1},
                "$set": {"last_activity": datetime.utcnow()}
            }
        )
        
        # Get user info
        user = await self.db["users"].find_one({"_id": ObjectId(user_id)})
        if user:
            reply["user_name"] = user.get("first_name", user.get("name", "Anonymous"))
            reply["user_avatar"] = user.get("avatar")
        
        return reply
    
    async def get_reply_by_id(self, reply_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific reply by ID"""
        try:
            reply = await self.replies_collection.find_one({"_id": ObjectId(reply_id)})
            if reply:
                reply["id"] = str(reply["_id"])
                return reply
            return None
        except:
            return None
    
    async def update_post_reply(self, reply_id: str, content: str) -> Optional[Dict[str, Any]]:
        """Update a forum reply"""
        result = await self.replies_collection.update_one(
            {"_id": ObjectId(reply_id)},
            {"$set": {"content": content, "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count > 0:
            return await self.get_reply_by_id(reply_id)
        return None
    
    async def delete_post_reply(self, reply_id: str) -> bool:
        """Delete a forum reply"""
        # Get reply to update post reply count
        reply = await self.replies_collection.find_one({"_id": ObjectId(reply_id)})
        if reply:
            await self.posts_collection.update_one(
                {"_id": ObjectId(reply["post_id"])},
                {"$inc": {"replies": -1}}
            )
        
        result = await self.replies_collection.delete_one({"_id": ObjectId(reply_id)})
        return result.deleted_count > 0
    
    # =============== User Management ===============
    async def get_user_community_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's community profile"""
        user = await self.db["users"].find_one({"_id": ObjectId(user_id)})
        if not user:
            return None
        
        # Get user stats
        post_count = await self.posts_collection.count_documents({"user_id": user_id})
        reply_count = await self.replies_collection.count_documents({"user_id": user_id})
        
        # Get total likes received
        total_likes = 0
        async for post in self.posts_collection.find({"user_id": user_id}):
            total_likes += post.get("likes", 0)
        async for reply in self.replies_collection.find({"user_id": user_id}):
            total_likes += reply.get("likes", 0)
        
        return {
            "id": str(user["_id"]),
            "name": user.get("first_name", user.get("name", "Anonymous")),
            "avatar": user.get("avatar"),
            "email": user.get("email"),
            "join_date": user.get("created_at"),
            "post_count": post_count,
            "reply_count": reply_count,
            "total_likes": total_likes
        }
    
    async def get_user_forum_posts(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get user's forum posts"""
        posts = []
        cursor = self.posts_collection.find({"user_id": user_id}).sort("created_at", DESCENDING).skip(skip).limit(limit)
        
        async for post in cursor:
            post_data = await self._enrich_post_data(post)
            posts.append(post_data)
        
        return posts
    
    # =============== Search ===============
    async def search_community_content(
        self,
        query: str,
        content_type: str = "all",
        skip: int = 0,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Search community content"""
        results = {"posts": [], "replies": [], "users": []}
        
        if content_type in ["all", "posts"]:
            # Search posts
            regex_pattern = re.compile(query, re.IGNORECASE)
            post_query = {
                "$or": [
                    {"title": regex_pattern},
                    {"content": regex_pattern},
                    {"tags": {"$in": [regex_pattern]}}
                ],
                "status": "active"
            }
            
            async for post in self.posts_collection.find(post_query).sort("created_at", DESCENDING).skip(skip).limit(limit):
                post_data = await self._enrich_post_data(post)
                results["posts"].append(post_data)
        
        if content_type in ["all", "replies"]:
            # Search replies
            regex_pattern = re.compile(query, re.IGNORECASE)
            reply_query = {
                "content": regex_pattern,
                "status": "active"
            }
            
            async for reply in self.replies_collection.find(reply_query).sort("created_at", DESCENDING).skip(skip).limit(limit):
                reply_data = await self._enrich_reply_data(reply)
                results["replies"].append(reply_data)
        
        if content_type in ["all", "users"]:
            # Search users
            regex_pattern = re.compile(query, re.IGNORECASE)
            user_query = {
                "$or": [
                    {"first_name": regex_pattern},
                    {"name": regex_pattern},
                    {"email": regex_pattern}
                ]
            }
            
            async for user in self.db["users"].find(user_query).skip(skip).limit(limit):
                results["users"].append({
                    "id": str(user["_id"]),
                    "name": user.get("first_name", user.get("name", "Anonymous")),
                    "avatar": user.get("avatar"),
                    "email": user.get("email")
                })
        
        return results
    
    # =============== Moderation ===============
    async def moderate_post(
        self,
        post_id: str,
        action: str,
        reason: Optional[str] = None,
        moderator_id: str = None
    ) -> Optional[Dict[str, Any]]:
        """Moderate a forum post"""
        post = await self.posts_collection.find_one({"_id": ObjectId(post_id)})
        if not post:
            return None
        
        update_data = {"updated_at": datetime.utcnow()}
        
        if action == "approve":
            update_data["status"] = "active"
        elif action == "reject":
            update_data["status"] = "rejected"
        elif action == "flag":
            update_data["status"] = "flagged"
        elif action == "pin":
            update_data["is_pinned"] = True
        elif action == "unpin":
            update_data["is_pinned"] = False
        
        if reason:
            update_data["moderation_reason"] = reason
        if moderator_id:
            update_data["moderated_by"] = moderator_id
            update_data["moderated_at"] = datetime.utcnow()
        
        await self.posts_collection.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": update_data}
        )
        
        return await self.get_forum_post_by_id(post_id)
    
    async def get_moderation_queue(
        self,
        content_type: str = "posts",
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get moderation queue"""
        if content_type == "posts":
            query = {"status": {"$in": ["pending", "flagged"]}}
            collection = self.posts_collection
        else:
            query = {"status": {"$in": ["pending", "flagged"]}}
            collection = self.replies_collection
        
        items = []
        cursor = collection.find(query).sort("created_at", ASCENDING).skip(skip).limit(limit)
        
        async for item in cursor:
            item["id"] = str(item["_id"])
            items.append(item)
        
        return items
    
    # =============== Helper Methods ===============
    async def get_forum_stats(self) -> Dict[str, Any]:
        """Compute lightweight real-time forum stats."""
        total_posts = await self.posts_collection.count_documents({"status": "active"})
        total_replies = await self.replies_collection.count_documents({})
        total_likes = await self.likes_collection.count_documents({"content_type": "post"})

        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        try:
            active_post_users = await self.posts_collection.distinct(
                "user_id", {"created_at": {"$gte": one_hour_ago}}
            )
        except Exception:
            active_post_users = []
        try:
            active_reply_users = await self.replies_collection.distinct(
                "user_id", {"created_at": {"$gte": one_hour_ago}}
            )
        except Exception:
            active_reply_users = []

        active_users = len(set([str(u) for u in list(active_post_users) + list(active_reply_users)]))

        return {
            "total_posts": total_posts,
            "total_replies": total_replies,
            "total_likes": total_likes,
            "active_users_last_hour": active_users,
            "generated_at": datetime.utcnow().isoformat(),
        }
    async def _enrich_post_data(self, post: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
        """Enrich post data with additional information"""
        # Normalize ids to strings to make the payload JSON serializable
        post["id"] = str(post.get("_id"))
        if "_id" in post:
            del post["_id"]
        if isinstance(post.get("category_id"), ObjectId):
            post["category_id"] = str(post["category_id"])
        if isinstance(post.get("user_id"), ObjectId):
            post["user_id"] = str(post["user_id"])
        
        # Get user info supporting UUID user_id
        try:
            user = await self.db["users"].find_one({"_id": ObjectId(post["user_id"])})
        except Exception:
            user = await self.db["users"].find_one({"_id": post["user_id"]})
        if user:
            post["user_name"] = user.get("first_name", user.get("name", "Anonymous"))
            post["user_avatar"] = user.get("avatar")
        
        # Get category info
        try:
            category = await self.categories_collection.find_one({"_id": ObjectId(post["category_id"])})
        except Exception:
            category = await self.categories_collection.find_one({"_id": post["category_id"]})
        if category:
            post["category_name"] = category["name"]
            post["category_color"] = category.get("color", "#3B82F6")
        
        # Check if current user liked this post
        if user_id:
            like = await self.likes_collection.find_one({
                "content_type": "post",
                "content_id": post["id"],
                "user_id": user_id
            })
            post["user_liked"] = bool(like)
        
        return post
    
    async def _enrich_reply_data(self, reply: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich reply data with additional information"""
        reply["id"] = str(reply.get("_id"))
        if "_id" in reply:
            del reply["_id"]
        if isinstance(reply.get("user_id"), ObjectId):
            reply["user_id"] = str(reply["user_id"])
        
        # Get user info
        user = await self.db["users"].find_one({"_id": ObjectId(reply["user_id"])})
        if user:
            reply["user_name"] = user.get("first_name", user.get("name", "Anonymous"))
            reply["user_avatar"] = user.get("avatar")
        
        return reply
