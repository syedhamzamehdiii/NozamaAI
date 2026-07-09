# app/api/v1/admin_minimal.py - Create this file for testing
from fastapi import APIRouter, HTTPException
import logging

logger = logging.getLogger(__name__)

# Create a simple router without dependencies
router = APIRouter(tags=["Admin"])

@router.get("/test")
async def test_admin():
    """Test endpoint to verify admin router is working"""
    return {"message": "Admin router is working!", "status": "success"}

@router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Mock dashboard stats"""
    return {
        "total_users": 150,
        "total_products": 45,
        "total_orders": 289,
        "total_revenue": 15750.50,
        "active_users": 89,
        "pending_orders": 12,
        "conversion_rate": 3.4,
        "avg_order_value": 54.50
    }

@router.get("/users")
async def get_users(page: int = 1, limit: int = 20, sort_by: str = "name"):
    """Mock users list"""
    mock_users = []
    for i in range(1, min(limit + 1, 21)):
        mock_users.append({
            "id": f"user_{i}",
            "name": f"User {i}",
            "email": f"user{i}@example.com",
            "role": "user" if i % 5 != 0 else "admin",
            "status": "active",
            "created_at": "2024-01-15T10:30:00Z",
            "last_login": "2024-01-18T14:20:00Z"
        })
    
    return {
        "users": mock_users,
        "total": 150,
        "page": page,
        "limit": limit,
        "pages": 8,
        "has_next": page < 8,
        "has_prev": page > 1
    }

@router.get("/products")
async def get_products(page: int = 1, limit: int = 10):
    """Mock products list"""
    mock_products = []
    for i in range(1, min(limit + 1, 11)):
        mock_products.append({
            "id": f"product_{i}",
            "title": f"Product {i}",
            "description": f"Description for product {i}",
            "price": 99.99 + (i * 10),
            "category": "AI Tools" if i % 2 == 0 else "Data Analytics",
            "status": "approved" if i % 3 != 0 else "pending",
            "created_at": "2024-01-15T10:30:00Z"
        })
    
    return {
        "products": mock_products,
        "total": 45,
        "page": page,
        "limit": limit,
        "pages": 5,
        "has_next": page < 5,
        "has_prev": page > 1
    }

@router.get("/orders")
async def get_orders(page: int = 1, limit: int = 20):
    """Mock orders list"""
    mock_orders = []
    for i in range(1, min(limit + 1, 21)):
        mock_orders.append({
            "id": f"order_{i}",
            "user_name": f"Customer {i}",
            "product_title": f"Product {i}",
            "amount": 99.99 + (i * 5),
            "status": "completed" if i % 3 == 0 else "pending",
            "payment_status": "paid" if i % 3 == 0 else "pending",
            "order_date": "2024-01-15T10:30:00Z"
        })
    
    return {
        "orders": mock_orders,
        "total": 289,
        "page": page,
        "limit": limit,
        "pages": 15,
        "has_next": page < 15,
        "has_prev": page > 1
    }

@router.get("/dashboard/revenue-trend")
async def get_revenue_trend():
    """Mock revenue trend"""
    return [
        {"date": "2024-01-01", "revenue": 1200.50},
        {"date": "2024-01-02", "revenue": 1450.25},
        {"date": "2024-01-03", "revenue": 1100.75},
        {"date": "2024-01-04", "revenue": 1800.00},
        {"date": "2024-01-05", "revenue": 1650.30}
    ]

@router.get("/dashboard/category-distribution")
async def get_category_distribution():
    """Mock category distribution"""
    return [
        {"category": "AI Tools", "count": 25, "percentage": 55.6},
        {"category": "Data Analytics", "count": 15, "percentage": 33.3},
        {"category": "Machine Learning", "count": 5, "percentage": 11.1}
    ]

@router.get("/dashboard/user-growth")
async def get_user_growth():
    """Mock user growth"""
    return [
        {"period": "Week 1", "new_users": 15, "total_users": 120},
        {"period": "Week 2", "new_users": 12, "total_users": 132},
        {"period": "Week 3", "new_users": 18, "total_users": 150},
        {"period": "Week 4", "new_users": 8, "total_users": 158}
    ]

@router.get("/dashboard/recent-activity")
async def get_recent_activity():
    """Mock recent activity"""
    return [
        {"type": "user_registration", "description": "New user registered", "timestamp": "2024-01-18T14:30:00Z"},
        {"type": "product_purchase", "description": "Product purchased", "timestamp": "2024-01-18T14:25:00Z"},
        {"type": "product_upload", "description": "New product uploaded", "timestamp": "2024-01-18T14:20:00Z"}
    ]

@router.get("/dashboard/top-products")
async def get_top_products():
    """Mock top products"""
    return [
        {"id": "1", "title": "AI Assistant Pro", "sales": 45, "revenue": 2250.00},
        {"id": "2", "title": "Data Analyzer Plus", "sales": 38, "revenue": 1900.00},
        {"id": "3", "title": "ML Toolkit", "sales": 32, "revenue": 1600.00}
    ]

@router.get("/dashboard/performance-metrics")
async def get_performance_metrics():
    """Mock performance metrics"""
    return {
        "api_response_time": 245,
        "database_query_time": 89,
        "cache_hit_rate": 87.5,
        "error_rate": 0.8,
        "uptime": 99.9
    }