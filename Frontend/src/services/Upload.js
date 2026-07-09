// =============== src/services/upload.js ===============
import { apiService } from './Api';

class UploadService {
  constructor() {
    this.baseURL = 'http://localhost:8000/api/v1';
  }

  // Get auth headers without Content-Type for file uploads
  getUploadHeaders() {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (token) {
        return {
          'Authorization': `Bearer ${token}`
        };
      }
      return {};
    } catch (error) {
      console.warn('Error getting auth headers:', error);
      return {};
    }
  }

  async uploadImage(file, purpose = 'product') {
    try {
      console.log('📸 Uploading image:', file.name, 'Purpose:', purpose);

      if (!file || !file.type.startsWith('image/')) {
        throw new Error('Please select a valid image file');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', purpose);

      const response = await fetch(`${this.baseURL}/upload/image`, {
        method: 'POST',
        headers: this.getUploadHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Upload failed');
      }

      const data = await response.json();
      console.log('✅ Image uploaded successfully:', data);

      return {
        success: true,
        data: data,
        url: data.file_url
      };
    } catch (error) {
      console.error('❌ Image upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async uploadProductFile(file, productId, description = '') {
    try {
      console.log('📁 Uploading product file:', file.name, 'Product ID:', productId);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('product_id', productId);
      formData.append('description', description);

      const response = await fetch(`${this.baseURL}/upload/product-file`, {
        method: 'POST',
        headers: this.getUploadHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Upload failed');
      }

      const data = await response.json();
      console.log('✅ Product file uploaded successfully:', data);

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Product file upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async uploadMultipleImages(files, purpose = 'product') {
    try {
      console.log('📸 Uploading multiple images:', files.length, 'files');

      // Validate file count
      if (files.length > 5) {
        throw new Error('Maximum 5 images allowed');
      }

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
      formData.append('purpose', purpose);

      const response = await fetch(`${this.baseURL}/upload/multiple-images`, {
        method: 'POST',
        headers: this.getUploadHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Upload failed');
      }

      const data = await response.json();
      console.log('✅ Multiple images uploaded successfully:', data);

      return {
        success: true,
        data: data,
        files: data.files || []
      };
    } catch (error) {
      console.error('❌ Multiple image upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getProductFiles(productId) {
    try {
      console.log('📂 Getting product files for:', productId);
      
      const response = await apiService.get(`/upload/product-files/${productId}`);
      
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('❌ Get product files error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getUserFiles(fileType = null) {
    try {
      console.log('📂 Getting user files, type:', fileType);
      
      let endpoint = '/upload/user-files';
      if (fileType) {
        endpoint += `?file_type=${fileType}`;
      }
      
      const response = await apiService.get(endpoint);
      
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('❌ Get user files error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteFile(fileId) {
    try {
      console.log('🗑️ Deleting file:', fileId);
      
      const response = await apiService.delete(`/upload/files/${fileId}`);
      
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('❌ Delete file error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async downloadFile(fileId, filename = 'download') {
    try {
      console.log('⬇️ Downloading file:', fileId);
      
      const response = await fetch(`${this.baseURL}/upload/download/${fileId}`, {
        method: 'GET',
        headers: this.getUploadHeaders(),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return {
        success: true,
        message: 'File downloaded successfully'
      };
    } catch (error) {
      console.error('❌ Download file error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Utility method to validate image file
  validateImageFile(file, maxSizeMB = 10) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes

    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    if (!validTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: `Invalid file type. Allowed types: ${validTypes.join(', ')}` 
      };
    }

    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `File size too large. Maximum size: ${maxSizeMB}MB` 
      };
    }

    return { valid: true };
  }

  // Create image preview URL
  createImagePreview(file) {
    try {
      if (file && file.type.startsWith('image/')) {
        return URL.createObjectURL(file);
      }
      return null;
    } catch (error) {
      console.error('Error creating image preview:', error);
      return null;
    }
  }

  // Clean up preview URLs
  revokeImagePreview(url) {
    try {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error revoking image preview:', error);
    }
  }
}

export const uploadService = new UploadService();
export default uploadService;