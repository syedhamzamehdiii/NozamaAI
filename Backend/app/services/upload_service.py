# backend/app/services/upload_service.py - COMBINED VERSION
import os
import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile, HTTPException, status
from PIL import Image
import logging
from typing import Optional, List
from datetime import datetime
import io

# Try to import S3 support - optional
try:
    import boto3
    S3_AVAILABLE = True
except ImportError:
    boto3 = None
    S3_AVAILABLE = False

# Try to import settings - fallback if not available
try:
    from app.config.settings import settings
    SETTINGS_AVAILABLE = True
except ImportError:
    SETTINGS_AVAILABLE = False
    # Create minimal settings fallback
    class Settings:
        USE_S3_STORAGE = False
        UPLOAD_DIR = "uploads"
        AWS_ACCESS_KEY_ID = ""
        AWS_SECRET_ACCESS_KEY = ""
        AWS_REGION = "us-east-1"
        S3_BUCKET_NAME = ""
        BASE_URL = "http://localhost:8000"
    settings = Settings()

logger = logging.getLogger(__name__)

class UploadService:
    def __init__(self):
        # S3 configuration (if available)
        self.use_s3 = getattr(settings, 'USE_S3_STORAGE', False) and S3_AVAILABLE
        if self.use_s3:
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=getattr(settings, 'AWS_REGION', 'us-east-1')
                )
                self.bucket_name = settings.S3_BUCKET_NAME
                logger.info("✅ S3 storage configured")
            except Exception as e:
                logger.warning(f"⚠️ S3 setup failed, falling back to local: {e}")
                self.use_s3 = False
        
        # Local storage configuration
        if not self.use_s3:
            upload_dir = getattr(settings, 'UPLOAD_DIR', 'uploads')
            self.base_upload_dir = Path(upload_dir)
            self.upload_dir = self.base_upload_dir  # For compatibility
            self.base_upload_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"✅ Local storage configured: {self.base_upload_dir.absolute()}")
    
    async def upload_file(
        self,
        file: UploadFile,
        folder: str = "files",
        allowed_types: Optional[List[str]] = None,
        max_size: int = 50 * 1024 * 1024  # 50MB default
    ) -> str:
        """Upload file to storage - ENHANCED VERSION WITH S3 SUPPORT"""
        try:
            # Validate file type
            if allowed_types and file.content_type not in allowed_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File type {file.content_type} not allowed. Allowed types: {allowed_types}"
                )
            
            # Validate file size
            file.file.seek(0, 2)  # Seek to end
            file_size = file.file.tell()
            file.file.seek(0)  # Reset to beginning
            
            if file_size > max_size:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File size ({file_size} bytes) exceeds maximum allowed size ({max_size} bytes)"
                )
            
            # Generate unique filename
            file_extension = Path(file.filename).suffix.lower()
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            
            if folder:
                # FIXED: Use forward slashes consistently
                file_path = f"{folder}/{unique_filename}"
            else:
                file_path = unique_filename
            
            # Upload to storage
            if self.use_s3:
                return await self._upload_to_s3(file, file_path)
            else:
                result_url = await self._upload_to_local(file, file_path)
                # ENSURE forward slashes in returned URL
                return result_url.replace('\\', '/')
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ File upload failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"File upload failed: {str(e)}"
            )
    
    async def _upload_to_s3(self, file: UploadFile, file_path: str) -> str:
        """Upload file to S3"""
        try:
            # Read file content
            content = await file.read()
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_path,
                Body=content,
                ContentType=file.content_type
            )
            
            # Return public URL
            return f"https://{self.bucket_name}.s3.{getattr(settings, 'AWS_REGION', 'us-east-1')}.amazonaws.com/{file_path}"
            
        except Exception as e:
            raise Exception(f"S3 upload failed: {str(e)}")
    
    async def _upload_to_local(self, file: UploadFile, file_path: str) -> str:
        """Upload file to local storage - FIXED FOR WINDOWS PATHS"""
        try:
            # Use absolute path for upload directory
            full_path = self.base_upload_dir / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            async with aiofiles.open(full_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # CRITICAL FIX: Convert Windows backslashes to forward slashes for URLs
            url_path = file_path.replace('\\', '/')
            final_url = f"/{self.base_upload_dir.name}/{url_path}"
            
            logger.info(f"✅ File uploaded successfully: {final_url}")
            return final_url
            
        except Exception as e:
            raise Exception(f"Local upload failed: {str(e)}")
    
    async def upload_image(
        self,
        file: UploadFile,
        folder: str = "images",
        max_width: Optional[int] = 1200,
        max_height: Optional[int] = 800,
        quality: int = 85
    ) -> str:
        """Upload and optionally resize image - ENHANCED VERSION"""
        try:
            allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
            
            # Validate file type
            if file.content_type not in allowed_types:
                file_extension = Path(file.filename).suffix.lower()
                if file_extension not in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
                    raise HTTPException(status_code=400, detail="Invalid image format")
            
            # Read content for size check
            content = await file.read()
            logger.info(f"📏 Image content size: {len(content)} bytes")
            await file.seek(0)  # Reset file pointer
            
            # Use the enhanced upload_file method
            result_url = await self.upload_file(
                file=file,
                folder=folder,
                allowed_types=allowed_types,
                max_size=10 * 1024 * 1024  # 10MB max for images
            )
            
            # ENSURE forward slashes in the returned URL
            clean_url = result_url.replace('\\', '/')
            logger.info(f"✅ Image uploaded with clean URL: {clean_url}")
            return clean_url
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Upload image error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")
    
    async def _resize_image(
        self,
        image_content: bytes,
        max_width: Optional[int],
        max_height: Optional[int],
        quality: int
    ) -> bytes:
        """Resize image while maintaining aspect ratio"""
        try:
            image = Image.open(io.BytesIO(image_content))
            
            # Calculate new dimensions
            if max_width or max_height:
                image.thumbnail((max_width or image.width, max_height or image.height), Image.Resampling.LANCZOS)
            
            # Save processed image
            output = io.BytesIO()
            format = image.format or 'JPEG'
            image.save(output, format=format, quality=quality, optimize=True)
            
            return output.getvalue()
            
        except Exception as e:
            raise Exception(f"Image resize failed: {str(e)}")
    
    async def upload_product_file(
        self,
        file: UploadFile,
        product_id: str,
        user_id: str,
        description: str = ""
    ) -> dict:
        """Upload product file and return file info - ENHANCED VERSION"""
        try:
            # Upload file
            file_url = await self.upload_file(
                file=file,
                folder=f"products/{product_id}",
                allowed_types=None,  # Allow all file types for products
                max_size=500 * 1024 * 1024  # 500MB for product files
            )
            
            # ENSURE forward slashes in file URL
            clean_file_url = file_url.replace('\\', '/')
            
            # Generate file info
            file_info = {
                "id": str(uuid.uuid4()),
                "filename": file.filename,
                "url": clean_file_url,
                "size": file.file.tell() if hasattr(file.file, 'tell') else 0,
                "content_type": file.content_type,
                "user_id": user_id,
                "product_id": product_id,
                "description": description,
                "upload_date": datetime.utcnow()
            }
            
            logger.info(f"✅ Product file uploaded: {clean_file_url}")
            return file_info
            
        except Exception as e:
            raise Exception(f"Product file upload failed: {str(e)}")
    
    # Additional utility methods
    async def get_file_info(self, file_id: str) -> dict:
        """Get file information"""
        # This would typically query a database
        return {
            "id": file_id,
            "user_id": "mock_user",
            "filename": "mock_file",
            "content_type": "application/octet-stream"
        }
    
    async def user_has_file_access(self, user_id: str, file_id: str) -> bool:
        """Check if user has access to file"""
        # Implementation would check database
        return True
    
    async def get_file_stream(self, file_id: str):
        """Get file stream for download"""
        # Implementation would return file stream
        pass
    
    async def get_product_files(self, product_id: str) -> list:
        """Get all files for a product"""
        # Implementation would query database
        return []
    
    async def get_user_files(self, user_id: str, file_type: str = None) -> list:
        """Get user's uploaded files"""
        # Implementation would query database
        return []
    
    async def delete_file(self, file_url: str) -> bool:
        """Delete file from storage - ENHANCED VERSION"""
        try:
            if self.use_s3:
                # Extract key from S3 URL
                aws_region = getattr(settings, 'AWS_REGION', 'us-east-1')
                key = file_url.split(f"{self.bucket_name}.s3.{aws_region}.amazonaws.com/")[1]
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            else:
                # Extract path from local URL - handle both slash types
                clean_url = file_url.replace('\\', '/')
                base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
                file_path = clean_url.replace(f"{base_url}/uploads/", "").replace("/uploads/", "")
                full_path = self.base_upload_dir / file_path
                if full_path.exists():
                    full_path.unlink()
                    logger.info(f"✅ File deleted: {full_path}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to delete file {file_url}: {str(e)}")
            return False