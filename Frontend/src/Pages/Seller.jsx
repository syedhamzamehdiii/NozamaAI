//Working Code.

// frontend/src/pages/Seller.jsx - Complete Working Version

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import { getSellerStats, getSellerProducts, deleteProduct, updateProduct } from '../services/Products';
import { uploadProduct } from '../services/Products'; // Make sure this is imported
import { 
  ChevronUp, Mail, Phone, MapPin, Calendar, FileText, ShoppingCart, 
  Users, Shield, Gavel, AlertTriangle, Globe, CreditCard, Zap,
  DollarSign, Clock, AlertCircle, X, CheckCircle 
} from 'lucide-react';
const Seller = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    total_products: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    total_revenue: 0,
    total_sales: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
 const [showPaymentPopup, setShowPaymentPopup] = useState(true);
  

  // Product form state
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
    images: [],
    videos: [],
    previewImages: [],
    previewVideos: []
  });

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState([]);

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

  useEffect(() => {
  fetchStats();

}, []);

  const fetchStats = async () => {
  try {
    setLoading(true); // Add this line
    console.log('🔍 Debug: About to fetch seller stats');
    console.log('🔍 Token available:', !!localStorage.getItem('token'));
    console.log('🔍 User data:', localStorage.getItem('user'));
    
    const response = await getSellerStats();
    console.log('✅ Stats received:', response);
    
  console.log('Full response received:', response);
if (response?.success && response?.data) {
  console.log('Setting stats to:', response.data);
  setStats(response.data);
} else if (response?.data) {
  console.log('Setting stats without success flag:', response.data);
  setStats(response.data);
} else {
  console.log('No valid response data:', response);
  setStats({
    total_products: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    total_revenue: 0,
    total_sales: 0
  });
  toast.error('Failed to fetch seller statistics');
}
  } finally {
    setLoading(false);
  }
}

  // File handling functions
  const handleFileSelection = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        toast.error(`Only ZIP files are allowed. Skipping: ${file.name}`);
        return false;
      }
      return true;
    });
    setSelectedFiles(prevFiles => [...prevFiles, ...validFiles]);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    const imageUrls = files.map(file => URL.createObjectURL(file));
    setProductForm(prev => ({
      ...prev,
      images: files,
      previewImages: imageUrls
    }));
  };

  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 2) {
      toast.error('Maximum 2 videos allowed');
      return;
    }
    const videoUrls = files.map(file => URL.createObjectURL(file));
    setProductForm(prev => ({
      ...prev,
      videos: files,
      previewVideos: videoUrls
    }));
  };

  const removeImage = (index) => {
    setProductForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      previewImages: prev.previewImages.filter((_, i) => i !== index)
    }));
  };

  const removeVideo = (index) => {
    setProductForm(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index),
      previewVideos: prev.previewVideos.filter((_, i) => i !== index)
    }));
  };

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
    
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    if (productForm.images && productForm.images.length > 0) {
      productForm.images.forEach((image) => {
        formData.append('images', image);
      });
    }

    if (productForm.videos && productForm.videos.length > 0) {
      productForm.videos.forEach((video) => {
        formData.append('videos', video);
      });
    }
    
    return formData;
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    
    if (!productForm.title || !productForm.description || !productForm.short_description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const formData = createFormData();
      const response = await uploadProduct(formData);
      
      if (response.success) {
        toast.success('Product submitted for approval successfully!');
        setShowCreateModal(false);
        resetProductForm();
        fetchStats();
      } else {
        toast.error(response.message || 'Failed to create product');
      }
    } catch (error) {
      toast.error('Error creating product: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetProductForm = () => {
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
      images: [],
      videos: [],
      previewImages: [],
      previewVideos: []
    });
    setSelectedFiles([]);
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

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'products', name: 'My Products', icon: '📦' },
  ];

  const StatCard = ({ title, value, icon, color = 'blue' }) => (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-6 hover:bg-gray-750 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-300">{title}</p>
          <p className={`text-2xl font-bold ${
            color === 'blue' ? 'text-blue-400' :
            color === 'yellow' ? 'text-yellow-400' :
            color === 'green' ? 'text-green-400' :
            color === 'red' ? 'text-red-400' :
            color === 'purple' ? 'text-purple-400' : 'text-blue-400'
          }`}>{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );

  StatCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    icon: PropTypes.node.isRequired,
    color: PropTypes.string
  };


  // Complete Product Manager Component - Single File Solution
// Replace the ProductsContent function in your Seller.jsx with this entire component
const CompleteProductManager = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
const [showPaymentNotification, setShowPaymentNotification] = useState(false);

useEffect(() => {
  // Check if notification should be shown
  const hasSeenNotification = localStorage.getItem('seller_payment_notification_seen');
  const remindDate = localStorage.getItem('seller_payment_remind_date');
  
  if (!hasSeenNotification || (remindDate && new Date() > new Date(remindDate))) {
    setShowPaymentNotification(true);
  }
}, []);
  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    short_description: '',
    category: '',
    price: 0,
    original_price: 0,
    tags: [],
    version: '1.0.0',
    license_type: 'commercial',
    requirements: [],
    features: [],
    use_cases: [],
    existing_images: [],
    existing_videos: [],
    existing_files: [],
    new_images: [],
    new_videos: [],
    new_files: [],
    preview_images: [],
    preview_videos: []
  });

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

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      console.log('🔄 Fetching seller products...');
      const response = await getSellerProducts();
      console.log('📦 Products response:', response);
      
      if (response.success) {
        setProducts(response.data || []);
      } else {
        toast.error('Failed to fetch products');
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      toast.error('Error loading products');
    } finally {
      setLoading(false);
    }
  };

const handleViewProduct = (productId, productStatus) => {
  if (productStatus !== 'approved') {
    toast.error('Product must be approved before it can be viewed on the website');
    return;
  }
  // Open product in new tab
  window.open(`/products/${productId}`, '_blank');
};

const handleDelete = async (productId, productName) => {
  if (!window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
    return;
  }

  try {
    console.log('🗑️ Deleting product:', productId);
    const response = await deleteProduct(productId);
    console.log('Delete response:', response);
    
     if (response.success) {
      setProducts(products.filter(p => p._id !== productId));
      toast.success('Product deleted successfully');
      fetchStats(); // Refresh stats
    } else {
      console.error('Delete failed:', response);
      toast.error(response.error || response.message || 'Failed to delete product');
    }
  } catch (error) {
    console.error('Delete error:', error);
    toast.error('Error deleting product: ' + (error.message || 'Unknown error'));
  }
};
  const handleEdit = (product) => {
    console.log('📝 Editing product:', product);
    
    setSelectedProduct(product);
    setEditForm({
      title: product.title || '',
      description: product.description || '',
      short_description: product.short_description || '',
      category: product.category || 'Natural Language Processing',
      price: product.price || 0,
      original_price: product.original_price || 0,
      tags: product.tags || [],
      version: product.version || '1.0.0',
      license_type: product.license_type || 'commercial',
      requirements: product.requirements || [],
      features: product.features || [],
      use_cases: product.use_cases || [],
      existing_images: product.images || [],
      existing_videos: product.videos || (product.demo_video ? [product.demo_video] : []) || (product.demo_video_url ? [product.demo_video_url] : []),
      existing_files: product.files || [],
      new_images: [],
      new_videos: [],
      new_files: [],
      preview_images: [],
      preview_videos: []
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedProduct(null);
    // Reset form
    setEditForm({
      title: '', description: '', short_description: '', category: '', price: 0, original_price: 0,
      tags: [], version: '1.0.0', license_type: 'commercial', requirements: [], features: [], use_cases: [],
      existing_images: [], existing_videos: [], existing_files: [], new_images: [], new_videos: [], new_files: [],
      preview_images: [], preview_videos: []
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const totalImages = editForm.existing_images.length + editForm.new_images.length + files.length;
    
    if (totalImages > 5) {
      toast.error('Maximum 5 images allowed total');
      return;
    }
    
    const imageUrls = files.map(file => URL.createObjectURL(file));
    setEditForm(prev => ({
      ...prev,
      new_images: [...prev.new_images, ...files],
      preview_images: [...prev.preview_images, ...imageUrls]
    }));
  };

  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files);
    const totalVideos = editForm.existing_videos.length + editForm.new_videos.length + files.length;
    
    if (totalVideos > 2) {
      toast.error('Maximum 2 videos allowed total');
      return;
    }
    
    const videoUrls = files.map(file => URL.createObjectURL(file));
    setEditForm(prev => ({
      ...prev,
      new_videos: [...prev.new_videos, ...files],
      preview_videos: [...prev.preview_videos, ...videoUrls]
    }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        toast.error(`Only ZIP files allowed. Skipping: ${file.name}`);
        return false;
      }
      return true;
    });
    
    setEditForm(prev => ({
      ...prev,
      new_files: [...prev.new_files, ...validFiles]
    }));
  };

  const removeExistingImage = (index) => {
    setEditForm(prev => ({
      ...prev,
      existing_images: prev.existing_images.filter((_, i) => i !== index)
    }));
  };

  const removeExistingFile = (index) => {
    setEditForm(prev => ({
      ...prev,
      existing_files: prev.existing_files.filter((_, i) => i !== index)
    }));
  };

  const removeNewImage = (index) => {
    setEditForm(prev => ({
      ...prev,
      new_images: prev.new_images.filter((_, i) => i !== index),
      preview_images: prev.preview_images.filter((_, i) => i !== index)
    }));
  };

  const removeExistingVideo = (index) => {
    setEditForm(prev => ({
      ...prev,
      existing_videos: prev.existing_videos.filter((_, i) => i !== index)
    }));
  };

  const removeNewVideo = (index) => {
    setEditForm(prev => ({
      ...prev,
      new_videos: prev.new_videos.filter((_, i) => i !== index),
      preview_videos: prev.preview_videos.filter((_, i) => i !== index)
    }));
  };

  const removeNewFile = (index) => {
    setEditForm(prev => ({
      ...prev,
      new_files: prev.new_files.filter((_, i) => i !== index)
    }));
  };

  const handleTagInput = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newTag = e.target.value.trim();
      if (!editForm.tags.includes(newTag)) {
        setEditForm(prev => ({
          ...prev,
          tags: [...prev.tags, newTag]
        }));
      }
      e.target.value = '';
    }
  };

  const removeTag = (tagToRemove) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleArrayFieldInput = (field, index, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayField = (field) => {
    setEditForm(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (field, index) => {
    setEditForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

// Remove this block referencing 'product' outside of a map/callback.
// If you need to build mediaItems for each product, do it inside the map callback below.

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    
    if (!editForm.title || !editForm.description || !editForm.short_description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      // Create FormData for update
      const formData = new FormData();
      formData.append('title', editForm.title);
      formData.append('description', editForm.description);
      formData.append('short_description', editForm.short_description);
      formData.append('category', editForm.category);
      formData.append('price', editForm.price.toString());
      if (editForm.original_price > 0) {
        formData.append('original_price', editForm.original_price.toString());
      }
      formData.append('tags', JSON.stringify(editForm.tags));
      formData.append('version', editForm.version);
      formData.append('license_type', editForm.license_type);
      formData.append('requirements', JSON.stringify(editForm.requirements));
      formData.append('features', JSON.stringify(editForm.features));
      formData.append('use_cases', JSON.stringify(editForm.use_cases));

      // Add new images
      editForm.new_images.forEach((image) => {
        formData.append('images', image);
      });

      // Add new videos
      editForm.new_videos.forEach((video) => {
        formData.append('videos', video);
      });

      // Add new files
      editForm.new_files.forEach((file) => {
        formData.append('files', file);
      });

      // Add existing media info (so backend knows what to keep)
      formData.append('keep_images', JSON.stringify(editForm.existing_images));
      formData.append('keep_videos', JSON.stringify(editForm.existing_videos));
      formData.append('keep_files', JSON.stringify(editForm.existing_files));

      // Make API call to update product
      const response = await updateProduct(selectedProduct._id, formData);
        
    // FIXED: Better response handling
      if (response && response.success) {
        toast.success('Product updated successfully!');
        closeEditModal();
        fetchProducts(); // Refresh the list
        fetchStats(); // Refresh stats too
      } else {
        const errorMessage = response?.message || response?.error || 'Failed to update product';
        toast.error(errorMessage);
        console.error('Update failed:', response);
    }
  } catch (error) {
    console.error('Update error:', error);
    toast.error('Error updating product: ' + error.message);
  } finally {
    setSubmitting(false);
  }
};

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads')) return `http://localhost:8000${imagePath}`;
    return `http://localhost:8000/uploads/${imagePath}`;
  };

  // Filter products based on search
  const filteredProducts = products.filter(product => {
  const searchLower = searchTerm.toLowerCase();
  return (
    (product.title && product.title.toLowerCase().includes(searchLower)) ||
    (product.category && product.category.toLowerCase().includes(searchLower)) ||
    (product.short_description && product.short_description.toLowerCase().includes(searchLower)) ||
    (product.description && product.description.toLowerCase().includes(searchLower))
  );
});

  const inputClasses = "w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">My Products</h2>
        <p className="text-gray-300">Manage your uploaded products and track their approval status</p>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-6 mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search products by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8L9 5l10 8" />
          </svg>
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            {searchTerm ? 'No products found' : 'No products uploaded yet'}
          </h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'Upload your first product to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
{filteredProducts.map((product) => {
  const isApproved = product.status === 'approved';
  const canEdit = !isApproved;
  const hasVideo = product.demo_video || product.demo_video_url || 
                  (product.videos && product.videos.length > 0);
  
 return (
    <div key={product._id} className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-6 hover:bg-gray-750 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4">
            {/* Product Image/Video Thumbnail - FIXED */}
            <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 relative">
              {product.images && product.images.length > 0 ? (
                <>
                  <img
                    src={getImageUrl(product.images[0])}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-500 text-xs">No Image</div>';
                    }}
                  />
                  {/* FIXED: Video overlay indicator if video exists */}
                  {hasVideo && (
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  )}
                </>
              ) : (
                // No image - check if video exists
                hasVideo ? (
                  // Show video thumbnail
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                ) : (
                  // No media at all
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                    No Media
                  </div>
                )
              )}
  </div>
  {/* Product Info */}
  <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-100 mb-1">
                {product.title}
              </h3>
              <p className="text-gray-400 text-sm mb-2 line-clamp-1">
                {product.short_description || product.description}
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Price: <span className="text-blue-400 font-medium">${product.price}</span></span>
                <span>Category: {product.category}</span>
                <span>Views: {product.view_count || 0}</span>
                <span>Sales: {product.sales_count || 0}</span>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex-shrink-0">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                product.status === 'pending' ? 'bg-yellow-900 bg-opacity-50 text-yellow-300 border border-yellow-700' :
                product.status === 'approved' ? 'bg-green-900 bg-opacity-50 text-green-300 border border-green-700' :
                product.status === 'rejected' ? 'bg-red-900 bg-opacity-50 text-red-300 border border-red-700' :
                'bg-gray-700 text-gray-300 border border-gray-600'
              }`}>
                {product.status?.charAt(0).toUpperCase() + product.status?.slice(1)}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 flex-shrink-0">
               {/* View Button - Only for approved products */}
  {product.status === 'approved' ? (
    <button
      onClick={() => handleViewProduct(product._id, product.status)}
      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm font-medium flex items-center space-x-1"
      title="View Product on Website"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      <span>View Live</span>
    </button>
  ) : (
    <div className="text-gray-500 text-sm px-4 py-2 bg-gray-700 rounded-lg flex items-center space-x-1">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L4.665 4.665m0 0L1.5 1.5m3.165 3.165a11.25 11.25 0 018.67 0l-3.165-3.165z" />
      </svg>
      <span>Pending Approval</span>
    </div>
  )}

  {canEdit ? (
    <>
      <button
        onClick={() => handleEdit(product)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium flex items-center space-x-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span>Edit</span>
      </button>
      <button
        onClick={() => handleDelete(product._id, product.title)}
        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm font-medium flex items-center space-x-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>Delete</span>
      </button>
    </>
  ) : (
    <div className="text-gray-500 text-sm px-4 py-2 bg-gray-700 rounded-lg">
      ✅ Approved - No editing allowed
    </div>
  )}
</div>       </div>
          {/* Admin Feedback */}
          {product.status === 'rejected' && product.rejection_reason && (
            <div className="mt-4 p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg">
              <p className="text-sm text-red-300">
                <strong>Admin Feedback:</strong> {product.rejection_reason}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
})}
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-gray-900 border border-gray-700 rounded-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-blue-400">Edit Product: {selectedProduct.title}</h3>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-gray-200 transition-colors duration-300 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleSaveChanges} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-400 mb-2">Title *</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      className={inputClasses}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-400 mb-2">Category *</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                      className={inputClasses}
                      required
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-400 mb-2">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.price}
                      onChange={(e) => setEditForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className={inputClasses}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-400 mb-2">Original Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.original_price}
                      onChange={(e) => setEditForm(prev => ({ ...prev, original_price: parseFloat(e.target.value) || 0 }))}
                      className={inputClasses}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-400 mb-2">Version</label>
                    <input
                      type="text"
                      value={editForm.version}
                      onChange={(e) => setEditForm(prev => ({ ...prev, version: e.target.value }))}
                      className={inputClasses}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-400 mb-2">License Type</label>
                    <select
                      value={editForm.license_type}
                      onChange={(e) => setEditForm(prev => ({ ...prev, license_type: e.target.value }))}
                      className={inputClasses}
                    >
                      {licenseTypes.map((license) => (
                        <option key={license.value} value={license.value}>{license.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Descriptions */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Short Description *</label>
                  <textarea
                    rows={3}
                    value={editForm.short_description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, short_description: e.target.value }))}
                    className={inputClasses}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Full Description *</label>
                  <textarea
                    rows={6}
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className={inputClasses}
                    required
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Tags</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Press Enter to add tags"
                      onKeyDown={handleTagInput}
                      className={inputClasses}
                    />
                    <div className="flex flex-wrap gap-2">
                      {editForm.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 bg-blue-900 bg-opacity-50 text-blue-300 rounded-full text-sm border border-blue-700">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-blue-400 hover:text-blue-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Features</label>
                  <div className="space-y-2">
                    {editForm.features.map((feature, index) => (
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
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayField('features')}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      + Add Feature
                    </button>
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Requirements</label>
                  <div className="space-y-2">
                    {editForm.requirements.map((requirement, index) => (
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
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayField('requirements')}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      + Add Requirement
                    </button>
                  </div>
                </div>

                {/* Use Cases */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Use Cases</label>
                  <div className="space-y-2">
                    {editForm.use_cases.map((useCase, index) => (
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
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayField('use_cases')}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      + Add Use Case
                    </button>
                  </div>
                </div>

                {/* Existing Images */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Current Images</label>
                  {editForm.existing_images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      {editForm.existing_images.map((imageUrl, index) => (
                        <div key={index} className="relative">
                          <img
                            src={getImageUrl(imageUrl)}
                            alt={`Current ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentNode.innerHTML = '<div class="w-full h-24 bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 text-xs">Failed to load</div>';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm mb-4">No existing images</p>
                  )}
                </div>

                {/* New Images Upload */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Add New Images (Max 5 total)</label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 hover:border-blue-400 transition-all duration-300">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="mb-2 text-sm text-gray-300">
                            <span className="font-semibold">Click to upload new images</span>
                          </p>
                          <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB each</p>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {editForm.preview_images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {editForm.preview_images.map((url, index) => (
                          <div key={index} className="relative">
                            <img
                              src={url}
                              alt={`New ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeNewImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Existing Videos */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Current Videos</label>
                  {editForm.existing_videos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {editForm.existing_videos.map((videoUrl, index) => (
                        <div key={index} className="relative">
                          <video
                            src={getImageUrl(videoUrl)}
                            className="w-full h-32 object-cover rounded-lg"
                            controls
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingVideo(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm mb-4">No existing videos</p>
                  )}
                </div>

                {/* New Videos Upload */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Add New Videos (Max 2 total)</label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 hover:border-blue-400 transition-all duration-300">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <p className="mb-2 text-sm text-gray-300">
                            <span className="font-semibold">Click to upload new videos</span>
                          </p>
                          <p className="text-xs text-gray-400">MP4, MOV, AVI up to 100MB each</p>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="video/*"
                          onChange={handleVideoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {editForm.preview_videos.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {editForm.preview_videos.map((url, index) => (
                          <div key={index} className="relative">
                            <video
                              src={url}
                              className="w-full h-32 object-cover rounded-lg"
                              controls
                            />
                            <button
                              type="button"
                              onClick={() => removeNewVideo(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Existing Files */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Current Files</label>
                  {editForm.existing_files.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {editForm.existing_files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-800 border border-gray-700 p-2 rounded">
                          <div className="flex items-center space-x-2">
                            <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm text-gray-200">{file.filename || 'Unknown file'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExistingFile(index)}
                            className="text-red-400 hover:text-red-300 text-lg"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm mb-4">No existing files</p>
                  )}
                </div>

                {/* New Files Upload */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Add New Files (ZIP only)</label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 hover:border-blue-400 transition-all duration-300">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="mb-2 text-sm text-gray-300">
                            <span className="font-semibold">Click to upload new ZIP files</span>
                          </p>
                          <p className="text-xs text-gray-400">ZIP files only</p>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept=".zip"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {editForm.new_files.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-blue-400">New Files:</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {editForm.new_files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-800 border border-gray-700 p-2 rounded">
                              <div className="flex items-center space-x-2">
                                <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm text-gray-200 truncate">{file.name}</span>
                                <span className="text-xs text-gray-400">({formatFileSize(file.size)})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeNewFile(index)}
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
                
                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-6 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 transition-all duration-300"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 font-medium disabled:opacity-50"
                  >
                    {submitting ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


  const inputClasses = "w-full px-3 sm:px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm";
  const selectClasses = "w-full px-3 sm:px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm";

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }
 const DashboardContent = ({ stats, loading, fetchStats }) => {
  return (
    <div className="space-y-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Seller Dashboard</h2>
          <p className="text-gray-300">Overview of your products and sales performance</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Last updated</p>
          <p className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</p>
          <div className="flex items-center mt-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
            <span className="text-xs text-green-400">Live</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Products" value={stats?.total_products || 0} icon="📦" color="blue" />
<StatCard title="Pending Approval" value={stats?.pending || 0} icon="⏳" color="yellow" />
<StatCard title="Approved Products" value={stats?.approved || 0} icon="✅" color="green" />
<StatCard title="Rejected Products" value={stats?.rejected || 0} icon="❌" color="red" />
<StatCard title="Total Revenue" value={`$${(stats?.total_revenue || 0).toFixed(2)}`} icon="💰" color="green" />
<StatCard title="Total Sales" value={stats?.total_sales || 0} icon="🛒" color="purple" />
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📤</span>
            <span>Upload New Product</span>
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📋</span>
            <span>Manage Products</span>
          </button>
          <button
            onClick={fetchStats}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
          >
            <span>🔄</span>
            <span>Refresh Stats</span>
          </button>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation Tabs */}
      <div className="bg-gray-900 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
              >
                + Add Product
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="bg-gray-700 text-gray-200 px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-600 hover:text-white transition-colors duration-200 text-sm font-medium flex items-center space-x-2"
              >
                <span>🏠</span>
                <span>Return to Nozama.ai</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardContent stats={stats} loading={loading} fetchStats={fetchStats} />}
        {activeTab === 'products' && <CompleteProductManager />}
      </div>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-blue-400">Create New Product</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetProductForm();
                  }}
                  className="text-gray-400 hover:text-gray-200 transition-colors duration-300 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleCreateProduct} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-400 mb-2">Title *</label>
                    <input
                      type="text"
                      value={productForm.title}
                      onChange={(e) => setProductForm(prev => ({ ...prev, title: e.target.value }))}
                      className={inputClasses}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-400 mb-2">Category *</label>
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
                    <label className="block text-sm font-medium text-blue-400 mb-2">Price *</label>
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
                    <label className="block text-sm font-medium text-blue-400 mb-2">Original Price</label>
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
                    <label className="block text-sm font-medium text-blue-400 mb-2">Version</label>
                    <input
                      type="text"
                      value={productForm.version}
                      onChange={(e) => setProductForm(prev => ({ ...prev, version: e.target.value }))}
                      className={inputClasses}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-400 mb-2">License Type</label>
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
                
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Short Description *</label>
                  <textarea
                    rows={3}
                    value={productForm.short_description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, short_description: e.target.value }))}
                    className={inputClasses}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Full Description *</label>
                  <textarea
                    rows={6}
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    className={inputClasses}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Tags</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Press Enter to add tags"
                      onKeyDown={handleTagInput}
                      className={inputClasses}
                    />
                    <div className="flex flex-wrap gap-2">
                      {productForm.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 bg-blue-900 bg-opacity-50 text-blue-300 rounded-full text-sm border border-blue-700">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-blue-400 hover:text-blue-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Features</label>
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
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayField('features')}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      + Add Feature
                    </button>
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Requirements</label>
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
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayField('requirements')}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      + Add Requirement
                    </button>
                  </div>
                </div>

                {/* Use Cases */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">Use Cases</label>
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
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayField('use_cases')}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      + Add Use Case
                    </button>
                  </div>
                </div>

                {/* Product Images */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">
                    Product Images (Max 5)
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 hover:border-blue-400 transition-all duration-300">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="mb-2 text-sm text-gray-300">
                            <span className="font-semibold">Click to upload images</span>
                          </p>
                          <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB each</p>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {productForm.previewImages.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {productForm.previewImages.map((url, index) => (
                          <div key={index} className="relative">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Videos */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">
                    Product Videos (Max 2)
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 hover:border-blue-400 transition-all duration-300">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <p className="mb-2 text-sm text-gray-300">
                            <span className="font-semibold">Click to upload videos</span>
                          </p>
                          <p className="text-xs text-gray-400">MP4, MOV, AVI up to 100MB each</p>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="video/*"
                          onChange={handleVideoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {productForm.previewVideos.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {productForm.previewVideos.map((url, index) => (
                          <div key={index} className="relative">
                            <video
                              src={url}
                              className="w-full h-32 object-cover rounded-lg"
                              controls
                            />
                            <button
                              type="button"
                              onClick={() => removeVideo(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">
                    Product Files (ZIP only)
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 hover:border-blue-400 transition-all duration-300">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="mb-2 text-sm text-gray-300">
                            <span className="font-semibold">Click to upload</span> ZIP files
                          </p>
                          <p className="text-xs text-gray-400">ZIP files only (no size limit)</p>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept=".zip"
                          onChange={handleFileSelection}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-blue-400">Selected Files:</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-800 border border-gray-700 p-2 rounded">
                              <div className="flex items-center space-x-2">
                                <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm text-gray-200 truncate">{file.name}</span>
                                <span className="text-xs text-gray-400">({formatFileSize(file.size)})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSelectedFile(index)}
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
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 font-medium disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Product'}
                  </button>
                </div>
              </form>
              
            </div>
            
          </div>
       
        </div>
        
      )}
        
      
    {/* // Add this POPUP COMPONENT code right before the closing }; and export default Seller; */}

  {/* Payment Information Popup - Add this RIGHT BEFORE the last closing div */}
  {showPaymentPopup && (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Important Payment Information</h2>
                <p className="text-blue-100 text-sm">Please read carefully - Required for all sellers</p>
              </div>
            </div>
            <button
              onClick={() => setShowPaymentPopup(false)}
              className="text-white hover:text-gray-200 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Welcome Message */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-blue-900 font-semibold">Welcome to Nozama.ai Seller Dashboard!</h3>
                <p className="text-blue-800 text-sm mt-1">
                  Thank you for joining our AI marketplace. Here's everything you need to know about payments and earnings.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-green-100 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-white">Payment Schedule</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <p className="text-gray-200 font-medium">Customer Purchase</p>
                  <p className="text-gray-400 text-sm">When someone buys your product, payment is processed instantly</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <p className="text-gray-200 font-medium">15-Day Hold Period</p>
                  <p className="text-gray-400 text-sm">Your earnings are held for 15 days to ensure product quality and handle any issues</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <div>
                  <p className="text-gray-200 font-medium">Payment Released</p>
                  <p className="text-gray-400 text-sm">After 15 days, your earnings are transferred to your bank account</p>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Fee */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-yellow-900">Platform Fee Structure</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-white border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-yellow-900 font-medium">Platform Commission</span>
                  <span className="text-xl font-bold text-yellow-600">10%</span>
                </div>
                <p className="text-yellow-800 text-sm">
                  We deduct 10% from each sale to cover platform maintenance, payment processing, hosting, and customer support.
                </p>
              </div>
              <div className="bg-green-100 border border-green-200 rounded-lg p-4">
                <h4 className="text-green-900 font-medium mb-2">What You Get:</h4>
                <ul className="text-green-800 text-sm space-y-1">
                  <li>• Global marketplace exposure</li>
                  <li>• Secure payment processing</li>
                  <li>• Customer support handling</li>
                  <li>• Marketing and promotion</li>
                  <li>• Analytics and reporting tools</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Example Calculation */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Payment Example</h3>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-gray-400 text-sm">Product Price</p>
                  <p className="text-2xl font-bold text-green-400">$100</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Platform Fee (10%)</p>
                  <p className="text-2xl font-bold text-red-400">-$10</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Your Earnings</p>
                  <p className="text-2xl font-bold text-blue-400">$90</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details Reminder */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex items-start space-x-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <CreditCard className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">Action Required: Add Bank Details</h3>
                <p className="text-red-800 mb-3">
                  To receive your earnings, you must add your bank account details in your account settings.
                </p>
                <div className="space-y-2">
                  <p className="text-red-700 text-sm font-medium">Required Information:</p>
                  <ul className="text-red-700 text-sm space-y-1 ml-4">
                    <li>• Bank Account Number</li>
                    <li>• Bank Routing Number</li>
                    <li>• Account Holder Name</li>
                    <li>• Bank Address</li>
                  </ul>
                </div>
                <button className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                  Go to Account Settings
                </button>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Important Notes</h3>
            <div className="space-y-3 text-gray-300 text-sm">
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                <p>Payments are processed on business days only (Monday-Friday)</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                <p>International transfers may take 3-5 additional business days</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                <p>You'll receive email notifications for all transactions and payouts</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                <p>Refunds (if any) will be deducted from your next payout</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-800 border-t border-gray-700 p-6 rounded-b-xl">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={() => setShowPaymentPopup(false)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              I Understand
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Click "I Understand" to close this message and continue to your dashboard.
          </p>
        </div>
      </div>
    </div>
  )}
    </div>
  );
};

export default Seller;