# =============== app/services/email_service.py ===============
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, Any, Optional, List
from jinja2 import Environment, FileSystemLoader
import aiofiles
import aiosmtplib
from pathlib import Path

from app.config.settings import settings

class EmailService:
    def __init__(self):
        # Be resilient to different env var names and missing config
        self.smtp_server = getattr(settings, "SMTP_SERVER", None) or getattr(settings, "SMTP_HOST", None)
        self.smtp_port = getattr(settings, "SMTP_PORT", None)
        self.smtp_username = getattr(settings, "SMTP_USERNAME", None)
        self.smtp_password = getattr(settings, "SMTP_PASSWORD", None)
        self.from_email = getattr(settings, "FROM_EMAIL", None) or getattr(settings, "ADMIN_EMAIL", None) or "no-reply@localhost"
        self.from_name = getattr(settings, "FROM_NAME", None) or "Nozama.ai"

        # If SMTP config is incomplete, disable sending gracefully
        self.email_enabled = bool(self.smtp_server and self.smtp_port)

        # Setup Jinja2 environment for email templates
        template_dir = Path(__file__).parent.parent / "templates" / "emails"
        self.jinja_env = Environment(loader=FileSystemLoader(template_dir))
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        template: Optional[str] = None,
        html_content: Optional[str] = None,
        text_content: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        """Send email using async SMTP"""
        try:
            if not self.email_enabled:
                # Email not configured; no-op success to avoid breaking flows in dev
                return True
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            
            # Generate content from template or use provided content
            if template and context:
                html_content, text_content = await self._render_template(template, context)
            
            # Add text and HTML parts
            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)
            
            if html_content:
                html_part = MIMEText(html_content, "html")
                message.attach(html_part)
            
            # Add attachments if any
            if attachments:
                for attachment in attachments:
                    await self._add_attachment(message, attachment)
            
            # Send email (only if enabled)
            if self.email_enabled:
                await aiosmtplib.send(
                    message,
                    hostname=self.smtp_server,
                    port=self.smtp_port,
                    username=self.smtp_username,
                    password=self.smtp_password,
                    use_tls=True
                )
            
            return True
            
        except Exception as e:
            print(f"Failed to send email: {str(e)}")
            return False
    
    async def send_bulk_email(
        self,
        recipients: List[str],
        subject: str,
        template: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send bulk emails"""
        results = {"success": 0, "failed": 0, "errors": []}
        
        for email in recipients:
            try:
                success = await self.send_email(
                    to_email=email,
                    subject=subject,
                    template=template,
                    context=context
                )
                
                if success:
                    results["success"] += 1
                else:
                    results["failed"] += 1
                    results["errors"].append(f"Failed to send to {email}")
                    
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"Error sending to {email}: {str(e)}")
        
        return results
    
    async def _render_template(self, template_name: str, context: Dict[str, Any]) -> tuple[str, str]:
        """Render email template"""
        try:
            # Load HTML template
            html_template = self.jinja_env.get_template(f"{template_name}.html")
            html_content = html_template.render(**context)
            
            # Try to load text template, fallback to HTML if not found
            try:
                text_template = self.jinja_env.get_template(f"{template_name}.txt")
                text_content = text_template.render(**context)
            except:
                # Convert HTML to text (basic conversion)
                import re
                text_content = re.sub('<[^<]+?>', '', html_content)
                text_content = re.sub('\n\s*\n', '\n\n', text_content)
            
            return html_content, text_content
            
        except Exception as e:
            raise Exception(f"Failed to render email template: {str(e)}")
    
    async def _add_attachment(self, message: MIMEMultipart, attachment: Dict[str, Any]) -> None:
        """Add attachment to email"""
        try:
            async with aiofiles.open(attachment["path"], "rb") as f:
                attachment_data = await f.read()
            
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment_data)
            encoders.encode_base64(part)
            
            part.add_header(
                "Content-Disposition",
                f"attachment; filename= {attachment['filename']}"
            )
            
            message.attach(part)
            
        except Exception as e:
            print(f"Failed to add attachment: {str(e)}")
    
    # Predefined email templates
    async def send_welcome_email(self, user_email: str, user_name: str) -> bool:
        """Send welcome email to new users"""
        return await self.send_email(
            to_email=user_email,
            subject="Welcome to Nozama.ai!",
            template="welcome",
            context={
                "user_name": user_name,
                "platform_name": "Nozama.ai",
                "dashboard_url": f"{settings.FRONTEND_URL}/dashboard"
            }
        )
    
    async def send_password_reset_email(self, user_email: str, reset_link: str) -> bool:
        """Send password reset email"""
        return await self.send_email(
            to_email=user_email,
            subject="Reset Your Nozama.ai Password",
            template="password_reset",
            context={
                "reset_link": reset_link,
                "expiry_hours": 24
            }
        )
    
    async def send_order_confirmation_email(self, order_data: Dict[str, Any]) -> bool:
        """Send order confirmation email"""
        return await self.send_email(
            to_email=order_data["user_email"],
            subject=f"Order Confirmation - {order_data['order_number']}",
            template="order_confirmation",
            context=order_data
        )
    
    async def send_download_ready_email(self, user_email: str, product_name: str, download_url: str) -> bool:
        """Send download ready notification"""
        return await self.send_email(
            to_email=user_email,
            subject=f"Your download is ready: {product_name}",
            template="download_ready",
            context={
                "product_name": product_name,
                "download_url": download_url,
                "expiry_days": 30
            }
        )