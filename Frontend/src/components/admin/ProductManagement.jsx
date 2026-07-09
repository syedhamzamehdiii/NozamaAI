//Admin/ProductManagement.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  StarIcon,
  TagIcon,
  CubeIcon,
  ChartBarIcon,
  PlusIcon,
  DocumentArrowUpIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { simpleAdminApi } from '../../services/SimpleAdminApi';
import SimpleAdminApiService from '../../services/SimpleAdminApi';

const ProductManagement = () => {
  
  // State management
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Stats state
  const [stats, setStats] = useState({
    pending: 0,
    featured: 0,
    totalRevenue: 0,
    totalProducts: 0,
    approved: 0,
    rejected: 0
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Form state for creating/editing products
  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    short_description: '',
    category: 'Natural Language Processing',
    price: 0,
    original_price: 0,
    tags: [],
    version: '1.0.0',
    license_type: 'commercial',
    requirements: [],
    features: [],
    use_cases: [],
    status: 'pending',
    featured: false
  });

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Categories and license types
  const categories = [
    'Natural Language Processing',
    'Computer Vision',
    'Machine Learning',
    'Deep Learning',
    'Data Science',
    'Robotics',
    'Other'
  ];

  const licenseTypes = [
    { value: 'commercial', label: 'Commercial' },
    { value: 'personal', label: 'Personal' },
    { value: 'open_source', label: 'Open Source' },
    { value: 'enterprise', label: 'Enterprise' }
  ];

  // API base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

  
const [viewMode, setViewMode] = useState('super_admin'); // or 'simple_admin'
  const fetchProducts = useCallback(async (page = 1, filters = {}) => {
    
  try {
    setLoading(true);
    setError(null);

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: itemsPerPage.toString(),
      ...(filters.search && { search: filters.search }),
      ...(filters.status && filters.status !== 'all' && { status: filters.status }),
      ...(filters.category && filters.category !== 'all' && { category: filters.category }),
      ...(filters.featured && filters.featured !== 'all' && { featured: filters.featured === 'featured' })
    });

    const response = await fetch(`${API_BASE_URL}/admin/products?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    setProducts(data.products || []);
    setTotalItems(data.total || 0);
    setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
    setStats({
      pending: data.stats?.pending || 0,
      featured: data.stats?.featured || 0,
      totalRevenue: data.stats?.total_revenue || 0,
      totalProducts: data.total || 0,
      approved: data.stats?.approved || 0,
      rejected: data.stats?.rejected || 0
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    setError('Failed to load products');
    setProducts([]);
  } finally {
    setLoading(false);
  }
}, [itemsPerPage]);

// Fixed approval/rejection functions
const handleProductApproval = async (productId, action, reason = '') => {
  try {
    console.log(`🔄 ${action}ing product:`, productId);
    
    let response;
    
    if (action === 'approve') {
      response = await fetch(`${API_BASE_URL}/admin/products/${productId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        }
      });
    } else if (action === 'reject') {
      if (!reason) {
        reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;
      }
      
      const formData = new FormData();
      formData.append('reason', reason);

      response = await fetch(`${API_BASE_URL}/admin/products/${productId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: formData
      });
    } else if (action === 'flag') {
      // Add flag endpoint
      response = await fetch(`${API_BASE_URL}/admin/products/${productId}/flag`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ reason })
      });
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      alert(`Product ${action}d successfully!`);
      
      // Refresh the products list
      await fetchProducts(currentPage, {
        search: searchTerm,
        status: statusFilter,
        category: categoryFilter,
        featured: featuredFilter
      });
    } else {
      alert(`Failed to ${action} product: ${result.message}`);
    }
    
  } catch (error) {
    console.error(`Error ${action}ing product:`, error);
    alert(`Failed to ${action} product: ${error.message}`);
  }
};

// Feature/Unfeature function
const handleFeatureToggle = async (productId, currentFeaturedStatus) => {
  try {
    const newFeaturedStatus = !currentFeaturedStatus;
    
    const response = await fetch(`${API_BASE_URL}/admin/products/${productId}/feature`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      body: JSON.stringify({ featured: newFeaturedStatus })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      const action = newFeaturedStatus ? 'featured' : 'unfeatured';
      alert(`Product ${action} successfully!`);

      // Refresh the products list
      await fetchProducts(currentPage, {
        search: searchTerm,
        status: statusFilter,
        category: categoryFilter,
        featured: featuredFilter
      });
    } else {
      alert(`Failed to update product: ${result.message}`);
    }
    
  } catch (error) {
    console.error('Error toggling featured status:', error);
    alert(`Failed to update product: ${error.message}`);
  }
};

 // Enhanced file handling functions
const handleFileSelection = (event, fileType) => {
  const files = Array.from(event.target.files);
  
  files.forEach(file => {
    // Validate that file is actually a File object
    if (!(file instanceof File)) {
      console.error('Invalid file object:', file);
      return;
    }
    
    let processedFile = { 
      ...file, 
      originalFile: file, // Keep reference to original File object
      id: Math.random().toString(36).substr(2, 9) // Add unique ID
    };
    
    if (fileType === 'images') {
      if (!file.type.startsWith('image/')) {
        alert(`Only image files are allowed. Skipping: ${file.name}`);
        return;
      }
      if (selectedFiles.filter(f => f.type === 'image').length >= 4) {
        alert('Maximum 4 images allowed');
        return;
      }
      processedFile.type = 'image';
    } else if (fileType === 'video') {
      if (!file.type.startsWith('video/')) {
        alert(`Only video files are allowed. Skipping: ${file.name}`);
        return;
      }
      if (selectedFiles.filter(f => f.type === 'video').length >= 1) {
        alert('Maximum 1 video allowed');
        return;
      }
      processedFile.type = 'video';
    } else if (fileType === 'zip') {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        alert(`Only ZIP files are allowed. Skipping: ${file.name}`);
        return;
      }
      processedFile.type = 'zip';
    }
    
    setSelectedFiles(prevFiles => [...prevFiles, processedFile]);
  });
  
  // Clear the input
  event.target.value = '';
};

const removeSelectedFile = (fileType, index) => {
  setSelectedFiles(prevFiles => {
    const filteredFiles = prevFiles.filter(f => f.type === fileType);
    const otherFiles = prevFiles.filter(f => f.type !== fileType);
    
    // Revoke object URL if it exists to prevent memory leaks
    const fileToRemove = filteredFiles[index];
    if (fileToRemove && fileToRemove.previewUrl) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    
    filteredFiles.splice(index, 1);
    return [...otherFiles, ...filteredFiles];
  });
};

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Enhanced FormData creation
const createFormData = () => {
  const formData = new FormData();
  
  formData.append('title', productForm.title);
  formData.append('description', productForm.description);
  formData.append('short_description', productForm.short_description);
  formData.append('category', productForm.category);
  formData.append('price', productForm.price.toString());
  if (productForm.original_price > 0) {
    formData.append('original_price', productForm.original_price.toString());
  }
  formData.append('tags', JSON.stringify(productForm.tags));
  formData.append('version', productForm.version);
  formData.append('license_type', productForm.license_type);
  formData.append('requirements', JSON.stringify(productForm.requirements));
  formData.append('features', JSON.stringify(productForm.features));
  formData.append('use_cases', JSON.stringify(productForm.use_cases));
  formData.append('status', productForm.status);
  formData.append('featured', productForm.featured.toString());
  
  // Add images - use originalFile property
  selectedFiles.filter(file => file.type === 'image').forEach((file) => {
    if (file.originalFile instanceof File) {
      formData.append('images', file.originalFile);
    }
  });
  
  // Add video - use originalFile property
  const videoFiles = selectedFiles.filter(file => file.type === 'video');
  if (videoFiles.length > 0 && videoFiles[0].originalFile instanceof File) {
    formData.append('demo_video', videoFiles[0].originalFile);
  }
  
  // Add ZIP files - use originalFile property
  selectedFiles.filter(file => file.type === 'zip').forEach((file) => {
    if (file.originalFile instanceof File) {
      formData.append('files', file.originalFile);
    }
  });
  
  return formData;
};

// Add cleanup effect for file URLs
useEffect(() => {
  return () => {
    // Cleanup object URLs when component unmounts
    selectedFiles.forEach(file => {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
    });
  };
}, [selectedFiles]);

  // Create product with file upload
  const createProduct = async (formData) => {
    try {
      setSubmitting(true);
      
      const response = await fetch(`${API_BASE_URL}/admin/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      // Refresh products list
      await fetchProducts(currentPage, {
        search: searchTerm,
        status: statusFilter,
        category: categoryFilter,
        featured: featuredFilter
      });
      
      alert('Product created successfully');
      setShowCreateModal(false);
      resetProductForm();
      
    } catch (error) {
      console.error('Create product error:', error);
      alert('Failed to create product: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Update product with file upload
  const updateProduct = async (productId, formData) => {
    try {
      setSubmitting(true);
      
      const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      // Refresh products list
      await fetchProducts(currentPage, {
        search: searchTerm,
        status: statusFilter,
        category: categoryFilter,
        featured: featuredFilter
      });
      
      alert('Product updated successfully');
      
    } catch (error) {
      console.error('Update product error:', error);
      alert('Failed to update product: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (productId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Refresh products list
    await fetchProducts(currentPage, {
      search: searchTerm,
      status: statusFilter,
      category: categoryFilter,
      featured: featuredFilter
    });
    
    alert('Product deleted successfully');
    
  } catch (error) {
    alert('Failed to delete product: ' + error.message);
  }
};

const bulkUpdateProducts = async (productIds, updates) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/products/bulk-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      body: JSON.stringify({
        product_ids: productIds,
        updates
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Refresh products
    await fetchProducts(currentPage, {
      search: searchTerm,
      status: statusFilter,
      category: categoryFilter,
      featured: featuredFilter
    });
    
    setSelectedProducts([]);
    alert(`${productIds.length} products updated successfully`);
    
  } catch (error) {
    alert('Failed to update products: ' + error.message);
  }
};

      

  // // Export products data
  // const exportProducts = async () => {
  //   try {
  //     const params = new URLSearchParams({
  //       ...(searchTerm && { search: searchTerm }),
  //       ...(statusFilter !== 'all' && { status: statusFilter }),
  //       ...(categoryFilter !== 'all' && { category: categoryFilter }),
  //       ...(featuredFilter !== 'all' && { featured: featuredFilter === 'featured' })
  //     });

  //     const response = await fetch(`${API_BASE_URL}/admin/products/export?${params}`, {
  //       headers: {
  //         'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
  //       },
  //     });

  //     if (response.ok) {
  //       const blob = await response.blob();
  //       const url = window.URL.createObjectURL(blob);
  //       const a = document.createElement('a');
  //       a.style.display = 'none';
  //       a.href = url;
  //       a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
  //       document.body.appendChild(a);
  //       a.click();
  //       window.URL.revokeObjectURL(url);
  //       document.body.removeChild(a);
  //     } else {
  //       throw new Error('Export failed');
  //     }
  //   } catch (error) {
  //     alert('Failed to export products: ' + error.message);
  //   }
  // };

  // Effects
  useEffect(() => {
    fetchProducts(currentPage, {
      search: searchTerm,
      status: statusFilter,
      category: categoryFilter,
      featured: featuredFilter
    });
  }, [currentPage, searchTerm, statusFilter, categoryFilter, featuredFilter]);

 

 

  // Event Handlers
  const refreshData = () => {
    fetchProducts(currentPage, {
      search: searchTerm,
      status: statusFilter,
      category: categoryFilter,
      featured: featuredFilter
    });
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(product => product.id));
    }
  };

  // Replace the existing handleBulkAction function with this updated version

const handleBulkAction = async (action) => {
  if (selectedProducts.length === 0) return;

  let updates = {};
  let confirmMessage = '';

  switch (action) {
    case 'approve':
      updates = { 
        status: 'approved', 
        approved_at: new Date().toISOString(),
        published_at: new Date().toISOString()
      };
      confirmMessage = `Approve ${selectedProducts.length} products?`;
      break;
    case 'reject': {
      const reason = prompt('Rejection reason:');
      if (!reason) return;
      updates = { 
        status: 'rejected', 
        rejection_reason: reason,
        rejected_at: new Date().toISOString()
      };
      confirmMessage = `Reject ${selectedProducts.length} products?`;
      break;
    }
    case 'feature':
      updates = { featured: true };
      confirmMessage = `Feature ${selectedProducts.length} products?`;
      break;
    case 'unfeature':
      updates = { featured: false };
      confirmMessage = `Remove ${selectedProducts.length} products from featured?`;
      break;
    case 'delete':
      confirmMessage = `Delete ${selectedProducts.length} products? This action cannot be undone.`;
      if (window.confirm(confirmMessage)) {
     try {
      // Delete products one by one
      for (const productId of selectedProducts) {
        const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      // Refresh products list
      await fetchProducts(currentPage, {
        search: searchTerm,
        status: statusFilter,
        category: categoryFilter,
        featured: featuredFilter
      });
      
      setSelectedProducts([]);
      alert(`${selectedProducts.length} products deleted successfully`);
    } catch (error) {
      alert('Failed to delete products: ' + error.message);
    }
  }
  return;
}

  if (window.confirm(confirmMessage)) {
    await bulkUpdateProducts(selectedProducts, updates);
  }
};

  const handleProductAction = async (productId, action) => {
    const product = products.find(p => p.id === productId);
    
    switch (action) {
      case 'view':
        setSelectedProduct(product);
        setShowProductModal(true);
        break;
      case 'edit':
        setSelectedProduct(product);
        setProductForm({
          title: product.title || '',
          description: product.description || '',
          short_description: product.short_description || '',
          category: product.category || 'Natural Language Processing',
          price: product.price || 0,
          original_price: product.original_price || product.price || 0,
          tags: product.tags || [],
          version: product.version || '1.0.0',
          license_type: product.license_type || 'commercial',
          requirements: product.requirements || [],
          features: product.features || [],
          use_cases: product.use_cases || [],
          status: product.status || 'pending',
          featured: product.featured || false
        });
        setShowCreateModal(true);
        break;
      // case 'approve':
      //   await updateProduct(productId, { 
      //     status: 'approved', 
      //     approved_at: new Date().toISOString() 
      //   });
      //   break;
      // case 'reject': {
      //     const reason = prompt('Rejection reason:');
      //     if (reason) {
      //       await updateProduct(productId, { 
      //         status: 'rejected', 
      //         rejection_reason: reason 
      //       });
      //     }
      //     break;
      //   }
      // case 'flag': {
      //   const flagReason = prompt('Flag reason:');
      //   if (flagReason) {
      //     await updateProduct(productId, { 
      //       status: 'flagged', 
      //       flag_reason: flagReason 
      //     });
      //   }
      //   break;
      // }
      // case 'feature':
      //   await updateProduct(productId, { featured: !product.featured });
      //   break;
      case 'delete':
        if (window.confirm('Are you sure you want to delete this product?')) {
          await deleteProduct(productId);
        }
        break;
    }
  };

  const resetProductForm = () => {
     // Cleanup existing file URLs
  selectedFiles.forEach(file => {
    if (file.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
  });
    setProductForm({
      title: '',
      description: '',
      short_description: '',
      category: 'Natural Language Processing',
      price: 0,
      original_price: 0,
      tags: [],
      version: '1.0.0',
      license_type: 'commercial',
      requirements: [],
      features: [],
      use_cases: [],
      status: 'pending',
      featured: false
    });
    setSelectedProduct(null);
    setSelectedFiles([]);
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    
    const formData = createFormData();
    
    if (selectedProduct) {
      // Update existing product
      await updateProduct(selectedProduct.id, formData);
      setShowCreateModal(false);
      resetProductForm();
    } else {
      // Create new product
      await createProduct(formData);
    }
  };

  const handleTagInput = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newTag = e.target.value.trim();
      if (!productForm.tags.includes(newTag)) {
        setProductForm(prev => ({
          ...prev,
          tags: [...prev.tags, newTag]
        }));
      }
      e.target.value = '';
    }
  };

  const removeTag = (tagToRemove) => {
    setProductForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleArrayFieldInput = (field, index, value) => {
    setProductForm(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayField = (field) => {
    setProductForm(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (field, index) => {
    setProductForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-[#DAA425] bg-opacity-20 text-[#DAA425] border border-[#DAA425]';
      case 'pending':
        return 'bg-yellow-900 bg-opacity-20 text-yellow-400 border border-yellow-400';
      case 'rejected':
        return 'bg-red-900 bg-opacity-20 text-red-400 border border-red-400';
      case 'flagged':
        return 'bg-orange-900 bg-opacity-20 text-orange-400 border border-orange-400';
      default:
        return 'bg-gray-800 bg-opacity-20 text-gray-400 border border-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckIcon className="h-4 w-4 text-[#DAA425]" />;
      case 'pending':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />;
      case 'rejected':
        return <XMarkIcon className="h-4 w-4 text-red-400" />;
      case 'flagged':
        return <ExclamationTriangleIcon className="h-4 w-4 text-orange-400" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const inputClasses = "w-full px-3 sm:px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] transition-all duration-300 text-sm";
  const selectClasses = "px-3 sm:px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] transition-all duration-300 text-sm";

  // Loading component
  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-2 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DAA425] mx-auto mb-4"></div>
              <p className="text-gray-400">Loading products...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error component
  if (error && products.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-2 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={refreshData}
                className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-4 py-2 rounded-lg transition-all duration-300"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#DAA425]">Product Management</h1>
            <p className="text-sm sm:text-base text-gray-300 mt-1">Review, approve, and manage AI tools and datasets</p>
          </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto bg-[#DAA425] hover:bg-[#DAA740] text-black px-4 py-2 rounded-lg transition-all duration-300 font-medium text-sm flex items-center justify-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Product
            </button>
                    </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-yellow-900 bg-opacity-20 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 sm:h-8 sm:w-8 text-yellow-400" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Pending Review</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-[#DAA425] bg-opacity-20 rounded-lg">
                <StarIcon className="h-5 w-5 sm:h-8 sm:w-8 text-[#DAA425]" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Featured</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.featured}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-[#DAA425] bg-opacity-20 rounded-lg">
                <CubeIcon className="h-5 w-5 sm:h-8 sm:w-8 text-[#DAA425]" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Total Products</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-[#DAA425] bg-opacity-20 rounded-lg">
                <ChartBarIcon className="h-5 w-5 sm:h-8 sm:w-8 text-[#DAA425]" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Total Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-white">
                  ${stats.totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by title, seller, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputClasses} pl-8 sm:pl-10`}
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex gap-2 sm:gap-3 lg:gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={selectClasses}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="flagged">Flagged</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={selectClasses}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={featuredFilter}
                onChange={(e) => setFeaturedFilter(e.target.value)}
                className={selectClasses}
              >
                <option value="all">All Products</option>
                <option value="featured">Featured Only</option>
                <option value="not-featured">Not Featured</option>
              </select>

              {/* <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 hover:text-[#DAA425] text-white transition-all duration-300 text-sm"
              >
                <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">More</span>
              </button> */}
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="bg-[#DAA425] bg-opacity-20 border border-[#DAA425] rounded-lg p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
              <span className="text-sm text-[#DAA425] font-medium">
                {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-3 py-1 rounded text-sm font-medium transition-all duration-300"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-all duration-300"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleBulkAction('feature')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm font-medium transition-all duration-300"
                >
                  Feature
                </button>
                <button
                  onClick={() => handleBulkAction('unfeature')}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium transition-all duration-300"
                >
                  Unfeature
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-all duration-300"
                >
                  Delete
                </button>
                {/* <button
                  onClick={exportProducts}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-all duration-300"
                >
                  Export
                </button> */}
              </div>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-600 bg-gray-900 text-[#DAA425] focus:ring-[#DAA425]"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {products.length > 0 ? (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-800 transition-colors duration-300">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                          className="rounded border-gray-600 bg-gray-900 text-[#DAA425] focus:ring-[#DAA425]"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
  {(() => {
    const image = product.images?.[0];
    const hasValidImage = image && 
      (typeof image === 'string' ? !image.includes('placeholder') : 
       (image.url || image.file_url) && !(image.url || image.file_url).includes('placeholder'));
    
    if (hasValidImage) {
      let imageUrl;
      if (typeof image === 'string') {
        imageUrl = image.startsWith('http') ? image : `http://localhost:8000${image}`;
      } else {
        const url = image.url || image.file_url;
        imageUrl = url.startsWith('http') ? url : `http://localhost:8000${url}`;
      }
      
      return (
        <img 
          src={imageUrl}
          alt={product.title}
          className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      );
    }
    
    return (
      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  })()}
  <div className="ml-4">
    <div className="flex items-center">
      <div className="text-sm font-medium text-white">{product.title}</div>
      {product.featured && (
        <StarIcon className="h-4 w-4 text-[#DAA425] ml-2" />
      )}
    </div>
    <div className="text-sm text-gray-400">{product.category}</div>
    <div className="flex flex-wrap gap-1 mt-1">
      {(product.tags || []).slice(0, 2).map((tag, index) => (
        <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-300">
          {tag}
        </span>
      ))}
      {(product.tags || []).length > 2 && (
        <span className="text-xs text-gray-500">+{(product.tags || []).length - 2} more</span>
      )}
    </div>
  </div>
</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{product.seller_name || 'Unknown'}</div>
                        <div className="text-sm text-gray-400">v{product.version}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(product.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                            {product.status}
                          </span>
                        </div>
                        {(product.status === 'rejected' || product.status === 'flagged') && (
                          <div className="text-xs text-gray-400 mt-1 bg-gray-800 bg-opacity-50 p-2 rounded">
                            {product.rejection_reason || product.flag_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">${product.price}</div>
                        {product.original_price && product.original_price > product.price && (
                          <div className="text-xs text-gray-500 line-through">${product.original_price}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          <div className="flex items-center">
                            <span>{product.sales_count || 0} sales</span>
                            {product.rating > 0 && (
                              <>
                                <span className="mx-2 text-gray-600">â€¢</span>
                                <StarIcon className="h-4 w-4 text-[#DAA425] mr-1" />
                                <span>{product.rating}</span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {product.view_count || 0} views â€¢ {product.download_count || 0} downloads
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        <div>{formatDate(product.created_at)}</div>
                        {product.published_at && (
                          <div className="text-xs">Published: {formatDate(product.published_at)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2 justify-end">
                          {/* Replace the existing action buttons section with this */}
                          <button
                            onClick={() => handleProductAction(product.id, 'view')}
                            className="text-[#DAA425] hover:text-[#DAA740] transition-colors duration-300"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleProductAction(product.id, 'edit')}
                            className="text-gray-400 hover:text-white transition-colors duration-300"
                            title="Edit Product"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          
                          {/* Approval Actions - only show for pending products */}
                          {product.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleProductApproval(product.id, 'approve')}
                                className="text-green-400 hover:text-green-300 transition-colors duration-300"
                                title="Approve Product"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleProductApproval(product.id, 'reject')}
                                className="text-red-400 hover:text-red-300 transition-colors duration-300"
                                title="Reject Product"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          
                          {/* Feature Toggle - show for approved products */}
                          {product.status === 'approved' && (
                            <button
                              onClick={() => handleFeatureToggle(product.id, product.featured)}
                              className={`${product.featured ? 'text-[#DAA425]' : 'text-gray-400'} hover:text-[#DAA740] transition-colors duration-300`}
                              title={product.featured ? 'Remove from Featured' : 'Add to Featured'}
                            >
                              <StarIcon className="h-4 w-4" />
                            </button>
                          )}
                          
                          {/* Flag Action - show for approved products */}
                          {product.status === 'approved' && (
                             <button
        onClick={() => {
          const flagReason = prompt('Flag reason:');
          if (flagReason) {
            handleProductApproval(product.id, 'flag', flagReason);
          }
        }}
        className="text-orange-400 hover:text-orange-300 transition-colors duration-300"
        title="Flag Product"
      >
        <ExclamationTriangleIcon className="h-4 w-4" />
      </button>
    )}
                          
                          <button
                            onClick={() => handleProductAction(product.id, 'delete')}
                            className="text-red-400 hover:text-red-300 transition-colors duration-300"
                            title="Delete Product"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-400">
                  Showing <span className="font-medium text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                  <span className="font-medium text-white">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
                  <span className="font-medium text-white">{totalItems}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-600 bg-gray-800 text-sm font-medium text-gray-400 hover:bg-gray-700 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, index) => {
                    const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + index;
                    if (page > totalPages) return null;
                    
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'border-[#DAA425] bg-[#DAA425] text-black'
                            : 'border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-600 bg-gray-800 text-sm font-medium text-gray-400 hover:bg-gray-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* No results */}
        {products.length === 0 && !loading && (
          <div className="text-center py-12">
            <CubeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}

        {/* Create/Edit Product Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-gray-900 border border-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-[#DAA425]">
                    {selectedProduct ? 'Edit Product' : 'Create New Product'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetProductForm();
                    }}
                    className="text-gray-400 hover:text-white transition-colors duration-300 text-2xl"
                  >
                   ❌
                  </button>
                </div>
                
                <form onSubmit={handleCreateProduct} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#DAA425] mb-2">Title *</label>
                      <input
                        type="text"
                        value={productForm.title}
                        onChange={(e) => setProductForm(prev => ({ ...prev, title: e.target.value }))}
                        className={inputClasses}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#DAA425] mb-2">Category *</label>
                      <select
                        value={productForm.category}
                        onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                        className={selectClasses}
                        required
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#DAA425] mb-2">Price *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={productForm.price}
                        onChange={(e) => setProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        className={inputClasses}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#DAA425] mb-2">Original Price</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={productForm.original_price}
                        onChange={(e) => setProductForm(prev => ({ ...prev, original_price: parseFloat(e.target.value) || 0 }))}
                        className={inputClasses}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#DAA425] mb-2">Version</label>
                      <input
                        type="text"
                        value={productForm.version}
                        onChange={(e) => setProductForm(prev => ({ ...prev, version: e.target.value }))}
                        className={inputClasses}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#DAA425] mb-2">License Type</label>
                      <select
                        value={productForm.license_type}
                        onChange={(e) => setProductForm(prev => ({ ...prev, license_type: e.target.value }))}
                        className={selectClasses}
                      >
                        {licenseTypes.map((license) => (
                          <option key={license.value} value={license.value}>{license.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Status and Featured */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#DAA425] mb-2">Status</label>
                      <select
                        value={productForm.status}
                        onChange={(e) => setProductForm(prev => ({ ...prev, status: e.target.value }))}
                        className={selectClasses}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="flagged">Flagged</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="featured"
                        checked={productForm.featured}
                        onChange={(e) => setProductForm(prev => ({ ...prev, featured: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-900 text-[#DAA425] focus:ring-[#DAA425]"
                      />
                      <label htmlFor="featured" className="text-sm font-medium text-[#DAA425]">
                        Featured Product
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#DAA425] mb-2">Short Description *</label>
                    <textarea
                      rows={3}
                      value={productForm.short_description}
                      onChange={(e) => setProductForm(prev => ({ ...prev, short_description: e.target.value }))}
                      className={inputClasses}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#DAA425] mb-2">Full Description *</label>
                    <textarea
                      rows={6}
                      value={productForm.description}
                      onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                      className={inputClasses}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#DAA425] mb-2">Tags</label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Press Enter to add tags"
                        onKeyDown={handleTagInput}
                        className={inputClasses}
                      />
                      <div className="flex flex-wrap gap-2">
                        {productForm.tags.map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1 bg-[#DAA425] bg-opacity-20 text-[#DAA425] rounded-full text-sm">
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-2 text-[#DAA425] hover:text-[#DAA740]"
                            >
                              Ã—
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <label className="block text-sm font-medium text-[#DAA425] mb-2">Features</label>
                    <div className="space-y-2">
                      {productForm.features.map((feature, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={feature}
                            onChange={(e) => handleArrayFieldInput('features', index, e.target.value)}
                            className={inputClasses}
                            placeholder="Feature description"
                          />
                          <button
                            type="button"
                            onClick={() => removeArrayField('features', index)}
                            className="px-3 py-2 text-red-400 hover:text-red-300"
                          >
                            Ã—
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addArrayField('features')}
                        className="text-[#DAA425] hover:text-[#DAA740] text-sm"
                      >
                        + Add Feature
                      </button>
                    </div>
                  </div>

                  {/* Requirements */}
                  <div>
                    <label className="block text-sm font-medium text-[#DAA425] mb-2">Requirements</label>
                    <div className="space-y-2">
                      {productForm.requirements.map((requirement, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={requirement}
                            onChange={(e) => handleArrayFieldInput('requirements', index, e.target.value)}
                            className={inputClasses}
                            placeholder="System requirement"
                          />
                          <button
                            type="button"
                            onClick={() => removeArrayField('requirements', index)}
                            className="px-3 py-2 text-red-400 hover:text-red-300"
                          >
                            Ã—
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addArrayField('requirements')}
                        className="text-[#DAA425] hover:text-[#DAA740] text-sm"
                      >
                        + Add Requirement
                      </button>
                    </div>
                  </div>

                  {/* Use Cases */}
                  <div>
                    <label className="block text-sm font-medium text-[#DAA425] mb-2">Use Cases</label>
                    <div className="space-y-2">
                      {productForm.use_cases.map((useCase, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={useCase}
                            onChange={(e) => handleArrayFieldInput('use_cases', index, e.target.value)}
                            className={inputClasses}
                            placeholder="Use case description"
                          />
                          <button
                            type="button"
                            onClick={() => removeArrayField('use_cases', index)}
                            className="px-3 py-2 text-red-400 hover:text-red-300"
                          >
                            Ã—
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addArrayField('use_cases')}
                        className="text-[#DAA425] hover:text-[#DAA740] text-sm"
                      >
                        + Add Use Case
                      </button>
                    </div>
                  </div>

                 {/* Enhanced File Upload Section - Replace the existing file upload section */}
                  <div className="space-y-6">
                    {/* Images Upload */}
                    <div>
                      <label className="block text-sm font-medium text-[#DAA425] mb-2">
                        Product Images (Max 4 images)
                      </label>
                      <div className="space-y-4">
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 hover:border-[#DAA425] transition-all duration-300">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <DocumentArrowUpIcon className="w-8 h-8 mb-3 text-gray-400" />
                              <p className="mb-2 text-sm text-gray-400">
                                <span className="font-semibold">Click to upload</span> product images
                              </p>
                              <p className="text-xs text-gray-500">PNG, JPG, WebP (max 10MB each)</p>
                            </div>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => handleFileSelection(e, 'images')}
                              className="hidden"
                            />
                          </label>
                        </div>
{/* Selected Images Preview */}
{selectedFiles.filter(f => f.type === 'image').length > 0 && (
  <div className="space-y-2">
    <h4 className="text-sm font-medium text-[#DAA425]">Selected Images:</h4>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {selectedFiles.filter(f => f.type === 'image').map((file, index) => {
        // Create object URL safely
        let previewUrl;
        try {
          if (file.originalFile instanceof File) {
            previewUrl = URL.createObjectURL(file.originalFile);
          }
        } catch (error) {
          console.error('Error creating object URL:', error);
          previewUrl = null;
        }
        
        return (
          <div key={`image-${file.id || index}`} className="relative">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`Preview ${index + 1}`}
                className="w-full h-24 object-cover rounded border border-gray-600"
                onLoad={() => {
                  // Store the URL for cleanup
                  file.previewUrl = previewUrl;
                }}
                onError={() => {
                  console.error('Error loading image preview');
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                  }
                }}
              />
            ) : (
              <div className="w-full h-24 bg-gray-700 rounded border border-gray-600 flex items-center justify-center">
                <span className="text-gray-400 text-xs">Preview Error</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                if (file.previewUrl) {
                  URL.revokeObjectURL(file.previewUrl);
                }
                removeSelectedFile(file.type, index);
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg hover:bg-red-400 transition-colors"
            >
              ×
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 rounded-b truncate">
              {file.name}
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
                      </div>
                    </div>

                    {/* Video Upload */}
                    <div>
                      <label className="block text-sm font-medium text-[#DAA425] mb-2">
                        Demo Video (Optional, Max 1 video)
                      </label>
                      <div className="space-y-4">
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 hover:border-[#DAA425] transition-all duration-300">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <DocumentArrowUpIcon className="w-8 h-8 mb-3 text-gray-400" />
                              <p className="mb-2 text-sm text-gray-400">
                                <span className="font-semibold">Click to upload</span> demo video
                              </p>
                              <p className="text-xs text-gray-500">MP4, QuickTime, AVI (max 100MB)</p>
                            </div>
                            <input
                              type="file"
                              accept="video/*"
                              onChange={(e) => handleFileSelection(e, 'video')}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Selected Video Preview */}
                        {selectedFiles.filter(f => f.type === 'video').length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-[#DAA425]">Selected Video:</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {selectedFiles.filter(f => f.type === 'video').map((file, index) => (
                                <div key={`video-${index}`} className="flex items-center justify-between bg-gray-800 p-3 rounded border border-gray-600">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                                      <svg className="w-6 h-6 text-[#DAA425]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"/>
                                      </svg>
                                    </div>
                                    <div>
                                      <span className="text-sm text-white block truncate max-w-xs">{file.name}</span>
                                      <span className="text-xs text-gray-400">({formatFileSize(file.size)})</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeSelectedFile(file.type, index)}
                                    className="text-red-400 hover:text-red-300 text-lg ml-2"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ZIP Files Upload */}
                    <div>
                      <label className="block text-sm font-medium text-[#DAA425] mb-2">
                        Product Files (ZIP only)
                      </label>
                      <div className="space-y-4">
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 hover:border-[#DAA425] transition-all duration-300">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <DocumentArrowUpIcon className="w-8 h-8 mb-3 text-gray-400" />
                              <p className="mb-2 text-sm text-gray-400">
                                <span className="font-semibold">Click to upload</span> ZIP files
                              </p>
                              <p className="text-xs text-gray-500">ZIP files only (no size limit)</p>
                            </div>
                            <input
                              type="file"
                              multiple
                              accept=".zip"
                              onChange={(e) => handleFileSelection(e, 'zip')}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Selected ZIP Files List */}
                        {selectedFiles.filter(f => f.type === 'zip').length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-[#DAA425]">Selected ZIP Files:</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {selectedFiles.filter(f => f.type === 'zip').map((file, index) => (
                                <div key={`zip-${index}`} className="flex items-center justify-between bg-gray-800 p-2 rounded border border-gray-600">
                                  <div className="flex items-center space-x-2">
                                    <FolderIcon className="h-4 w-4 text-[#DAA425]" />
                                    <span className="text-sm text-white truncate">{file.name}</span>
                                    <span className="text-xs text-gray-400">({formatFileSize(file.size)})</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeSelectedFile(file.type, index)}
                                    className="text-red-400 hover:text-red-300 text-lg"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetProductForm();
                      }}
                      className="px-6 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 transition-all duration-300"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 bg-[#DAA425] hover:bg-[#DAA740] text-black rounded-lg transition-all duration-300 font-medium disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : (selectedProduct ? 'Update Product' : 'Create Product')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Product Detail Modal */}
        {showProductModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-gray-900 border border-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-[#DAA425]">Product Details</h3>
                  <button
                    onClick={() => setShowProductModal(false)}
                    className="text-gray-400 hover:text-white transition-colors duration-300 text-2xl"
                  >
                    Ã—
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-6">
                  <img
  src={
    !imageError && selectedProduct?.images?.[0]
      ? (() => {
          const img = selectedProduct.images[0];
          if (typeof img === 'string') {
            return img.startsWith('http')
              ? img
              : `http://localhost:8000${img}`;
          } else if (img?.url) {
            return img.url.startsWith('http')
              ? img.url
              : `http://localhost:8000${img.url}`;
          } else if (img?.file_url) {
            return img.file_url.startsWith('http')
              ? img.file_url
              : `http://localhost:8000${img.file_url}`;
          }
          return 'https://dummyimage.com/150x150/4F46E5/ffffff&text=No+Image';
        })()
      : 'https://dummyimage.com/150x150/4F46E5/ffffff&text=No+Image'
  }
  onError={() => setImageError(true)}
  alt={selectedProduct?.title || 'Product Image'}
  className="h-32 w-32 rounded-lg object-cover flex-shrink-0 mx-auto md:mx-0"
/>
                    onError={() => setImageError(true)}
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-center md:space-x-3">
                        <h4 className="text-xl font-semibold text-white">{selectedProduct.title}</h4>
                        {selectedProduct.featured && <StarIcon className="h-6 w-6 text-[#DAA425] mx-auto md:mx-0 mt-2 md:mt-0" />}
                      </div>
                      <p className="text-gray-400 mt-1">by {selectedProduct.seller_name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{selectedProduct.category}</p>
                      <div className="flex flex-col md:flex-row md:items-center md:space-x-3 mt-3">
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedProduct.status)} mx-auto md:mx-0`}>
                          {selectedProduct.status}
                        </span>
                        <span className="text-sm text-gray-400 mt-1 md:mt-0">v{selectedProduct.version}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-[#DAA425] mb-3">Pricing</h5>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Current Price:</dt>
                          <dd className="font-medium text-white">${selectedProduct.price}</dd>
                        </div>
                        {selectedProduct.original_price && selectedProduct.original_price > selectedProduct.price && (
                          <div className="flex justify-between">
                            <dt className="text-gray-400">Original Price:</dt>
                            <dd className="line-through text-gray-500">${selectedProduct.original_price}</dd>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <dt className="text-gray-400">License:</dt>
                          <dd className="text-white capitalize">{selectedProduct.license_type}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-[#DAA425] mb-3">Performance</h5>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Sales:</dt>
                          <dd className="text-white">{selectedProduct.sales_count || 0}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Revenue:</dt>
                          <dd className="text-white">${(selectedProduct.revenue || 0).toLocaleString()}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Rating:</dt>
                          <dd className="text-white">
                            {selectedProduct.rating > 0 
                              ? `${selectedProduct.rating} (${selectedProduct.rating_count || 0} reviews)` 
                              : 'No ratings'
                            }
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Views:</dt>
                          <dd className="text-white">{selectedProduct.view_count || 0}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Downloads:</dt>
                          <dd className="text-white">{selectedProduct.download_count || 0}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <h5 className="font-medium text-[#DAA425] mb-3">Description</h5>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedProduct.description}</p>
                  </div>

                  {selectedProduct.short_description && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-[#DAA425] mb-3">Short Description</h5>
                      <p className="text-gray-300 text-sm">{selectedProduct.short_description}</p>
                    </div>
                  )}

                  {selectedProduct.features && selectedProduct.features.length > 0 && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-[#DAA425] mb-3">Features</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                        {selectedProduct.features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedProduct.requirements && selectedProduct.requirements.length > 0 && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-[#DAA425] mb-3">Requirements</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                        {selectedProduct.requirements.map((requirement, index) => (
                          <li key={index}>{requirement}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedProduct.use_cases && selectedProduct.use_cases.length > 0 && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-[#DAA425] mb-3">Use Cases</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                        {selectedProduct.use_cases.map((useCase, index) => (
                          <li key={index}>{useCase}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-[#DAA425] mb-3">Tags</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.tags.map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded-full">
                            <TagIcon className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(selectedProduct.rejection_reason || selectedProduct.flag_reason) && (
                    <div className="bg-red-900 bg-opacity-20 border border-red-400 rounded-lg p-4">
                      <h5 className="font-medium text-red-400 mb-3">
                        {selectedProduct.status === 'rejected' ? 'Rejection Reason' : 'Flag Reason'}
                      </h5>
                      <p className="text-sm text-red-300">
                        {selectedProduct.rejection_reason || selectedProduct.flag_reason}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-[#DAA425] mb-3">Dates</h5>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Created:</dt>
                          <dd className="text-white">{formatDate(selectedProduct.created_at)}</dd>
                        </div>
                        {selectedProduct.published_at && (
                          <div className="flex justify-between">
                            <dt className="text-gray-400">Published:</dt>
                            <dd className="text-white">{formatDate(selectedProduct.published_at)}</dd>
                          </div>
                        )}
                        {selectedProduct.approved_at && (
                          <div className="flex justify-between">
                            <dt className="text-gray-400">Approved:</dt>
                            <dd className="text-white">{formatDate(selectedProduct.approved_at)}</dd>
                          </div>
                        )}
                        {selectedProduct.updated_at && (
                          <div className="flex justify-between">
                            <dt className="text-gray-400">Updated:</dt>
                            <dd className="text-white">{formatDate(selectedProduct.updated_at)}</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-[#DAA425] mb-3">Product Info</h5>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-400">ID:</dt>
                          <dd className="text-white">{selectedProduct.id}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Version:</dt>
                          <dd className="text-white">{selectedProduct.version}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Category:</dt>
                          <dd className="text-white">{selectedProduct.category}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Featured:</dt>
                          <dd className="text-white">{selectedProduct.featured ? 'Yes' : 'No'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => setShowProductModal(false)}
                      className="w-full sm:w-auto px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 transition-all duration-300"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        handleProductAction(selectedProduct.id, 'edit');
                        setShowProductModal(false);
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-[#DAA425] hover:bg-[#DAA740] text-black rounded-lg transition-all duration-300 font-medium"
                    >
                      Edit Product
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductManagement;