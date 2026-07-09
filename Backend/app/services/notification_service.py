# =============== app/services/notification_service.py ===============
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.models.notification import (
    Notification, NotificationType, NotificationChannel, NotificationStatus
)
from app.services.email_service import EmailService

class NotificationService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.notifications_collection = db.notifications
        self.users_collection = db.users
        self.email_service = EmailService()
    
    async def send_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: str,
        channel: str = "in_app",
        data: Optional[Dict[str, Any]] = None,
        action_url: Optional[str] = None,
        scheduled_at: Optional[datetime] = None
    ) -> str:
        """Send notification to user"""
        try:
            # Get user information
            user_filter = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
            user = await self.users_collection.find_one(user_filter)
            if not user:
                raise Exception("User not found")
            
            # Create notification
            notification = Notification(
                user_id=user_id,
                user_email=user["email"],
                type=NotificationType(notification_type),
                channel=NotificationChannel(channel),
                title=title,
                message=message,
                data=data or {},
                action_url=action_url,
                scheduled_at=scheduled_at
            )
            
            # Insert notification
            result = await self.notifications_collection.insert_one(notification.dict(by_alias=True))
            notification_id = str(result.inserted_id)
            
            # Send immediately if not scheduled
            if not scheduled_at:
                await self._deliver_notification(notification_id)
            
            return notification_id
            
        except Exception as e:
            raise Exception(f"Failed to send notification: {str(e)}")
    
    async def _deliver_notification(self, notification_id: str) -> None:
        """Deliver notification based on channel"""
        try:
            notification_data = await self.notifications_collection.find_one({"_id": ObjectId(notification_id)})
            if not notification_data:
                return
            
            notification = Notification(**notification_data)

            if notification.channel == NotificationChannel.EMAIL:
                success = await self._send_email_notification(notification)
            elif notification.channel == NotificationChannel.IN_APP:
                success = await self._send_in_app_notification(notification)
            elif notification.channel == NotificationChannel.SMS:
                success = await self._send_sms_notification(notification)
            else:
                success = False
            
            # Update notification status
            status = NotificationStatus.SENT if success else NotificationStatus.FAILED
            await self.notifications_collection.update_one(
                {"_id": ObjectId(notification_id)},
                {
                    "$set": {
                        "status": status,
                        "sent_at": datetime.utcnow()
                    }
                }
            )
            
        except Exception as e:
            # Mark as failed
            await self.notifications_collection.update_one(
                {"_id": ObjectId(notification_id)},
                {
                    "$set": {
                        "status": NotificationStatus.FAILED,
                        "sent_at": datetime.utcnow()
                    }
                }
            )
            print(f"Failed to deliver notification {notification_id}: {str(e)}")
    
    async def _send_email_notification(self, notification: Notification) -> bool:
        """Send email notification"""
        try:
            template_map = {
                NotificationType.ORDER_CONFIRMATION: "order_confirmation",
                NotificationType.ORDER_COMPLETED: "order_completed",
                NotificationType.PRODUCT_APPROVED: "product_approved",
                NotificationType.PRODUCT_REJECTED: "product_rejected",
                NotificationType.NEW_REVIEW: "new_review",
                NotificationType.COMMISSION_EARNED: "commission_earned",
                NotificationType.PAYOUT_PROCESSED: "payout_processed",
                NotificationType.SYSTEM_ALERT: "system_alert",
                NotificationType.MARKETING: "marketing"
            }
            
            template = template_map.get(notification.type, "generic_notification")
            
            # If email not configured, gracefully return True to not block flows
            try:
                return await self.email_service.send_email(
                    to_email=notification.user_email,
                    subject=notification.title,
                    template=template,
                    context={
                        "title": notification.title,
                        "message": notification.message,
                        "action_url": notification.action_url,
                        "data": notification.data
                    }
                )
            except Exception:
                return False
            
        except Exception as e:
            print(f"Failed to send email notification: {str(e)}")
            return False
    
    async def _send_in_app_notification(self, notification: Notification) -> bool:
        """Send in-app notification (just mark as sent)"""
        return True
    
    async def _send_sms_notification(self, notification: Notification) -> bool:
        """Send SMS notification (placeholder)"""
        # This would integrate with SMS service like Twilio
        return False
    
    async def get_user_notifications(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
        unread_only: bool = False
    ) -> Dict[str, Any]:
        """Get user notifications"""
        try:
            filter_query = {"user_id": user_id}
            
            if unread_only:
                filter_query["read_at"] = {"$exists": False}
            
            # Get total count
            total = await self.notifications_collection.count_documents(filter_query)
            
            # Get notifications
            cursor = self.notifications_collection.find(filter_query)
            cursor.skip(skip).limit(limit).sort("created_at", -1)
            
            notifications_data = await cursor.to_list(length=limit)
            notifications = [Notification(**notif_data) for notif_data in notifications_data]
            
            return {
                "notifications": [self._serialize_notification(notif) for notif in notifications],
                "total": total,
                "unread_count": await self.get_unread_count(user_id)
            }
            
        except Exception as e:
            raise Exception(f"Failed to get notifications: {str(e)}")
    
    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark notification as read"""
        try:
            result = await self.notifications_collection.update_one(
                {"_id": ObjectId(notification_id), "user_id": user_id},
                {"$set": {"read_at": datetime.utcnow()}}
            )
            return result.modified_count > 0
            
        except Exception as e:
            print(f"Failed to mark notification as read: {str(e)}")
            return False
    
    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all notifications as read for user"""
        try:
            result = await self.notifications_collection.update_many(
                {"user_id": user_id, "read_at": {"$exists": False}},
                {"$set": {"read_at": datetime.utcnow()}}
            )
            return result.modified_count
            
        except Exception as e:
            print(f"Failed to mark all notifications as read: {str(e)}")
            return 0
    
    async def get_unread_count(self, user_id: str) -> int:
        """Get unread notification count"""
        try:
            return await self.notifications_collection.count_documents({
                "user_id": user_id,
                "read_at": {"$exists": False}
            })
            
        except Exception as e:
            return 0
    
    def _serialize_notification(self, notification: Notification) -> Dict[str, Any]:
        """Serialize notification for API response"""
        return {
            "id": str(notification.id),
            "type": notification.type,
            "title": notification.title,
            "message": notification.message,
            "action_url": notification.action_url,
            "data": notification.data,
            "created_at": notification.created_at.isoformat(),
            "read_at": notification.read_at.isoformat() if notification.read_at else None,
            "is_read": notification.read_at is not None
        }