# =============== app/api/v1/notifications.py ===============
"""
Notification management endpoints
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.api.dependencies import (
    get_current_active_user,
    get_current_admin_user,
    get_pagination_params,
    PaginationParams,
    rate_limiter
)
from app.services.notification_service import NotificationService
from app.models.user import User
from app.models.notification import NotificationType

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_user_notifications(
    pagination: PaginationParams = Depends(get_pagination_params),
    unread_only: bool = Query(False),
    notification_type: Optional[NotificationType] = None,
    current_user: User = Depends(get_current_active_user),
    notification_service: NotificationService = Depends()
) -> Any:
    """
    Get user's notifications
    """
    notifications = await notification_service.get_user_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        notification_type=notification_type,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return notifications

@router.get("/unread-count")
async def get_unread_notification_count(
    current_user: User = Depends(get_current_active_user),
    notification_service: NotificationService = Depends()
) -> Any:
    """
    Get count of unread notifications
    """
    count = await notification_service.get_unread_count(current_user.id)
    return {"unread_count": count}

@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    notification_service: NotificationService = Depends()
) -> Any:
    """
    Mark notification as read
    """
    success = await notification_service.mark_notification_read(
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"message": "Notification marked as read"}

@router.put("/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_active_user),
    notification_service: NotificationService = Depends()
) -> Any:
    """
    Mark all notifications as read
    """
    count = await notification_service.mark_all_notifications_read(current_user.id)
    return {"message": f"Marked {count} notifications as read"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    notification_service: NotificationService = Depends()
) -> Any:
    """
    Delete a notification
    """
    success = await notification_service.delete_notification(
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"message": "Notification deleted"}

@router.get("/preferences")
async def get_notification_preferences(
    current_user: User = Depends(get_current_active_user),
    notification_service: NotificationService = Depends()
) -> Any:
    """
    Get user's notification preferences
    """
    preferences = await notification_service.get_user_preferences(current_user.id)
    return preferences

@router.put("/preferences")
async def update_notification_preferences(
    preferences: dict,
    current_user: User = Depends(get_current_active_user),
    notification_service: NotificationService = Depends(),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Update user's notification preferences
    """
    updated_preferences = await notification_service.update_user_preferences(
        user_id=current_user.id,
        preferences=preferences
    )
    
    return {"preferences": updated_preferences}

# Admin endpoints
@router.post("/admin/send")
async def send_notification(
    user_ids: List[str],
    title: str,
    message: str,
    notification_type: NotificationType,
    action_url: Optional[str] = None,
    admin_user: User = Depends(get_current_admin_user),
    notification_service: NotificationService = Depends(),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Send notification to specific users (Admin only)
    """
    result = await notification_service.send_notification_to_users(
        user_ids=user_ids,
        title=title,
        message=message,
        notification_type=notification_type,
        action_url=action_url
    )
    
    return {"message": f"Notification sent to {result['sent_count']} users"}

@router.post("/admin/broadcast")
async def broadcast_notification(
    title: str,
    message: str,
    notification_type: NotificationType,
    user_role: Optional[str] = None,
    action_url: Optional[str] = None,
    admin_user: User = Depends(get_current_admin_user),
    notification_service: NotificationService = Depends(),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Broadcast notification to all users or specific role (Admin only)
    """
    result = await notification_service.broadcast_notification(
        title=title,
        message=message,
        notification_type=notification_type,
        user_role=user_role,
        action_url=action_url
    )
    
    return {"message": f"Notification broadcasted to {result['sent_count']} users"}