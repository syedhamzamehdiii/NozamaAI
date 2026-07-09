# =============== app/api/v1/analytics.py ===============
"""
Analytics and reporting endpoints
"""

from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from datetime import datetime, timedelta

from app.api.dependencies import (
    get_current_active_user,
    get_current_admin_user,
    get_current_user_optional
)
from app.services.analytics_service import AnalyticsService
from app.models.user import User

router = APIRouter()

@router.get("/user/activity")
async def get_user_activity_analytics(
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$"),
    current_user: User = Depends(get_current_active_user),
    analytics_service: AnalyticsService = Depends()
) -> Any:
    """
    Get user's activity analytics
    """
    analytics = await analytics_service.get_user_activity_analytics(
        user_id=current_user.id,
        period=period
    )
    return analytics

@router.get("/user/purchases")
async def get_user_purchase_analytics(
    current_user: User = Depends(get_current_active_user),
    analytics_service: AnalyticsService = Depends()
) -> Any:
    """
    Get user's purchase analytics
    """
    analytics = await analytics_service.get_user_purchase_analytics(current_user.id)
    return analytics

@router.get("/product/{product_id}/views")
async def get_product_view_analytics(
    product_id: str,
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    analytics_service: AnalyticsService = Depends()
) -> Any:
    """
    Get product view analytics
    """
    # Check if user has access to this product's analytics
    if current_user:
        product = await analytics_service.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # Only product owner or admin can see detailed analytics
        if product.seller_id != str(current_user.id) and current_user.role.value != "admin":
            # Return limited public analytics
            analytics = await analytics_service.get_product_public_analytics(product_id)
            return analytics
    
    analytics = await analytics_service.get_product_view_analytics(product_id, period)
    return analytics

@router.get("/platform/overview")
async def get_platform_overview(
    admin_user: User = Depends(get_current_admin_user),
    analytics_service: AnalyticsService = Depends()
) -> Any:
    """
    Get platform overview analytics (Admin only)
    """
    overview = await analytics_service.get_platform_overview()
    return overview

@router.get("/platform/trends")
async def get_platform_trends(
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$"),
    metric: str = Query("revenue", regex="^(revenue|users|products|orders)$"),
    admin_user: User = Depends(get_current_admin_user),
    analytics_service: AnalyticsService = Depends()
) -> Any:
    """
    Get platform trends analytics (Admin only)
    """
    trends = await analytics_service.get_platform_trends(period, metric)
    return trends

@router.get("/categories/performance")
async def get_category_performance(
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$"),
    admin_user: User = Depends(get_current_admin_user),
    analytics_service: AnalyticsService = Depends()
) -> Any:
    """
    Get category performance analytics (Admin only)
    """
    performance = await analytics_service.get_category_performance(period)
    return performance

@router.get("/sellers/performance")
async def get_seller_performance(
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$"),
    limit: int = Query(10, le=50),
    admin_user: User = Depends(get_current_admin_user),
    analytics_service: AnalyticsService = Depends()
) -> Any:
    """
    Get top seller performance analytics (Admin only)
    """
    performance = await analytics_service.get_seller_performance(period, limit)
    return performance

@router.post("/events/track")
async def track_custom_event(
    event_name: str,
    event_data: dict,
    current_user: Optional[User] = Depends(get_current_user_optional),
    analytics_service: AnalyticsService = Depends()
) -> Any:
    """
    Track custom analytics event
    """
    user_id = current_user.id if current_user else None
    
    await analytics_service.track_event(
        event_name=event_name,
        event_data=event_data,
        user_id=user_id
    )
    
    return {"message": "Event tracked successfully"}