# backend/app/core/security.py
from passlib.context import CryptContext
import secrets
import string
from typing import Optional

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Get password hash"""
    return pwd_context.hash(password)

def generate_password(length: int = 12) -> str:
    """Generate a random secure password"""
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(characters) for _ in range(length))

def generate_token(length: int = 32) -> str:
    """Generate a random token"""
    return secrets.token_urlsafe(length)

def generate_verification_code(length: int = 6) -> str:
    """Generate a numeric verification code"""
    return ''.join(secrets.choice(string.digits) for _ in range(length))