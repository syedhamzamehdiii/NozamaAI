# =============== app/config/settings.py (Fixed Version) ===============
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, field_validator
from typing import Optional, List  # FIXED: Added missing imports

class Settings(BaseSettings):
    # Database
    MONGODB_URL: str = "mongodb+srv://hamza:hamza@cluster0.n44j3.mongodb.net/"
    DATABASE_NAME: str = "nozama_ai"
    
    # JWT
    SECRET_KEY: str = "1q2w3e"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Nozama.ai API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "AI Tools & Data Marketplace API"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Added Vite default
        "http://127.0.0.1:5173"   # Added Vite default
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip().strip('"') for origin in v.strip("[]").split(",")]
        return v

    # File uploads
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    UPLOAD_DIR: str = "uploads"
    
    # File upload settings
    ALLOWED_FILE_TYPES: List[str] = [
        "application/zip",
        "application/x-zip-compressed",
        "image/jpeg",
        "image/jpg", 
        "image/png",
        "image/webp",
        "video/mp4",
        "video/quicktime",
        "video/x-msvideo"
    ]
    
    # Server settings
    BASE_URL: str = "http://localhost:8000"
    USE_S3_STORAGE: bool = False
    
    # Frontend URL (ADDED for AI Token Payment system)
    FRONTEND_URL: str = "http://localhost:5173"
    
    # ========== GOOGLE OAUTH CONFIGURATION (FIXED) ==========
    GOOGLE_CLIENT_ID: Optional[str] = "942324762837-hfntk1qqt3ii4hqjcob9d7cmtu4vj66a.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET: Optional[str] = "42324762837-hfntk1qqt3ii4hqjcob9d7cmtu4vj66a.apps.googleusercontent.com"
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/google/callback"

    # AWS S3 (optional)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: Optional[str] = None
    S3_BUCKET_NAME: Optional[str] = None
    
    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    # ========== STRIPE CONFIGURATION (ENHANCED) ==========
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None  # IMPORTANT: Get this from Stripe CLI
    
    # ========== BLOCKCHAIN & WEB3 CONFIGURATION ==========
    WEB3_PROVIDER_URL: Optional[str] = None  # Infura/Alchemy URL for Ethereum
    USDC_CONTRACT_ADDRESS: str = "0xA0b86a33E6441c8C00c8c7c4c24e9e4c9b0c7c4a"  # USDC contract on Ethereum
    AI_TOKEN_POOL_ADDRESS: Optional[str] = None  # Your AI token pool smart contract address
    
    # ========== EXCHANGE API CONFIGURATION ==========
    # Coinbase (for USD to USDC conversion)
    COINBASE_API_KEY: Optional[str] = None
    COINBASE_API_SECRET: Optional[str] = None  # ADDED: Missing Coinbase secret
    COINBASE_WEBHOOK_SECRET: Optional[str] = None

    # Binance (alternative exchange)
    BINANCE_API_KEY: Optional[str] = None
    BINANCE_API_SECRET: Optional[str] = None

    # ========== ADMIN & SECURITY ==========
    ADMIN_EMAIL: Optional[str] = None
    ADMIN_WALLET_ADDRESS: Optional[str] = None  # Ethereum wallet address
    ADMIN_PRIVATE_KEY: Optional[str] = None     # Private key for blockchain transactions (KEEP SECRET!)
    ADMIN_WALLET_PRIVATE_KEY: Optional[str] = None  # Alternative name for clarity
    
    # Encryption (ADDED for securing bank account data)
    ENCRYPTION_KEY: str = "default-encryption-key-change-in-production"

    # ========== MONITORING & INFRASTRUCTURE ==========
    # Redis & Monitoring
    REDIS_URL: Optional[str] = None
    SENTRY_DSN: Optional[str] = None
    LOG_LEVEL: str = "INFO"  # Changed from Optional[str] to str with default
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # FIXED: Updated model config to allow extra fields
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra='allow'  # CHANGED: Allow extra fields instead of forbidding them
    )

settings = Settings()