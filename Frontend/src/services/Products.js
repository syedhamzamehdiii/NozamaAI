// =============== src/services/Products.js ===============
import apiService from './Api';

class ProductService {
// Replace your getProducts method (lines 5-40) with this:
async getProducts(params = {}) {
  try {
    console.log('🚀 ProductService.getProducts called with params:', params);
    
    const queryString = new URLSearchParams(params).toString();
    const url = `http://localhost:8000/api/v1/products/${queryString ? `?${queryString}` : ''}`;
    
    console.log('🔗 Full API Url:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📦 API Response data:', data);
    
    return data; // Return data directly - CONSISTENT FORMAT
    
  } catch (error) {
    console.error('❌ ProductService.getProducts error:', error);
    throw error; // FIXED: Throw error instead of wrapping it
  }
}

  async getProduct(id) {
    try {
      const response = await apiService.get(`/api/v1/products/${id}`);
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

// ADD this method to your ProductService class (around line 30-40):
async uploadProduct(productData) {
  try {
    console.log('🚀 Uploading product with data:', productData);
    
    // Get token from localStorage - this should be your Google JWT token
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    console.log('🔑 Token being sent:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    // Use fetch directly with correct headers
    const response = await fetch('http://localhost:8000/api/v1/seller/products', {
      method: 'POST',
      headers: {
        // IMPORTANT: Don't set Content-Type for FormData - let browser handle it
        'Authorization': `Bearer ${token}`
      },
      body: productData // This should be FormData
    });

    console.log('📊 Upload response status:', response.status);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error('❌ Upload error response:', errorData);
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Upload successful:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
}

  // Add this to your services/products.js file:

// FIND this method in Products.js and REPLACE it:
async getSellerProducts(params = {}) {
  try {
    console.log('🔄 Fetching seller products...');
    
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/v1/seller/products${queryString ? `?${queryString}` : ''}`;
    
    // FIX: Use the correct token (same as dashboard)
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,  // Use real JWT token
        'Content-Type': 'application/json',
      },
    });

    console.log('📦 Seller products API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 Seller products data received:', data);
    
    return {
      success: true,
      data: data.data || data.products || [],
      pagination: data.pagination,
    };
  } catch (error) {
    console.error('❌ Seller products fetch error:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}
  async updateProduct(id, formData) {
  try {
    console.log('📝 Updating product ID:', id);
    
    // FIX: Use the correct token key and direct fetch
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    
    const response = await fetch(`/api/v1/seller/products/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,  // Fixed: Use real JWT token
        // Don't set Content-Type for FormData - let browser handle it
      },
      body: formData
    });

    console.log('Update response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Update success:', result);
    
    return {
      success: true,
      data: result.data || result,
      message: result.message
    };
  } catch (error) {
    console.error('Update product error:', error);
    return {
      success: false,
      message: error.message,
    };
  }
  }

async deleteProduct(id) {
  try {
    console.log('🗑️ Deleting product ID:', id);
    
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');;
    
    const response = await fetch(`/api/v1/seller/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Delete response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Delete success:', result);
    
    return {
      success: true,
      data: result,
      message: result.message
    };
  } catch (error) {
    console.error('Delete product error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
  // In your services/products.js file, add or update this function:
// FIND and REPLACE the getSellerStats method:
// FIND and REPLACE the getSellerStats method:
async getSellerStats() {
  try {
    console.log('🔄 Fetching seller stats...');
    
    // Use the same token as dashboard (this already works!)
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    
    const response = await fetch('/api/v1/seller/dashboard/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,  // Use real JWT token
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Stats API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📈 Stats data received:', data);
    
    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('❌ Stats fetch error:', error);
    return {
      success: false,
      error: error.message,
      data: {
        total_products: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        total_revenue: 0.0,
        total_sales: 0
      }
    };
  }
}


// ADD this method to check what's happening with auth:
  async debugAuth() {
    console.log('🔍 Auth Debug Info:');
    console.log('Token:', localStorage.getItem('token'));
    console.log('Admin Token:', localStorage.getItem('adminToken'));
    console.log('User:', localStorage.getItem('user'));
    console.log('Headers being sent:', this.getAuthHeaders());
  
    try {
      const response = await fetch(`${this.baseURL}/users/me`, {
        headers: this.getAuthHeaders()
    });
    console.log('Auth test response status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('Auth test data:', data);
    }
  } catch (error) {
    console.error('Auth test failed:', error);
  }
}
  // Admin-specific methods
  async getPendingProducts(status = 'pending', params = {}) {
    try {
      const queryParams = {
        status,
        ...params
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const endpoint = `/api/v1/admin/products${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiService.get(endpoint);
      return {
        success: true,
        data: response.products || [],
        stats: response.stats,
        pagination: {
          total: response.total,
          page: response.page,
          pages: response.pages
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async approveProduct(productId) {
    try {
      const response = await apiService.put(`/api/v1/admin/products/${productId}/approve`);
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

  async rejectProduct(productId, reason) {
    try {
      const response = await apiService.put(`/api/v1/admin/products/${productId}/reject`, {
        reason
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

  async toggleProductFeatured(productId, featured) {
    try {
      const response = await apiService.put(`/api/v1/admin/products/${productId}/feature`, {
        featured
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

  async bulkUpdateProducts(productIds, updates) {
    try {
      const response = await apiService.post('/api/v1/admin/products/bulk-update', {
        product_ids: productIds,
        updates
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

  // Other utility methods
  async searchProducts(query, filters = {}) {
    try {
      const params = {
        search: query,
        ...filters,
      };
      
      return await this.getProducts(params);
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getFeaturedProducts() {
    try {
      const response = await apiService.get('/api/v1/products/?featured=true');
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

  async getCategories() {
    try {
      const response = await apiService.get('/api/v1/products/categories/list');
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

  async getProductReviews(productId) {
    try {
      const response = await apiService.get(`/api/v1/products/${productId}/reviews`);
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

  async createReview(productId, reviewData) {
    try {
      const response = await apiService.post(`/api/v1/products/${productId}/reviews`, reviewData);
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



export const productService = new ProductService();

// Named exports for individual functions
export const {
  getProducts,
  getProduct,
  uploadProduct,
  getSellerProducts,
  updateProduct,
  deleteProduct,
  getSellerStats,
  getPendingProducts,
  approveProduct,
  rejectProduct,
  toggleProductFeatured,
  bulkUpdateProducts,
  searchProducts,
  getFeaturedProducts,
  getCategories,
  getProductReviews,
  createReview
} = productService;




export default productService;