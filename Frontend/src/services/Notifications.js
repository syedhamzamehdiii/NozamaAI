// =============== src/services/notifications.js ===============
import apiService from './Api';

class NotificationService {
  async getNotifications(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = `/api/v1/notifications${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiService.get(endpoint);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async markAsRead(notificationId) {
    try {
      const response = await apiService.patch(`/api/v1/notifications/${notificationId}/read`);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async markAllAsRead() {
    try {
      const response = await apiService.patch('/api/v1/notifications/read-all');
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteNotification(notificationId) {
    try {
      const response = await apiService.delete(`/api/v1/notifications/${notificationId}`);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getUnreadCount() {
    try {
      const response = await apiService.get('/api/v1/notifications/unread-count');
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;