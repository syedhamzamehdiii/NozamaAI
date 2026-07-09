# backend/app/schemas/admin.py - MERGED VERSION WITH ALL FUNCTIONALITY
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# =============================================================================
# ENUMS
# =============================================================================

class UserRole(str, Enum):
    admin = "admin"
    seller = "seller"
    buyer = "buyer"

class UserStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"
    pending_verification = "pending_verification"
    deleted = "deleted"

class ProductStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    flagged = "flagged"
    deleted = "deleted"

class OrderStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    cancelled = "cancelled"
    refunded = "refunded"

class PaymentStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"

class NotificationStatus(str, Enum):
    pending = "pending"
    sent = "sent"
    delivered = "delivered"
    failed = "failed"

class NotificationChannel(str, Enum):
    email = "email"
    sms = "sms"
    push = "push"

# =============================================================================
# DASHBOARD SCHEMAS
# =============================================================================

class DashboardStatsSchema(BaseModel):
    total_users: int
    active_users: int
    total_products: int
    pending_products: int
    total_orders: int
    completed_orders: int
    total_revenue: float
    monthly_revenue: float
    conversion_rate: float
    avg_order_value: float
    
class RevenueDataPointSchema(BaseModel):
    name: str
    revenue: float
    orders: int

class CategoryDataSchema(BaseModel):
    category: str
    percentage: float

class UserGrowthDataSchema(BaseModel):
    period: str
    user_count: int

class RecentActivitySchema(BaseModel):
    id: str
    activity_type: str
    message: str
    timestamp: datetime

class TopProductSchema(BaseModel):
    id: str
    title: str
    sales_count: int
    total_revenue: float
    growth_percentage: float
    category: str

class PerformanceMetricsSchema(BaseModel):
    conversion_rate: float
    avg_order_value: float
    platform_uptime: float
    avg_load_time: float

# =============================================================================
# USER MANAGEMENT SCHEMAS
# =============================================================================

class UserBaseSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    role: UserRole = UserRole.buyer
    status: UserStatus = UserStatus.active

class UserCreateSchema(UserBaseSchema):
    password: Optional[str] = None
    verified: bool = False
    two_factor_enabled: bool = False

class UserUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    verified: Optional[bool] = None
    two_factor_enabled: Optional[bool] = None

class UserResponseSchema(UserBaseSchema):
    id: str
    verified: bool
    two_factor_enabled: bool
    join_date: datetime
    last_login: Optional[datetime] = None
    avatar: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Role-specific fields
    order_count: Optional[int] = None
    total_spent: Optional[float] = None
    avg_order_value: Optional[float] = None
    products_listed: Optional[int] = None
    total_sales: Optional[float] = None
    commission_rate: Optional[float] = None

class UserStatsSchema(BaseModel):
    total_users: int
    active_users: int
    suspended_users: int
    pending_users: int
    verified_users: int
    admin_users: int
    seller_users: int
    buyer_users: int

class UsersListResponseSchema(BaseModel):
    users: List[UserResponseSchema]
    total: int
    page: int
    limit: int
    total_pages: int
    stats: UserStatsSchema

class UserBulkUpdateSchema(BaseModel):
    status: Optional[UserStatus] = None
    role: Optional[UserRole] = None
    verified: Optional[bool] = None
    two_factor_enabled: Optional[bool] = None

class UserBulkOperationSchema(BaseModel):
    user_ids: List[str]
    updates: UserBulkUpdateSchema

class UserExportFiltersSchema(BaseModel):
    search: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    verified: Optional[bool] = None
    two_factor: Optional[bool] = None

# =============================================================================
# PRODUCT MANAGEMENT SCHEMAS (ENHANCED FOR SELLER COMPATIBILITY)
# =============================================================================

class ProductBaseSchema(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=10)
    short_description: str = Field(..., min_length=10, max_length=500)
    category: str
    price: float = Field(..., ge=0)
    original_price: Optional[float] = Field(None, ge=0)
    tags: Optional[List[str]] = []
    version: str = "1.0.0"
    license_type: str = "commercial"

# ENHANCED: ProductCreateSchema for both admin and seller use
class ProductCreateSchema(ProductBaseSchema):
    requirements: Optional[List[str]] = []
    features: Optional[List[str]] = []
    use_cases: Optional[List[str]] = []
    # Optional fields for seller uploads
    seller_id: Optional[str] = None
    seller_name: Optional[str] = None
    subcategory: Optional[str] = None

class ProductUpdateSchema(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=10)
    short_description: Optional[str] = Field(None, min_length=10, max_length=500)
    category: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    original_price: Optional[float] = Field(None, ge=0)
    tags: Optional[List[str]] = None
    version: Optional[str] = None
    license_type: Optional[str] = None
    status: Optional[ProductStatus] = None
    featured: Optional[bool] = None
    rejection_reason: Optional[str] = None
    flag_reason: Optional[str] = None
    requirements: Optional[List[str]] = None
    features: Optional[List[str]] = None
    use_cases: Optional[List[str]] = None

class ProductResponseSchema(ProductBaseSchema):
    id: str
    status: ProductStatus
    featured: bool
    seller_name: str
    seller_id: str
    images: List[str] = []
    files: List[str] = []  # Added files field for ZIP file paths
    sales_count: int
    revenue: float
    rating: float
    rating_count: int
    view_count: int
    download_count: int
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    flag_reason: Optional[str] = None
    requirements: Optional[List[str]] = []
    features: Optional[List[str]] = []
    use_cases: Optional[List[str]] = []

# File-related schemas
class ProductFileSchema(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    upload_date: datetime
    download_count: int = 0

class ProductFileUploadResponseSchema(BaseModel):
    uploaded_files: List[str]
    message: str
    
class ProductStatsSchema(BaseModel):
    total_products: int
    pending: int
    approved: int
    rejected: int
    flagged: int
    featured: int
    total_revenue: float

class ProductsListResponseSchema(BaseModel):
    products: List[ProductResponseSchema]
    total: int
    page: int
    limit: int
    total_pages: int
    stats: ProductStatsSchema

class ProductBulkUpdateSchema(BaseModel):
    status: Optional[ProductStatus] = None
    featured: Optional[bool] = None
    rejection_reason: Optional[str] = None
    flag_reason: Optional[str] = None

class ProductBulkOperationSchema(BaseModel):
    product_ids: List[str]
    updates: ProductBulkUpdateSchema

class ProductExportFiltersSchema(BaseModel):
    search: Optional[str] = None
    status: Optional[ProductStatus] = None
    category: Optional[str] = None
    featured: Optional[bool] = None

# =============================================================================
# ORDER MANAGEMENT SCHEMAS
# =============================================================================

class OrderItemResponseSchema(BaseModel):
    id: str
    product_id: str
    product_title: str
    quantity: int
    price: float
    total: float

class OrderResponseSchema(BaseModel):
    id: str
    customer_email: str
    customer_name: str
    status: OrderStatus
    payment_status: PaymentStatus
    payment_method: str
    subtotal: float
    tax: float
    total: float
    order_date: datetime
    items_count: int
    created_at: datetime
    updated_at: datetime

class OrderDetailResponseSchema(OrderResponseSchema):
    payment_id: Optional[str] = None
    billing_address: Optional[Dict[str, Any]] = None
    items: List[OrderItemResponseSchema] = []

class OrderStatsSchema(BaseModel):
    total_orders: int
    pending_orders: int
    completed_orders: int
    cancelled_orders: int
    total_revenue: float
    avg_order_value: float

class OrdersListResponseSchema(BaseModel):
    orders: List[OrderResponseSchema]
    total: int
    page: int
    limit: int
    total_pages: int
    stats: OrderStatsSchema

class OrderStatusUpdateSchema(BaseModel):
    status: OrderStatus

# =============================================================================
# NOTIFICATION MANAGEMENT SCHEMAS
# =============================================================================

class NotificationResponseSchema(BaseModel):
    id: str
    type: str
    recipient: str
    title: str
    message: str
    status: NotificationStatus
    sent_at: datetime
    delivered_at: Optional[datetime] = None
    channel: NotificationChannel
    failure_reason: Optional[str] = None

class NotificationsListResponseSchema(BaseModel):
    notifications: List[NotificationResponseSchema]
    total: int
    page: int
    limit: int

class NotificationPerformanceSchema(BaseModel):
    avg_delivery_time: float
    bounce_rate: float
    open_rate: float
    click_rate: float

class ChannelDistributionSchema(BaseModel):
    channel: str
    count: int
    percentage: float

class NotificationExportFiltersSchema(BaseModel):
    search: Optional[str] = None
    type: Optional[str] = None
    status: Optional[NotificationStatus] = None
    channel: Optional[NotificationChannel] = None

# =============================================================================
# STATISTICS SCHEMAS
# =============================================================================

class MetricDataSchema(BaseModel):
    current: float
    previous: float
    growth: float

class StatsKeyMetricsSchema(BaseModel):
    revenue: MetricDataSchema
    orders: MetricDataSchema
    users: MetricDataSchema
    products: MetricDataSchema

class StatsChartDataSchema(BaseModel):
    date: str
    revenue: float
    orders: int
    users: int

class StatsTopCategorySchema(BaseModel):
    name: str
    sales: int
    revenue: float
    growth: float

class StatsConversionStageSchema(BaseModel):
    name: str
    count: int
    percentage: float

class StatsConversionSummarySchema(BaseModel):
    conversion_rate: float
    avg_order_value: float
    customer_acquisition_cost: float
    return_on_ad_spend: float

class StatsConversionFunnelSchema(BaseModel):
    stages: List[StatsConversionStageSchema]
    summary: StatsConversionSummarySchema

class StatsTrafficSourceSchema(BaseModel):
    source: str
    visitors: int
    percentage: float

class StatsDeviceAnalyticsSchema(BaseModel):
    device: str
    sessions: int
    percentage: float