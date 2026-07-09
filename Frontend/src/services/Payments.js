// =============== src/services/payments.js ===============
import apiService from './Api';

class PaymentService {
  async validatePromoCode(code) {
    try {
      const response = await apiService.post('/api/v1/promo-codes/validate', {
        code,
      });
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

  async createPaymentIntent(orderData) {
    try {
      const response = await apiService.post('/api/v1/payments/create-intent', orderData);
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

  async confirmPayment(paymentIntentId, paymentMethodId) {
    try {
      const response = await apiService.post('/api/v1/payments/confirm', {
        payment_intent_id: paymentIntentId,
        payment_method_id: paymentMethodId,
      });
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

  async getPaymentMethods() {
    try {
      const response = await apiService.get('/api/v1/payments/methods');
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

  async addPaymentMethod(paymentMethodData) {
    try {
      const response = await apiService.post('/api/v1/payments/methods', paymentMethodData);
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

  async removePaymentMethod(paymentMethodId) {
    try {
      const response = await apiService.delete(`/api/v1/payments/methods/${paymentMethodId}`);
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

export const paymentService = new PaymentService();
export default paymentService;