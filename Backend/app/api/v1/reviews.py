# =============== app/api/v1/reviews.py ===============
"""
Review management endpoints
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.api.dependencies import (
    get_current_active_user,
    get_current_user_optional,
    get_current_admin_user,
    get_pagination_params,
    PaginationParams,
    rate_limiter,
    strict_rate_limiter,
    get_review_service,
    get_product_service,
    get_order_service,
    get_notification_service
)
from app.schemas.review import (
    ReviewResponse,
    ReviewCreate,
    ReviewUpdate,
    SellerResponse,
    ReviewHelpful
)
from app.services.review_service import ReviewService
from app.services.order_service import OrderService
from app.services.product_service import ProductService
from app.services.notification_service import NotificationService
from app.models.user import User
from app.models.review import ReviewStatus

router = APIRouter()

@router.get("/", response_model=List[ReviewResponse])
async def get_reviews(
    product_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    rating: Optional[int] = Query(None, ge=1, le=5),
    pagination: PaginationParams = Depends(get_pagination_params),
    status_filter: Optional[ReviewStatus] = Query(ReviewStatus.APPROVED),
    sort_by: str = Query("created_at", regex="^(created_at|rating|helpful_count)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    verified_only: bool = Query(False),
    review_service: ReviewService = Depends(get_review_service)
) -> Any:
    """
    Get reviews with advanced filtering and search
    """
    reviews = await review_service.get_reviews(
        product_id=product_id,
        user_id=user_id,
        rating=rating,
        status=status_filter,
        verified_only=verified_only,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return reviews

@router.get("/product/{product_id}", response_model=List[ReviewResponse])
async def get_product_reviews(
    product_id: str,
    pagination: PaginationParams = Depends(get_pagination_params),
    rating_filter: Optional[int] = Query(None, ge=1, le=5),
    sort_by: str = Query("created_at", regex="^(created_at|rating|helpful_count)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    verified_only: bool = Query(False),
    with_photos: bool = Query(False),
    review_service: ReviewService = Depends(get_review_service),
    product_service: ProductService = Depends(get_product_service)
) -> Any:
    """
    Get reviews for a specific product with advanced filtering
    """
    # Verify product exists
    product = await product_service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    reviews = await review_service.get_product_reviews(
        product_id=product_id,
        rating_filter=rating_filter,
        verified_only=verified_only,
        with_photos=with_photos,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return reviews

@router.get("/product/{product_id}/summary")
async def get_product_review_summary(
    product_id: str,
    review_service: ReviewService = Depends(get_review_service),
    product_service: ProductService = Depends(get_product_service)
) -> Any:
    """
    Get review summary statistics for a product
    """
    # Verify product exists
    product = await product_service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    summary = await review_service.get_product_review_summary(product_id)
    return summary

@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(
    review_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    review_service: ReviewService = Depends(get_review_service)
) -> Any:
    """
    Get review by ID with user-specific data
    """
    review = await review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Add user-specific data if authenticated
    if current_user:
        review = await review_service.add_user_context_to_review(
            review, current_user.id
        )
    
    return review

@router.post("/", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_active_user),
    review_service: ReviewService = Depends(get_review_service),
    order_service: OrderService = Depends(get_order_service),
    product_service: ProductService = Depends(get_product_service),
    notification_service: NotificationService = Depends(get_notification_service),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Create a new review (verified purchase required)
    """
    # Verify product exists
    product = await product_service.get_product_by_id(review_data.product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check if user has purchased the product
    has_purchased = await order_service.user_has_purchased_product(
        user_id=current_user.id,
        product_id=review_data.product_id
    )
    
    if not has_purchased:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only review products you have purchased"
        )
    
    # Check if user has already reviewed this product
    existing_review = await review_service.get_user_product_review(
        user_id=current_user.id,
        product_id=review_data.product_id
    )
    
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this product"
        )
    
    # Check review cooldown period (prevent spam)
    recent_reviews = await review_service.get_user_recent_reviews(
        user_id=current_user.id,
        hours=24
    )
    
    if len(recent_reviews) >= 5:  # Max 5 reviews per day
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You have reached the daily review limit"
        )
    
    # Create the review
    review = await review_service.create_review(review_data, current_user.id)
    
    # Send notification to product seller (best-effort)
    try:
        if hasattr(notification_service, 'notify_seller_new_review'):
            await notification_service.notify_seller_new_review(
                seller_id=product.seller_id,
                product_title=product.title,
                review_rating=review.rating,
                review_id=review.id
            )
    except Exception:
        # Don't block review creation if notifications fail
        pass
    
    # Update product rating
    await product_service.update_product_rating(review_data.product_id)
    
    return review

@router.put("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: str,
    review_update: ReviewUpdate,
    current_user: User = Depends(get_current_active_user),
    review_service: ReviewService = Depends(get_review_service),
    product_service: ProductService = Depends(get_product_service),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Update review (Owner only, within edit window)
    """
    # Check if review exists and user owns it
    review = await review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    if review.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this review"
        )
    
    # Check if review is still editable (within 48 hours)
    if not await review_service.is_review_editable(review_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review edit window has expired"
        )
    
    # Update the review
    updated_review = await review_service.update_review(review_id, review_update)
    
    # Update product rating if rating changed
    if review_update.rating and review_update.rating != review.rating:
        await product_service.update_product_rating(review.product_id)
    
    return updated_review

@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: str,
    current_user: User = Depends(get_current_active_user),
    review_service: ReviewService = Depends(get_review_service),
    product_service: ProductService = Depends(get_product_service)
) -> None:
    """
    Delete review (Owner or Admin only)
    """
    # Check if review exists and user owns it or is admin
    review = await review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    if review.user_id != str(current_user.id) and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this review"
        )
    
    # Store product_id before deletion for rating update
    product_id = review.product_id
    
    # Delete the review
    await review_service.delete_review(review_id)
    
    # Update product rating
    await product_service.update_product_rating(product_id)

@router.post("/{review_id}/helpful")
async def mark_review_helpful(
    review_id: str,
    helpful_data: ReviewHelpful,
    current_user: User = Depends(get_current_active_user),
    review_service: ReviewService = Depends(get_review_service)
) -> Any:
    """
    Mark review as helpful or not helpful
    """
    # Check if review exists
    review = await review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Check if user is trying to vote on their own review
    if review.user_id == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot vote on your own review"
        )
    
    # Update helpfulness vote
    result = await review_service.mark_review_helpful(
        review_id=review_id,
        user_id=current_user.id,
        helpful=helpful_data.helpful
    )
    
    return {
        "message": "Review helpfulness updated",
        "helpful_count": result["helpful_count"],
        "not_helpful_count": result["not_helpful_count"]
    }

@router.post("/{review_id}/respond", response_model=ReviewResponse)
async def respond_to_review(
    review_id: str,
    response_data: SellerResponse,
    current_user: User = Depends(get_current_active_user),
    review_service: ReviewService = Depends(get_review_service),
    product_service: ProductService = Depends(get_product_service),
    notification_service: NotificationService = Depends(get_notification_service),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Respond to a review (Product owner only)
    """
    # Check if review exists
    review = await review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Get product to check seller ownership
    product = await product_service.get_product_by_id(review.product_id)
    if not product or product.seller_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to respond to this review"
        )
    
    # Check if seller has already responded
    if review.seller_response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already responded to this review"
        )
    
    # Add seller response
    updated_review = await review_service.add_seller_response(
        review_id=review_id,
        response=response_data.response
    )
    
    # Notify the reviewer about the response
    await notification_service.notify_user_seller_response(
        user_id=review.user_id,
        product_title=product.title,
        review_id=review_id
    )
    
    return updated_review

@router.put("/{review_id}/response")
async def update_seller_response(
    review_id: str,
    response_data: SellerResponse,
    current_user: User = Depends(get_current_active_user),
    review_service: ReviewService = Depends(get_review_service),
    product_service: ProductService = Depends(get_product_service),
    _: bool = Depends(rate_limiter)
) -> Any:
    """
    Update seller response to a review
    """
    # Check if review exists
    review = await review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Get product to check seller ownership
    product = await product_service.get_product_by_id(review.product_id)
    if not product or product.seller_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update response to this review"
        )
    
    # Check if seller has responded
    if not review.seller_response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No existing response to update"
        )
    
    # Update seller response
    updated_review = await review_service.update_seller_response(
        review_id=review_id,
        response=response_data.response
    )
    
    return {"message": "Seller response updated successfully"}

@router.delete("/{review_id}/response")
async def delete_seller_response(
    review_id: str,
    current_user: User = Depends(get_current_active_user),
    review_service: ReviewService = Depends(get_review_service),
    product_service: ProductService = Depends(get_product_service)
) -> Any:
    """
    Delete seller response to a review
    """
    # Check if review exists
    review = await review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Get product to check seller ownership
    product = await product_service.get_product_by_id(review.product_id)
    if not product or product.seller_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete response to this review"
        )
    
    # Check if seller has responded
    if not review.seller_response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No response to delete"
        )
    
    # Delete seller response
    await review_service.delete_seller_response(review_id)
    
    return {"message": "Seller response deleted successfully"}

@router.post("/{review_id}/report")
async def report_review(
    review_id: str,
    reason: str,
    details: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    review_service: ReviewService = Depends(get_review_service),
    _: bool = Depends(strict_rate_limiter)
) -> Any:
    """
    Report a review for inappropriate content
    """
    # Check if review exists
    review = await review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Check if user is trying to report their own review
    if review.user_id == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot report your own review"
        )
    
    # Check if user has already reported this review
    has_reported = await review_service.user_has_reported_review(
        user_id=current_user.id,
        review_id=review_id
    )
    
    if has_reported:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reported this review"
        )
    
    # Create report
    report = await review_service.create_review_report(
        review_id=review_id,
        reporter_id=current_user.id,
        reason=reason,
        details=details
    )
    
    return {"message": "Review report submitted successfully"}

# User-specific endpoints
@router.get("/user/my-reviews", response_model=List[ReviewResponse])
async def get_my_reviews(
    pagination: PaginationParams = Depends(get_pagination_params),
    product_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    review_service: ReviewService = Depends(get_review_service)
) -> Any:
    """
    Get current user's reviews
    """
    reviews = await review_service.get_user_reviews(
        user_id=current_user.id,
        product_id=product_id,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return reviews

@router.get("/user/{user_id}/reviews", response_model=List[ReviewResponse])
async def get_user_public_reviews(
    user_id: str,
    pagination: PaginationParams = Depends(get_pagination_params),
    review_service: ReviewService = Depends(get_review_service)
) -> Any:
    """
    Get user's public reviews
    """
    reviews = await review_service.get_user_public_reviews(
        user_id=user_id,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return reviews

@router.get("/user/{user_id}/stats")
async def get_user_review_stats(
    user_id: str,
    review_service: ReviewService = Depends(get_review_service)
) -> Any:
    """
    Get user's review statistics
    """
    stats = await review_service.get_user_review_stats(user_id)
    return stats

# Admin endpoints
@router.get("/admin/pending", response_model=List[ReviewResponse])
async def get_pending_reviews(
    pagination: PaginationParams = Depends(get_pagination_params),
    admin_user: User = Depends(get_current_admin_user),
    review_service: ReviewService = Depends(get_review_service)
) -> Any:
    """
    Get reviews pending moderation (Admin only)
    """
    reviews = await review_service.get_reviews_by_status(
        status=ReviewStatus.PENDING,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return reviews

@router.get("/admin/reported")
async def get_reported_reviews(
    pagination: PaginationParams = Depends(get_pagination_params),
    admin_user: User = Depends(get_current_admin_user),
    review_service: ReviewService = Depends(get_review_service)
) -> Any:
    """
    Get reported reviews (Admin only)
    """
    reports = await review_service.get_review_reports(
        skip=pagination.skip,
        limit=pagination.limit
    )
    return reports

@router.put("/admin/{review_id}/status")
async def update_review_status(
    review_id: str,
    new_status: ReviewStatus,
    reason: Optional[str] = None,
    admin_user: User = Depends(get_current_admin_user),
    review_service: ReviewService = Depends(get_review_service),
    notification_service: NotificationService = Depends(get_notification_service)
) -> Any:
    """
    Update review status (Admin only)
    """
    # Check if review exists
    review = await review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Update review status
    updated_review = await review_service.update_review_status(
        review_id=review_id,
        new_status=new_status,
        admin_id=admin_user.id,
        reason=reason
    )
    
    # Notify user if review was rejected
    if new_status == ReviewStatus.REJECTED:
        await notification_service.notify_user_review_rejected(
            user_id=review.user_id,
            review_id=review_id,
            reason=reason
        )
    
    return {"message": f"Review status updated to {new_status.value}"}

@router.put("/admin/reports/{report_id}/resolve")
async def resolve_review_report(
    report_id: str,
    action: str,  # dismiss, approve, reject_review
    reason: Optional[str] = None,
    admin_user: User = Depends(get_current_admin_user),
    review_service: ReviewService = Depends(get_review_service)
) -> Any:
    """
    Resolve a review report (Admin only)
    """
    result = await review_service.resolve_review_report(
        report_id=report_id,
        action=action,
        admin_id=admin_user.id,
        reason=reason
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    return {"message": f"Report {action} successfully"}

@router.get("/admin/analytics")
async def get_review_analytics(
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$"),
    admin_user: User = Depends(get_current_admin_user),
    review_service: ReviewService = Depends(get_review_service)
) -> Any:
    """
    Get review analytics (Admin only)
    """
    analytics = await review_service.get_review_analytics(period)
    return analytics