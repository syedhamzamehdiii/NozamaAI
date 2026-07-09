# =============== app/api/v1/community.py ===============
"""
Community forum endpoints
"""

from typing import Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.api.dependencies import (
    get_current_active_user,
    get_current_user_optional,
    get_current_admin_user,
    get_pagination_params,
    PaginationParams,
    rate_limiter,
    get_community_service
)
from app.services.community_service import CommunityService
from app.models.user import User

router = APIRouter()

# Forum Categories
@router.get("/categories")
async def get_forum_categories(
    community_service: CommunityService = Depends(get_community_service)
) -> Any:
    """
    Get forum categories
    """
    categories = await community_service.get_forum_categories()
    return categories

@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_forum_category(
    name: str,
    description: str,
    admin_user: User = Depends(get_current_admin_user),
    community_service: CommunityService = Depends(get_community_service)
) -> Any:
    """
    Create forum category (Admin only)
    """
    category = await community_service.create_forum_category(
        name=name,
        description=description
    )
    return category

# Forum Posts
@router.get("/posts")
async def get_forum_posts(
    pagination: PaginationParams = Depends(get_pagination_params),
    category_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at", regex="^(created_at|replies|views|likes)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    community_service: CommunityService = Depends(get_community_service)
) -> Any:
    """
    Get forum posts with filtering and search
    """
    posts = await community_service.get_forum_posts(
        category_id=category_id,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=pagination.skip,
        limit=pagination.limit,
        user_id=current_user.id if current_user else None
    )
    return posts

@router.get("/stats")
async def get_forum_stats(
    community_service: CommunityService = Depends(get_community_service)
) -> Any:
    return await community_service.get_forum_stats()

@router.get("/posts/{post_id}")
async def get_forum_post(
    post_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    community_service: CommunityService = Depends(get_community_service)
) -> Any:
    """
    Get forum post by ID
    """
    post = await community_service.get_forum_post_by_id(post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Increment view count
    await community_service.increment_post_views(post_id)
    
    # Track view if user is authenticated
    if current_user:
        await community_service.track_post_view(post_id, current_user.id)
    
    return post

class ForumPostCreate(BaseModel):
    title: str
    content: str
    category_id: str
    tags: List[str] = []

@router.post("/posts", status_code=status.HTTP_201_CREATED)
async def create_forum_post(
    post: ForumPostCreate,
    current_user: User = Depends(get_current_active_user),
    community_service: CommunityService = Depends(get_community_service),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Create a new forum post (JSON body)
    """
    created = await community_service.create_forum_post(
        title=post.title,
        content=post.content,
        category_id=post.category_id,
        tags=post.tags,
        user_id=current_user.id
    )
    return created

class ForumPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None

@router.put("/posts/{post_id}")
async def update_forum_post(
    post_id: str,
    update: ForumPostUpdate,
    current_user: User = Depends(get_current_active_user),
    community_service: CommunityService = Depends(get_community_service),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Update forum post (Owner or Admin only)
    """
    # Check if post exists and user owns it
    post = await community_service.get_forum_post_by_id(post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    if post["user_id"] != str(current_user.id) and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this post"
        )
    
    updated_post = await community_service.update_forum_post(
        post_id=post_id,
        title=update.title,
        content=update.content,
        tags=update.tags
    )
    
    return updated_post

@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_forum_post(
    post_id: str,
    current_user: User = Depends(get_current_active_user),
    community_service: CommunityService = Depends(get_community_service)
) -> None:
    """
    Delete forum post (Owner or Admin only)
    """
    # Check if post exists and user owns it
    post = await community_service.get_forum_post_by_id(post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    if post["user_id"] != str(current_user.id) and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this post"
        )
    
    await community_service.delete_forum_post(post_id)

@router.post("/posts/{post_id}/like")
async def like_forum_post(
    post_id: str,
    current_user: User = Depends(get_current_active_user),
    community_service: CommunityService = Depends(get_community_service)
) -> Any:
    """
    Like/unlike a forum post
    """
    result = await community_service.toggle_post_like(post_id, current_user.id)
    return {"liked": result["liked"], "like_count": result["like_count"]}

# Forum Replies
@router.get("/posts/{post_id}/replies")
async def get_post_replies(
    post_id: str,
    pagination: PaginationParams = Depends(get_pagination_params),
    community_service: CommunityService = Depends(get_community_service)
) -> Any:
    """
    Get replies for a forum post
    """
    replies = await community_service.get_post_replies(
        post_id=post_id,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return replies

@router.post("/posts/{post_id}/replies", status_code=status.HTTP_201_CREATED)
async def create_post_reply(
    post_id: str,
    content: str,
    parent_reply_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    community_service: CommunityService = Depends(get_community_service),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Create a reply to a forum post
    """
    # Check if post exists
    post = await community_service.get_forum_post_by_id(post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    reply = await community_service.create_post_reply(
        post_id=post_id,
        content=content,
        user_id=current_user.id,
        parent_reply_id=parent_reply_id
    )
    
    return reply

@router.put("/replies/{reply_id}")
async def update_post_reply(
    reply_id: str,
    content: str,
    current_user: User = Depends(get_current_active_user),
    community_service: CommunityService = Depends(get_community_service),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Update a forum reply (Owner or Admin only)
    """
    # Check if reply exists and user owns it
    reply = await community_service.get_reply_by_id(reply_id)
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )
    
    if reply["user_id"] != str(current_user.id) and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this reply"
        )
    
    updated_reply = await community_service.update_post_reply(reply_id, content)
    return updated_reply

@router.delete("/replies/{reply_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post_reply(
    reply_id: str,
    current_user: User = Depends(get_current_active_user),
    community_service: CommunityService = Depends(get_community_service)
) -> None:
    """
    Delete a forum reply (Owner or Admin only)
    """
    # Check if reply exists and user owns it
    reply = await community_service.get_reply_by_id(reply_id)
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )
    
    if reply["user_id"] != str(current_user.id) and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this reply"
        )
    
    await community_service.delete_post_reply(reply_id)

@router.post("/replies/{reply_id}/like")
async def like_post_reply(
    reply_id: str,
    current_user: User = Depends(get_current_active_user),
    community_service: CommunityService = Depends(get_community_service)
) -> Any:
    """
    Like/unlike a forum reply
    """
    result = await community_service.toggle_reply_like(reply_id, current_user.id)
    return {"liked": result["liked"], "like_count": result["like_count"]}

# User Profile in Community
@router.get("/users/{user_id}/profile")
async def get_community_user_profile(
    user_id: str,
    community_service: CommunityService = Depends(get_community_service)
) -> Any:
    """
    Get user's community profile
    """
    profile = await community_service.get_user_community_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return profile

@router.get("/users/{user_id}/posts")
async def get_user_forum_posts(
    user_id: str,
    pagination: PaginationParams = Depends(get_pagination_params),
    community_service: CommunityService = Depends(get_community_service)
) -> Any:
    """
    Get user's forum posts
    """
    posts = await community_service.get_user_forum_posts(
        user_id=user_id,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return posts

# Search
@router.get("/search")
async def search_community_content(
    q: str = Query(..., min_length=3),
    content_type: str = Query("all", regex="^(all|posts|replies|users)$"),
    pagination: PaginationParams = Depends(get_pagination_params),
    community_service: CommunityService = Depends(get_community_service)
) -> Any:
    """
    Search community content
    """
    results = await community_service.search_community_content(
        query=q,
        content_type=content_type,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return results

# Moderation (Admin only)
@router.put("/posts/{post_id}/moderate")
async def moderate_forum_post(
    post_id: str,
    action: str,  # approve, reject, flag, pin, unpin
    reason: Optional[str] = None,
    admin_user: User = Depends(get_current_admin_user),
    community_service: CommunityService = Depends(get_community_service)
) -> Any:
    """
    Moderate forum post (Admin only)
    """
    result = await community_service.moderate_post(
        post_id=post_id,
        action=action,
        reason=reason,
        moderator_id=admin_user.id
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    return {"message": f"Post {action} successfully"}

@router.get("/moderation/queue")
async def get_moderation_queue(
    pagination: PaginationParams = Depends(get_pagination_params),
    content_type: str = Query("posts", regex="^(posts|replies)$"),
    admin_user: User = Depends(get_current_admin_user),
    community_service: CommunityService = Depends(get_community_service)
) -> Any:
    """
    Get moderation queue (Admin only)
    """
    queue = await community_service.get_moderation_queue(
        content_type=content_type,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return queue