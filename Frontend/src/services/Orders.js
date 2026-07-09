import apiService from './Api';

class OrderService {
  async getOrders(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = `/api/v1/orders${queryString ? `?${queryString}` : ''}`;
      
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

  async getOrder(id) {
    try {
      const response = await apiService.get(`/api/v1/orders/${id}`);
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

  async createOrder(orderData) {
    try {
      const response = await apiService.post('/api/v1/orders', orderData);
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

  async updateOrder(id, orderData) {
    try {
      const response = await apiService.put(`/api/v1/orders/${id}`, orderData);
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

  async cancelOrder(id) {
    try {
      const response = await apiService.post(`/api/v1/orders/${id}/cancel`);
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

  async getOrderStatus(id) {
    try {
      const response = await apiService.get(`/api/v1/orders/${id}/status`);
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

  async downloadProduct(orderId, productId) {
    try {
      const response = await apiService.get(`/api/v1/orders/${orderId}/download/${productId}`);
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

export const orderService = new OrderService();
export default orderService;
