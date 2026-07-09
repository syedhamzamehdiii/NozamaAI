# =============== app/api/v1/affiliate.py ===============
"""
Affiliate program endpoints
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
from app.services.affiliate_service import AffiliateService
from app.models.user import User

router = APIRouter()

@router.post("/join", status_code=status.HTTP_201_CREATED)
async def join_affiliate_program(
    current_user: User = Depends(get_current_active_user),
    affiliate_service: AffiliateService = Depends(),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Join the affiliate program
    """
    # Check if user is already an affiliate
    existing_affiliate = await affiliate_service.get_affiliate_by_user_id(current_user.id)
    if existing_affiliate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already part of the affiliate program"
        )
    
    affiliate = await affiliate_service.create_affiliate(current_user.id)
    return {
        "message": "Successfully joined affiliate program",
        "affiliate_code": affiliate.affiliate_code,
        "status": affiliate.status
    }

@router.get("/dashboard")
async def get_affiliate_dashboard(
    current_user: User = Depends(get_current_active_user),
    affiliate_service: AffiliateService = Depends()
) -> Any:
    """
    Get affiliate dashboard data
    """
    affiliate = await affiliate_service.get_affiliate_by_user_id(current_user.id)
    if not affiliate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Affiliate account not found"
        )
    
    dashboard_data = await affiliate_service.get_affiliate_dashboard(affiliate.id)
    return dashboard_data

@router.get("/links")
async def get_affiliate_links(
    current_user: User = Depends(get_current_active_user),
    affiliate_service: AffiliateService = Depends()
) -> Any:
    """
    Get affiliate referral links
    """
    affiliate = await affiliate_service.get_affiliate_by_user_id(current_user.id)
    if not affiliate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Affiliate account not found"
        )
    
    links = await affiliate_service.generate_affiliate_links(affiliate.affiliate_code)
    return links

@router.get("/clicks")
async def get_affiliate_clicks(
    pagination: PaginationParams = Depends(get_pagination_params),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_active_user),
    affiliate_service: AffiliateService = Depends()
) -> Any:
    """
    Get affiliate click history
    """
    affiliate = await affiliate_service.get_affiliate_by_user_id(current_user.id)
    if not affiliate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Affiliate account not found"
        )
    
    clicks = await affiliate_service.get_affiliate_clicks(
        affiliate_id=affiliate.id,
        start_date=start_date,
        end_date=end_date,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return clicks

@router.get("/commissions")
async def get_affiliate_commissions(
    pagination: PaginationParams = Depends(get_pagination_params),
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    affiliate_service: AffiliateService = Depends()
) -> Any:
    """
    Get affiliate commission history
    """
    affiliate = await affiliate_service.get_affiliate_by_user_id(current_user.id)
    if not affiliate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Affiliate account not found"
        )
    
    commissions = await affiliate_service.get_affiliate_commissions(
        affiliate_id=affiliate.id,
        status=status_filter,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return commissions

@router.post("/payout/request")
async def request_affiliate_payout(
    current_user: User = Depends(get_current_active_user),
    affiliate_service: AffiliateService = Depends(),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Request affiliate commission payout
    """
    affiliate = await affiliate_service.get_affiliate_by_user_id(current_user.id)
    if not affiliate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Affiliate account not found"
        )
    
    result = await affiliate_service.request_payout(affiliate.id)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return {"message": "Payout request submitted", "amount": result["amount"]}

# Affiliate click tracking (public endpoint)
@router.get("/track/{affiliate_code}")
async def track_affiliate_click(
    affiliate_code: str,
    product_id: Optional[str] = None,
    request: Request,
    affiliate_service: AffiliateService = Depends()
) -> Any:
    """
    Track affiliate click (public endpoint)
    """
    click_data = {
        "ip_address": request.client.host,
        "user_agent": request.headers.get("user-agent", ""),
        "referrer_url": request.headers.get("referer"),
        "product_id": product_id
    }
    
    result = await affiliate_service.track_click(affiliate_code, click_data)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid affiliate code"
        )
    
    # Redirect to the appropriate page
    redirect_url = result["redirect_url"]
    return RedirectResponse(url=redirect_url)

# Admin endpoints
@router.get("/admin/all")
async def get_all_affiliates(
    pagination: PaginationParams = Depends(get_pagination_params),
    status_filter: Optional[str] = None,
    admin_user: User = Depends(get_current_admin_user),
    affiliate_service: AffiliateService = Depends()
) -> Any:
    """
    Get all affiliates (Admin only)
    """
    affiliates = await affiliate_service.get_all_affiliates(
        status=status_filter,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return affiliates

@router.put("/admin/{affiliate_id}/status")
async def update_affiliate_status(
    affiliate_id: str,
    new_status: str,
    admin_user: User = Depends(get_current_admin_user),
    affiliate_service: AffiliateService = Depends()
) -> Any:
    """
    Update affiliate status (Admin only)
    """
    result = await affiliate_service.update_affiliate_status(affiliate_id, new_status)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Affiliate not found"
        )
    
    return {"message": "Affiliate status updated"}