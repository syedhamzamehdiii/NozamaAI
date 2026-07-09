import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PhotoIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { simpleAdminApi } from '../../services/SimpleAdminApi';
import SimpleAdminProductFormModal from './SimpleAdminProductFormModal';

const SimpleAdminProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');

  // API base URL - FIXED for file serving
  const API_BASE_URL = 'http://localhost:8000';
  const FILE_BASE_URL = `${API_BASE_URL}`; // Files served directly from backend

  // Get current simple admin user
  const currentUser = simpleAdminApi.getCurrentUser();

  console.log('🔍 SimpleAdminProductManagement state:', {
    products: products.length,
    loading,
    showCreateModal,
    currentUser: currentUser?.email,
    filter
  });

  // Helper function to get full file URL - FIXED
  const getFileUrl = (filePath) => {
    if (!filePath) return null;
    
    // If path already includes http, return as-is
    if (filePath.startsWith('http')) {
      return filePath;
    }
    
    // Remove leading slash if present and construct full URL
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const fullUrl = `${FILE_BASE_URL}/${cleanPath}`;
    
    console.log('🔗 File URL conversion:', { original: filePath, converted: fullUrl });
    return fullUrl;
  };

  // Fetch MY products only
  const fetchMyProducts = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📦 Fetching MY products as Simple Admin...');
      
      const params = {
        limit: 50,
        ...(filter !== 'all' && { status: filter })
      };
      
      const response = await simpleAdminApi.getMyProducts(params);
      
      if (response && response.products) {
        setProducts(response.products);
        setSuccess(`Loaded ${response.products.length} of your products`);
        console.log('✅ Products loaded:', response.products.length);
        
        // Debug: Log first product's image URLs
        if (response.products.length > 0) {
          const firstProduct = response.products[0];
          console.log('🖼️ First product images:', {
            raw: firstProduct.images,
            converted: firstProduct.images?.map(img => getFileUrl(img))
          });
        }
      } else if (response && Array.isArray(response)) {
        setProducts(response);
        setSuccess(`Loaded ${response.length} of your products`);
      } else {
        setProducts([]);
        setSuccess('No products found - create your first product!');
      }
      
    } catch (error) {
      console.error('❌ Error fetching my products:', error);
      setError(`Failed to load your products: ${error.message}`);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle create product button click
  const handleCreateProduct = () => {
    console.log('🆕 Create Product button clicked');
    setEditingProduct(null);
    setShowCreateModal(true);
  };

  // Handle edit product
  const handleEditProduct = (product) => {
    console.log('✏️ Edit Product clicked:', product.id);
    
    if (!canEditProduct(product)) {
      setError('You can only edit your own pending products');
      return;
    }
    
    setEditingProduct(product);
    setShowCreateModal(true);
  };

  // Check if product can be edited (only pending products by current user)
  const canEditProduct = (product) => {
    const canEdit = product.status === 'pending' && 
           product.created_by_simple_admin_id === currentUser?.id;
    console.log('🔍 Can edit product:', { productId: product.id, canEdit, status: product.status });
    return canEdit;
  };

  // Handle view product details - NEW FUNCTION
  const handleViewProduct = (product) => {
    console.log('👁️ Viewing product details:', product.id);
    
    // Create a detailed view modal or navigate to details page
    const productDetails = {
      id: product.id,
      title: product.title,
      description: product.description,
      short_description: product.short_description,
      category: product.category,
      price: product.price,
      original_price: product.original_price,
      status: product.status,
      images: product.images?.map(img => getFileUrl(img)) || [],
      demo_video: product.demo_video ? getFileUrl(product.demo_video) : null,
      files: product.files || [],
      tags: product.tags || [],
      features: product.features || [],
      requirements: product.requirements || [],
      use_cases: product.use_cases || [],
      created_at: product.created_at,
      rejection_reason: product.rejection_reason
    };

    // Show product details in an alert for now (can be improved with a modal)
    const detailsText = `
📋 PRODUCT DETAILS:

📌 Title: ${productDetails.title}
📂 Category: ${productDetails.category}
💰 Price: ${productDetails.price}
📊 Status: ${productDetails.status.toUpperCase()}
📅 Created: ${new Date(productDetails.created_at).toLocaleDateString()}

📝 Short Description:
${productDetails.short_description}

📖 Full Description:
${productDetails.description.substring(0, 200)}${productDetails.description.length > 200 ? '...' : ''}

📸 Images: ${productDetails.images.length} image(s)
🎥 Demo Video: ${productDetails.demo_video ? 'Yes' : 'No'}
📁 Files: ${productDetails.files.length} file(s)

🏷️ Tags: ${productDetails.tags.join(', ') || 'None'}

${productDetails.status === 'rejected' && productDetails.rejection_reason ? `❌ Rejection Reason: ${productDetails.rejection_reason}` : ''}
    `;

    alert(detailsText);
    
    // Alternative: Open in a new modal (implement this later)
    // setViewingProduct(productDetails);
    // setShowViewModal(true);
  };

  // Handle delete product
  const handleDeleteProduct = async (productId, product) => {
    // Check if this product belongs to current user
    if (product.created_by_simple_admin_id !== currentUser?.id) {
      setError('You can only delete your own products');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${product.title}"?`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting MY product:', productId);
      setError('Product deletion is restricted for Simple Admins. Contact Super Admin if needed.');
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      setError('Failed to delete product: ' + error.message);
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    console.log('🚪 Closing modal');
    setShowCreateModal(false);
    setEditingProduct(null);
  };

  // Handle modal success
  const handleModalSuccess = (response) => {
    console.log('✅ Modal success:', response);
    setSuccess(
      editingProduct 
        ? '✅ Product updated successfully and resubmitted for review!'
        : '✅ Product created successfully and submitted for review!'
    );
    fetchMyProducts(); // Refresh the list
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-900 bg-opacity-20 text-yellow-400 border-yellow-400',
      approved: 'bg-green-900 bg-opacity-20 text-green-400 border-green-400',
      rejected: 'bg-red-900 bg-opacity-20 text-red-400 border-red-400',
      draft: 'bg-gray-900 bg-opacity-20 text-gray-400 border-gray-400'
    };
    return badges[status] || badges.draft;
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'approved':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'rejected':
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return <InformationCircleIcon className="h-4 w-4" />;
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    if (filter === 'all') return true;
    return product.status === filter;
  });

  useEffect(() => {
    fetchMyProducts();
  }, [filter]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DAA425] mx-auto mb-4"></div>
              <p className="text-gray-400">Loading your products...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Create Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#DAA425]">My Products</h1>
            <p className="text-gray-300 mt-1">
              Manage your AI tools and products. Only you can see and edit these.
            </p>
          </div>
          
          <button 
            onClick={handleCreateProduct}
            className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-6 py-3 rounded-lg transition-all duration-300 font-medium flex items-center shadow-lg"
            style={{ minWidth: '200px' }}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add New Product
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-900 bg-opacity-20 border border-green-400 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-300">{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 bg-opacity-20 border border-red-400 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Products', count: products.length },
              { key: 'pending', label: 'Pending Review', count: products.filter(p => p.status === 'pending').length },
              { key: 'approved', label: 'Approved', count: products.filter(p => p.status === 'approved').length },
              { key: 'rejected', label: 'Rejected', count: products.filter(p => p.status === 'rejected').length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  filter === tab.key
                    ? 'bg-[#DAA425] text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-[#DAA425] transition-all duration-300">
                  {/* Product Image - FIXED VERSION */}
                  <div className="relative h-48 bg-gray-700">
                    {product.images && product.images.length > 0 ? (
                      <>
                        <img
                          src={getFileUrl(product.images[0])}
                          alt={product.title}
                          className="w-full h-full object-cover"
                          onLoad={() => console.log('✅ Image loaded successfully:', getFileUrl(product.images[0]))}
                          onError={(e) => {
                            console.error('❌ Image failed to load:', getFileUrl(product.images[0]));
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="w-full h-full hidden items-center justify-center text-gray-400 absolute top-0 left-0 bg-gray-700">
                          <div className="text-center">
                            <PhotoIcon className="h-16 w-16 mx-auto mb-2" />
                            <p className="text-xs">Image failed to load</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <PhotoIcon className="h-16 w-16 mx-auto mb-2" />
                          <p className="text-xs">No image</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Video Play Button Overlay */}
                    {product.demo_video && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-70 transition-all">
                          <PlayIcon className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(product.status)}`}>
                        {getStatusIcon(product.status)}
                        <span className="ml-1 capitalize">{product.status}</span>
                      </span>
                    </div>

                    {/* Image Count Badge */}
                    {product.images && product.images.length > 1 && (
                      <div className="absolute bottom-3 left-3">
                        <span className="bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                          +{product.images.length - 1} more
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-2 truncate" title={product.title}>
                      {product.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2" title={product.short_description}>
                      {product.short_description}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-[#DAA425] font-bold text-lg">${product.price}</span>
                        {product.original_price && product.original_price > product.price && (
                          <span className="text-xs text-gray-500 line-through">${product.original_price}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(product.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* File Info */}
                    <div className="flex items-center space-x-4 mb-3 text-xs text-gray-500">
                      {product.images && product.images.length > 0 && (
                        <span title={`${product.images.length} image(s)`}>
                          📸 {product.images.length}
                        </span>
                      )}
                      {product.demo_video && (
                        <span title="Has demo video">🎥 Video</span>
                      )}
                      {product.files && product.files.length > 0 && (
                        <span title={`${product.files.length} file(s)`}>
                          📁 {product.files.length}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        disabled={!canEditProduct(product)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center ${
                          canEditProduct(product)
                            ? 'bg-[#DAA425] hover:bg-[#DAA740] text-black'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                        title={canEditProduct(product) ? 'Edit Product' : 'Can only edit pending products'}
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      
                      <button
                        onClick={() => handleViewProduct(product)}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center"
                        title={`View details for ${product.title}`}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteProduct(product.id, product)}
                        className="px-3 py-2 bg-red-900 hover:bg-red-800 text-red-300 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center"
                        title="Delete Product"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Status Info */}
                    {product.status === 'rejected' && product.rejection_reason && (
                      <div className="mt-3 p-2 bg-red-900 bg-opacity-20 border border-red-400 rounded text-xs text-red-300">
                        <strong>Rejection Reason:</strong> {product.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <PhotoIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                {filter === 'all' ? 'No products yet' : `No ${filter} products`}
              </h3>
              <p className="text-gray-500 mb-4">
                {filter === 'all' 
                  ? 'Create your first AI tool to get started' 
                  : `You don't have any ${filter} products`}
              </p>
              {filter === 'all' && (
                <button
                  onClick={handleCreateProduct}
                  className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-6 py-2 rounded-lg transition-all duration-300 font-medium"
                >
                  Create Your First Product
                </button>
              )}
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <SimpleAdminProductFormModal 
            isOpen={showCreateModal}
            onClose={handleModalClose}
            onSuccess={handleModalSuccess}
            editingProduct={editingProduct}
          />
        )}
      </div>
    </div>
  );
};

export default SimpleAdminProductManagement;