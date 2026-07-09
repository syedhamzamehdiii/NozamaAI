# Backend/app/api/v1/__init__.py
from fastapi import APIRouter
import logging

logger = logging.getLogger(__name__)

# Create main API router
api_router = APIRouter()

# Only import routers that actually exist in your project
try:
    from . import auth
    api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
    logger.info("Auth router included")
except ImportError as e:
    logger.warning(f"Could not import auth router: {e}")

try:
    from . import products
    api_router.include_router(products.router, prefix="/products", tags=["Products"])
    logger.info("Products router included")
except ImportError as e:
    logger.warning(f"Could not import products router: {e}")

try:
    from . import admin
    api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
    logger.info("Admin router included")
except ImportError as e:
    logger.warning(f"Could not import admin router: {e}")

try:
    from . import payments
    api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
    logger.info("Payments router included")
except ImportError as e:
    logger.warning(f"Could not import payments router: {e}")
    
try:
    from . import seller
    api_router.include_router(seller.router, prefix="/seller", tags=["Seller"])
    logger.info("Seller router included")
except ImportError as e:
    logger.warning(f"Could not import seller router: {e}")

try:
    from . import ai_token_payments
    api_router.include_router(ai_token_payments.router, prefix="/ai-token-payments", tags=["AI Token Payments"])
    logger.info("AI Token Payments router included")
except ImportError as e:
    logger.warning(f"Could not import ai_token_payments router: {e}")

@api_router.get("/health")
async def api_health_check():
    return {"status": "healthy", "message": "API is running", "version": "1.0.0"}

@api_router.get("")
async def api_root():
    return {"message": "API v1 root"}

@api_router.get("/test")
async def test_endpoint():
    return {"message": "API v1 is working", "version": "1.0.0"}