// frontend/src/services/SimpleAdminApi.js - COMPLETE FIXED VERSION
class SimpleAdminApiService {
  constructor() {
    this.baseURL = 'http://localhost:8000/api/v1';
  }

  // =================== AUTHENTICATION METHODS ===================

  getAuthHeaders() {
    const token = localStorage.getItem('simpleAdminToken');
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  getFormHeaders() {
    const token = localStorage.getItem('simpleAdminToken');
    const headers = {};
    
    // DON'T set Content-Type for FormData - browser will set it with boundary
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  // Enhanced response handler
  async handleResponse(response) {
    let data;
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textData = await response.text();
        console.log('Non-JSON response:', textData);
        data = { message: textData };
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      data = { message: 'Invalid response format' };
    }

    if (!response.ok) {
      console.error('API Error:', {
        status: response.status,
        url: response.url,
        data: data
      });

      // Create descriptive error message
      let errorMessage = data.detail || data.message || data.error || `HTTP ${response.status}`;
      
      switch (response.status) {
        case 401:
          errorMessage = 'Authentication failed - please login again';
          this.logout(); // Auto logout on 401
          break;
        case 403:
          errorMessage = 'Access denied - insufficient permissions';
          break;
        case 404:
          errorMessage = 'Resource not found';
          break;
        case 413:
          errorMessage = 'Files too large - reduce file sizes';
          break;
        case 422:
          errorMessage = `Validation error: ${errorMessage}`;
          break;
        case 500:
          errorMessage = 'Server error - please try again';
          break;
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      error.response = data;
      throw error;
    }

    return data;
  }

  // =================== LOGIN/LOGOUT ===================

  async login(credentials) {
    try {
      console.log('🔐 Simple Admin login attempt:', credentials.email);
      
      const response = await fetch(`${this.baseURL}/simple-admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await this.handleResponse(response);
      
      if (data.success && data.access_token) {
        // Store authentication data
        localStorage.setItem('simpleAdminToken', data.access_token);
        localStorage.setItem('userRole', 'simple_admin');
        localStorage.setItem('simpleAdminUser', JSON.stringify(data.user));
        
        console.log('✅ Simple Admin login successful');
        return data;
      } else {
        throw new Error('Login failed - invalid response');
      }
      
    } catch (error) {
      console.error('❌ Simple Admin login failed:', error);
      throw error;
    }
  }

  logout() {
    console.log('🚪 Simple Admin logout');
    localStorage.removeItem('simpleAdminToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('simpleAdminUser');
    window.location.href = '/simple-admin/login';
  }

  // =================== DASHBOARD ===================

  async getDashboard() {
    try {
      console.log('📊 Fetching Simple Admin dashboard');
      
      const response = await fetch(`${this.baseURL}/simple-admin/dashboard`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await this.handleResponse(response);
      console.log('✅ Dashboard data received');
      return data;
      
    } catch (error) {
      console.error('❌ Dashboard fetch failed:', error);
      throw error;
    }
  }

  // =================== PRODUCTS - RESTRICTED TO OWN PRODUCTS ===================

  async getMyProducts(params = {}) {
    try {
      console.log('📦 Fetching MY products only', params);
      
      const queryParams = new URLSearchParams();
      if (params.skip) queryParams.append('skip', params.skip);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.status) queryParams.append('status', params.status);

      const queryString = queryParams.toString();
      const url = queryString 
        ? `${this.baseURL}/simple-admin/products?${queryString}`
        : `${this.baseURL}/simple-admin/products`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await this.handleResponse(response);
      console.log('✅ My products received:', data.total || 0);
      return data;
      
    } catch (error) {
      console.error('❌ Products fetch failed:', error);
      throw error;
    }
  }

  async getMyProduct(productId) {
    try {
      console.log('📦 Fetching MY product:', productId);
      
      const response = await fetch(`${this.baseURL}/simple-admin/products/${productId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await this.handleResponse(response);
      console.log('✅ My product received');
      return data;
      
    } catch (error) {
      console.error('❌ Product fetch failed:', error);
      throw error;
    }
  }

  async createMyProduct(formData) {
    try {
      console.log('➕ Creating MY product');
      console.log('📊 FormData type:', formData.constructor.name);
      
      // Log FormData contents for debugging
      if (formData instanceof FormData) {
        console.log('📋 FormData entries:');
        for (let [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
          } else {
            console.log(`  ${key}: ${value}`);
          }
        }
      }

      const response = await fetch(`${this.baseURL}/simple-admin/products`, {
        method: 'POST',
        headers: this.getFormHeaders(), // No Content-Type for FormData
        body: formData
      });

      const data = await this.handleResponse(response);
      console.log('✅ Product created successfully');
      return data;
      
    } catch (error) {
      console.error('❌ Product creation failed:', error);
      throw error;
    }
  }

  async updateMyProduct(productId, formData) {
    try {
      console.log('✏️ Updating MY product:', productId);
      
      if (formData instanceof FormData) {
        console.log('📋 Update FormData entries:');
        for (let [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
          } else {
            console.log(`  ${key}: ${value}`);
          }
        }
      }

      const response = await fetch(`${this.baseURL}/simple-admin/products/${productId}`, {
        method: 'PUT',
        headers: this.getFormHeaders(),
        body: formData
      });

      const data = await this.handleResponse(response);
      console.log('✅ Product updated successfully');
      return data;
      
    } catch (error) {
      console.error('❌ Product update failed:', error);
      throw error;
    }
  }

  // =================== FORM DATA CREATION ===================

  createFormData(formData, files = {}) {
    console.log('📦 Creating FormData with:', {
      formData: Object.keys(formData),
      files: {
        images: files.images?.length || 0,
        demo_video: !!files.demo_video,
        files: files.files?.length || 0
      }
    });

    const form = new FormData();
    
    // Add text fields
    Object.keys(formData).forEach(key => {
      const value = formData[key];
      
      if (value === null || value === undefined) {
        console.log(`⚠️ Skipping null/undefined field: ${key}`);
        return;
      }
      
      if (Array.isArray(value)) {
        if (value.length > 0) {
          form.append(key, JSON.stringify(value));
          console.log(`📝 Added array field: ${key} = ${JSON.stringify(value)}`);
        }
      } else {
        form.append(key, String(value));
        console.log(`📝 Added field: ${key} = ${value}`);
      }
    });

    // Add files with validation
    if (files.images && Array.isArray(files.images) && files.images.length > 0) {
      files.images.forEach((image, index) => {
        if (image instanceof File) {
          form.append('images', image);
          console.log(`🖼️ Added image ${index + 1}: ${image.name} (${image.size} bytes)`);
        } else {
          console.warn(`⚠️ Invalid image at index ${index}:`, image);
        }
      });
    }

    if (files.demo_video && files.demo_video instanceof File) {
      form.append('demo_video', files.demo_video);
      console.log(`🎥 Added demo video: ${files.demo_video.name} (${files.demo_video.size} bytes)`);
    }

    if (files.files && Array.isArray(files.files) && files.files.length > 0) {
      files.files.forEach((file, index) => {
        if (file instanceof File) {
          form.append('files', file);
          console.log(`📁 Added file ${index + 1}: ${file.name} (${file.size} bytes)`);
        } else {
          console.warn(`⚠️ Invalid file at index ${index}:`, file);
        }
      });
    }

    console.log('✅ FormData created successfully');
    return form;
  }

  // =================== UTILITY METHODS ===================

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('simpleAdminUser');
      const user = userStr ? JSON.parse(userStr) : null;
      console.log('👤 Current user:', user?.email || 'Not found');
      return user;
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      return null;
    }
  }

  isAuthenticated() {
    const token = localStorage.getItem('simpleAdminToken');
    const role = localStorage.getItem('userRole');
    const isAuth = !!(token && role === 'simple_admin');
    
    console.log('🔐 Authentication check:', {
      hasToken: !!token,
      role: role,
      isAuthenticated: isAuth
    });
    
    return isAuth;
  }

  async testConnection() {
    try {
      console.log('🧪 Testing Simple Admin connection');
      
      const response = await fetch(`${this.baseURL}/simple-admin-test/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await this.handleResponse(response);
      console.log('✅ Connection test successful');
      return data;
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      throw error;
    }
  }

  // =================== DEBUG METHODS ===================

  async debugAuth() {
    console.log('🔍 === SIMPLE ADMIN AUTH DEBUG ===');
    
    const authInfo = {
      token: localStorage.getItem('simpleAdminToken'),
      role: localStorage.getItem('userRole'),
      user: this.getCurrentUser(),
      isAuthenticated: this.isAuthenticated()
    };
    
    console.log('Auth info:', authInfo);
    
    // Test API call
    try {
      const testResponse = await fetch(`${this.baseURL}/simple-admin/debug/test-auth`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      console.log('API test response:', {
        status: testResponse.status,
        statusText: testResponse.statusText,
        ok: testResponse.ok
      });
      
      if (testResponse.ok) {
        const data = await testResponse.json();
        console.log('API test data:', data);
      } else {
        const errorText = await testResponse.text();
        console.log('API test error:', errorText);
      }
    } catch (error) {
      console.error('API test failed:', error);
    }
    
    console.log('🔍 === END AUTH DEBUG ===');
    return authInfo;
  }
}

// Create and export singleton instance
export const simpleAdminApi = new SimpleAdminApiService();
export default SimpleAdminApiService;

// Make it globally available for debugging
if (typeof window !== 'undefined') {
  window.simpleAdminApi = simpleAdminApi;
}

console.log('✅ Simple Admin API Service loaded successfully!');
console.log('🔒 RESTRICTIONS:');
console.log('   - Can only access own products');
console.log('   - Can only create/update (no delete/approve)');
console.log('   - All products start as pending');
console.log('   - Requires Super Admin approval to go live');