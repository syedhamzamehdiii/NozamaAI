//pages/products.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  StarIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  Bars3Icon
} from '@heroicons/react/24/outline';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import { apiService } from '../services/Api';
import SimpleImage from '../components/SimpleImage';
import { productService } from '../services/Products';

const Products = () => {
  const [products, setProducts] = useState([]);
  const allProductsRef = useRef([]);
  const [allProducts, setAllProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState(['All Categories']);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const { addItem } = useCart();
  const { showSuccess, showError } = useNotification();

  const priceRanges = [
    { label: 'All Prices', min: 0, max: 10000 },
    { label: 'Under $100', min: 0, max: 99 },
    { label: '$100 - $200', min: 100, max: 200 },
    { label: '$200 - $300', min: 200, max: 300 },
    { label: '$300 - $400', min: 300, max: 400 },
    { label: 'Above $400', min: 400, max: 10000 }
  ];

  // CSS classes for consistent styling with dashboard color scheme
  const inputClasses = "w-full px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 text-sm";
  const selectClasses = "px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-300 text-sm";

  // Replace your existing transformProduct function (around line 52) with this fixed version:
  const transformProduct = (product) => {
    return {
      id: product._id || product.id,
      title: product.title || 'Untitled Product',
      description: product.description || '',
      short_description: product.short_description || product.description || '',
      price: Number(product.price) || 0,
      originalPrice: product.original_price ? Number(product.original_price) : null,
      rating: Number(product.rating) || 0,
      reviews: Number(product.rating_count) || 0,
      
      // SIMPLIFIED IMAGE HANDLING - Let SmartImage component handle it
      image: product.images?.[0] || null, // Just pass the raw data
      allImages: product.images || [], // Pass all images
      
      tags: Array.isArray(product.tags) ? product.tags : [],
      category: product.category || 'Uncategorized',
      seller: product.seller_name || product.seller_id || 'Unknown Seller',
      featured: Boolean(product.featured),
      downloads: Number(product.download_count) || 0,
      sales_count: Number(product.sales_count) || 0,
      view_count: Number(product.view_count) || 0,
      status: product.status || 'active',
      created_at: product.created_at,
      updated_at: product.updated_at,
      version: product.version || '1.0.0',
      license_type: product.license_type || 'unknown',
      requirements: Array.isArray(product.requirements) ? product.requirements : [],
      features: Array.isArray(product.features) ? product.features : [],
      use_cases: Array.isArray(product.use_cases) ? product.use_cases : [],
      files: Array.isArray(product.files) ? product.files : [],
      demo_video: product.demo_video || null
    };
  };

  // Replace your existing applyClientSideFilters function with this simple one:
  const applyClientSideFilters = (productsToFilter) => {
    let filtered = [...productsToFilter];
    
    // ONLY Search filter - same as Seller dashboard
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product => 
        (product.title && product.title.toLowerCase().includes(searchLower)) ||
        (product.description && product.description.toLowerCase().includes(searchLower)) ||
        (product.short_description && product.short_description.toLowerCase().includes(searchLower)) ||
        (product.tags && product.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
        (product.category && product.category.toLowerCase().includes(searchLower)) ||
        (product.seller && product.seller.toLowerCase().includes(searchLower))
      );
    }
    
    // Keep all other filters as they were
    if (selectedCategory && selectedCategory !== 'all' && selectedCategory !== 'All Categories') {
      filtered = filtered.filter(product => 
        product.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    if (priceRange[0] > 0 || priceRange[1] < 10000) {
      filtered = filtered.filter(product => 
        product.price >= priceRange[0] && product.price <= priceRange[1]
      );
    }
    
    filtered.sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];
      
      if (sortBy === 'created_at') {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      }
      
      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    return filtered;
  };
// Add this test function inside your Products component
const testDirectAPI = async () => {
  try {
    const testUrl = 'http://localhost:8000/api/v1/products/?search=test&limit=5';
    console.log('🧪 Testing URL:', testUrl);
    const response = await fetch(testUrl);
    const data = await response.json();
    console.log('🧪 Direct API result:', data);
  } catch (error) {
    console.error('🧪 Direct API test failed:', error);
  }
};

 const fetchProducts = useCallback(async (page = 1, useClientSideFiltering = false) => {
  try {
    setLoading(true);
    setError(null);

    // If using client-side filtering, just filter existing products
    if (useClientSideFiltering && allProducts.length > 0) {
      console.log('🔄 Using client-side filtering');
      const filtered = applyClientSideFilters(allProducts);
      console.log('📊 Client-side filtered results:', filtered.length);
      setProducts(filtered);
      setTotalProducts(filtered.length);
      setTotalPages(Math.ceil(filtered.length / 20));
      setLoading(false);
      return;
    }
    
    // Build query parameters for server-side filtering
    const params = {
      page: page,
      limit: 20,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    
    // Add filters
    if (searchTerm && searchTerm.trim() !== '') {
      params.search = searchTerm.trim();
      console.log('🔍 Adding search param:', params.search);
    }

// FIX: Category filtering
if (selectedCategory && selectedCategory !== 'all' && selectedCategory !== 'All Categories') {
  params.category = selectedCategory;
  }

// FIX: Price filtering  
if (priceRange[0] > 0) {
  params.min_price = priceRange[0];
  }

if (priceRange[1] < 10000) {
  params.max_price = priceRange[1];
  }
    // Test connection first
    const connectionTest = await apiService.testConnection();
    console.log('🔗 Connection test result:', connectionTest);
    
    if (!connectionTest.success) {
      throw new Error(`Cannot connect to API server: ${connectionTest.message}`);
    }

    // Make the API call with debug logging
    const response = await productService.getProducts(params);
    
// Handle response - SIMPLIFIED
let productsData = [];
let paginationData = {};

if (response && response.products) {
  // Direct response from ProductService
  productsData = response.products;
  paginationData = {
    page: response.page || page,
    total: response.total || 0,
    limit: response.limit || 20,
    has_next: response.has_next || false,
    has_prev: response.has_prev || false
  };
} else if (response && response.data && response.data.products) {
  // Wrapped response
  productsData = response.data.products;
  paginationData = {
    page: response.data.page || page,
    total: response.data.total || 0,
    limit: response.data.limit || 20,
    has_next: response.data.has_next || false,
    has_prev: response.data.has_prev || false
  };
}
    console.log('🔍 Search params sent:', params);
    console.log('📦 Products received:', productsData.length);
    console.log('📊 First product (if any):', productsData[0]);

    // Transform products
    const transformedProducts = productsData.map(transformProduct);
    console.log('✨ Transformed products:', transformedProducts.length);
    
    // Filter by status
    const activeProducts = transformedProducts.filter(product => 
      product.status === 'approved' || product.status === 'active'
    );
    console.log('✅ Active products after status filter:', activeProducts.length);

    // Store all products for client-side filtering fallback
    if (page === 1 && Object.keys(params).length <= 4) {
      setAllProducts(activeProducts);
      console.log('💾 Stored all products for client-side filtering:', activeProducts.length);
    }

    setProducts(activeProducts);
    setCurrentPage(paginationData.page);
    setTotalProducts(paginationData.total);
    setTotalPages(Math.ceil(paginationData.total / paginationData.limit));
    setHasNext(paginationData.has_next);
    setHasPrev(paginationData.has_prev);
    
    console.log('📊 Final state set - products:', activeProducts.length, 'total:', paginationData.total);
    
  } catch (err) {
    console.error('❌ Error in fetchProducts:', err);
    console.error('❌ Full error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    
    // Try client-side filtering as fallback
    if (allProducts.length > 0) {
      console.log('🔄 Using client-side filtering as fallback');
      const filtered = applyClientSideFilters(allProducts);
      setProducts(filtered);
      setTotalProducts(filtered.length);
    } else {
      let errorMessage = 'Failed to load products';
      
      if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to server. Please check if the backend is running on http://localhost:8000';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setProducts([]);
      setTotalProducts(0);
    }
  } finally {
    setLoading(false);
  }
}, [searchTerm, selectedCategory, sortBy, sortOrder]);

// Add this function after the fetchProducts function
const fetchCategories = useCallback(async () => {
  try {
    const response = await productService.getCategories();
    if (response && response.success && response.data && response.data.categories) {
      const categoryNames = response.data.categories.map(cat => cat.name);
      setCategories(['All Categories', ...categoryNames]);
    }
  } catch (error) {
    console.error('Failed to fetch categories:', error);
  }
}, []);

// Add this useEffect to load categories on mount
useEffect(() => {
  fetchCategories();
}, [fetchCategories]);
  
    // Add this useEffect to handle URL search params
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get('search');
  if (searchParam) {
    setSearchTerm(searchParam);
  }
}, []);

  // Add this before your useEffect (around line 340)


// Filter change effect - FIXED VERSION
  // Replace your existing filter change useEffect with this:
  useEffect(() => {
    if (error) return;
  
    const timeoutId = setTimeout(async () => {
      setCurrentPage(1);
      
      // For search - use immediate client-side filtering like Seller dashboard
      if (searchTerm && searchTerm.trim() !== '' && allProducts.length > 0) {
      const filtered = applyClientSideFilters(allProducts);
        setProducts(filtered);
        setTotalProducts(filtered.length);
        setTotalPages(Math.ceil(filtered.length / 20));
        return;
      }
      
      // For other filters, use server-side
      try {
        await fetchProducts(1, false);
      } catch (err) {
        await fetchProducts(1, true);
      }
    }, 300); // Faster response like Seller dashboard

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory, sortBy, sortOrder, priceRange[0], priceRange[1], fetchProducts]);

useEffect(() => {
  fetchProducts(1);
}, []);
  
  const handleCategoryChange = (category) => {
    const newCategory = category === 'All Categories' ? 'all' : category;
    setSelectedCategory(newCategory);
  };

  const handlePriceRangeChange = (min, max) => {
    console.log('💰 Price range changed:', min, max);
    setPriceRange([min, max]);
    setCurrentPage(1);
  };

  // Replace your existing handleSearchChange with this simple one:
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      fetchProducts(page);
    }
  };

  // In your Products.jsx component, update the handleAddToCart function:
  const handleAddToCart = async (product) => {
    try {
      console.log('🛒 Adding product to cart:', product);
      
      // Ensure product has the correct structure for the cart
      const cartProduct = {
        id: product.id || product._id,
        title: product.title,
        price: parseFloat(product.price) || 0,
        originalPrice: product.originalPrice || product.original_price,
        image: product.image || (product.images && product.images[0]) || null,
        description: product.description || product.short_description || '',
        seller: product.seller || product.seller_name || 'Unknown Seller',
        category: product.category || 'Uncategorized',
        status: product.status || 'approved',
        featured: product.featured || false,
        license: product.license_type || 'Standard'
      };

      console.log('🛒 Processed cart product:', cartProduct);

      const result = addItem(cartProduct);
      
      if (result && result.success !== false) {
        showSuccess('Added to Cart', `${product.title} has been added to your cart.`);
        console.log('✅ Product added successfully');
      } else {
        throw new Error(result?.error || 'Failed to add to cart');
      }
      
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      showError('Error', 'Failed to add product to cart. Please try again.');
    }
  };

  // Also update your handleImageError function (around line 344) to be more robust:
  const handleImageError = (e) => {
    // Try a few fallback options
    const fallbacks = [
      '/placeholder-image.jpg',
      '/images/placeholder.jpg',
      '/assets/placeholder.jpg',
      'https://via.placeholder.com/300x200/f3f4f6/4f46e5?text=AI+Tool'
    ];
    
    const currentSrc = e.target.src;
    const currentFallbackIndex = fallbacks.indexOf(currentSrc);
    
    if (currentFallbackIndex < fallbacks.length - 1) {
      e.target.src = fallbacks[currentFallbackIndex + 1];
    } else {
      // If all fallbacks fail, show a CSS-based placeholder
      e.target.style.display = 'none';
      const placeholder = document.createElement('div');
      placeholder.className = 'w-full h-48 bg-gray-100 flex items-center justify-center text-gray-500';
      placeholder.innerHTML = '<span>No Image</span>';
      e.target.parentNode.insertBefore(placeholder, e.target);
    }
    
    e.target.onerror = null; // Prevent infinite loop
  };

  const handleRetry = () => {
    setError(null);
    fetchProducts(currentPage);
  };

  // Replace your existing handleClearFilters:
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setPriceRange([0, 10000]);
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
    
    // Immediately show all products like Seller dashboard
    if (allProducts.length > 0) {
      setProducts(allProducts);
      setTotalProducts(allProducts.length);
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm && searchTerm.trim() !== '') count++;
    if (selectedCategory && selectedCategory !== 'all' && selectedCategory !== 'All Categories') count++;
    if (priceRange[0] > 0 || priceRange[1] < 10000) count++;
    return count;
  };

  // Loading state
  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-900">Loading products...</p>
          <p className="text-sm text-gray-600 mt-2">Connecting to backend...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-600 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-600 mb-2">Connection Error</h3>
          <p className="text-gray-700 mb-6 text-sm">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Tools Marketplace</h1>
          <p className="text-gray-600">Discover and purchase cutting-edge AI tools and datasets</p>
        </div>

        {/* ENHANCED Search and Filters Section */}
        <div className="bg-white border border-gray-200 rounded-lg shadow p-4 sm:p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
            {/* Search - Replace your existing search input with this */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, description, tags, category, or seller..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputClasses} pl-8 sm:pl-10`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex gap-2 sm:gap-3 lg:gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-blue-600 text-gray-700 transition-all duration-300 text-sm"
              >
                <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">More</span>
                {getActiveFiltersCount() > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>

              {/* View Mode */}
              <div className="flex border border-blue-600 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 rounded-l-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <Squares2X2Icon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 rounded-r-lg transition-colors ${
                    viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <Bars3Icon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Price Range</label>
                  <div className="space-y-2">
                    {priceRanges.map((range, index) => (
                      <label key={index} className="flex items-center">
                        <input
                          type="radio"
                          name="priceRange"
                          value={`${range.min}-${range.max}`}
                          checked={priceRange[0] === range.min && priceRange[1] === range.max}
                          onChange={() => handlePriceRangeChange(range.min, range.max)}
                          className="mr-2 accent-blue-600"
                        />
                        <span className="text-sm text-gray-700">{range.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Current Filters Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Active Filters</label>
                  <div className="space-y-1 text-sm">
                    {searchTerm && searchTerm.trim() !== '' && (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                        <span className="text-gray-900">Search: "{searchTerm}"</span>
                        <button 
                          onClick={() => handleSearchChange('')} 
                          className="text-blue-600 hover:text-blue-700 ml-2"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    {selectedCategory !== 'all' && selectedCategory !== 'All Categories' && (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                        <span className="text-gray-900">Category: {selectedCategory}</span>
                        <button 
                          onClick={() => handleCategoryChange('All Categories')} 
                          className="text-blue-600 hover:text-blue-700 ml-2"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    {(priceRange[0] > 0 || priceRange[1] < 10000) && (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                        <span className="text-gray-900">Price: ${priceRange[0]} - ${priceRange[1]}</span>
                        <button 
                          onClick={() => handlePriceRangeChange(0, 10000)} 
                          className="text-blue-600 hover:text-blue-700 ml-2"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    {getActiveFiltersCount() === 0 && (
                      <div className="text-gray-500 italic">No active filters</div>
                    )}
                  </div>
                </div>

                {/* Clear Filters */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Actions</label>
                  <button
                    onClick={handleClearFilters}
                    disabled={getActiveFiltersCount() === 0}
                    className="w-full px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading indicator for filter changes */}
        {loading && products.length > 0 && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-lg shadow">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
              Updating results...
            </div>
          </div>
        )}

        {/* Results Count - Replace this section */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-700">
            Showing {products.length} products 
            {totalProducts > 0 && ` (${totalProducts} total)`}
            {searchTerm && searchTerm.trim() !== '' && ` matching "${searchTerm}"`}
          </p>
          {totalPages > 1 && (
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </p>
          )}
        </div>

        {/* Products Grid - WIDER VERSION */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 auto-rows-fr">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="bg-white border border-gray-200 rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full"
              >
                {product.featured && (
                  <div className="bg-blue-600 text-white text-xs px-2 py-1 absolute z-10 rounded-br-lg font-medium">
                    Featured
                  </div>
                )}
                
                {/* Image Section - TALLER HEIGHT for wider cards */}
                <div className="relative h-56 flex-shrink-0">
                  <SimpleImage 
                    src={product.image || '/placeholder-image.jpg'} 
                    alt={product.title}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                  {product.originalPrice && product.originalPrice > product.price && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </div>
                  )}
                </div>
                
                {/* Content Section - MORE PADDING */}
                <div className="p-8 flex flex-col flex-grow">
                  {/* Rating Section - LARGER TEXT */}
                  <div className="flex items-center mb-3 h-6">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon 
                          key={i} 
                          className={`h-5 w-5 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <span className="ml-2 text-base text-gray-600">
                      ({product.rating.toFixed(1)}) • {product.reviews} reviews
                    </span>
                  </div>
                  
                  {/* Title Section - LARGER HEIGHT AND TEXT */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 h-16 line-clamp-2 overflow-hidden leading-8">
                    {product.title}
                  </h3>
                  
                  {/* Description Section - MORE HEIGHT */}
                  <p className="text-gray-600 text-base mb-4 h-16 line-clamp-3 overflow-hidden leading-5">
                    {product.short_description || product.description}
                  </p>
                  
                  {/* Tags Section - BIGGER TAGS */}
                  <div className="flex flex-wrap gap-2 mb-4 h-10 overflow-hidden">
                    {product.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full whitespace-nowrap">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  {/* Spacer to push buttons to bottom */}
                  <div className="flex-grow"></div>
                  
                  {/* Price and Downloads Section - LARGER TEXT */}
                  <div className="flex items-center justify-between mb-6 h-8">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">${product.price}</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="ml-2 text-base text-gray-500 line-through">${product.originalPrice}</span>
                      )}
                    </div>
                    <span className="text-base text-gray-500">{product.downloads} downloads</span>
                  </div>
                  
                  {/* Buttons Section - LARGER BUTTONS */}
                  <div className="flex gap-3 h-12">
                    <Link 
                      to={`/products/${product.id}`}
                      className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors text-center flex items-center justify-center text-base font-medium"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="px-4 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center"
                      title="Add to Cart"
                    >
                      <ShoppingCartIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List view with wider layout
          <div className="space-y-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white border border-gray-200 rounded-lg shadow p-8 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-8">
                  <SimpleImage 
                    src={product.image || '/placeholder-image.jpg'} 
                    alt={product.title}
                    className="w-40 h-32 object-cover rounded-lg flex-shrink-0"
                    onError={handleImageError}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-6">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-2xl font-semibold text-gray-900">{product.title}</h3>
                          {product.featured && (
                            <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">Featured</span>
                          )}
                        </div>
                        
                        <div className="flex items-center mb-3">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <StarIcon 
                                key={i} 
                                className={`h-5 w-5 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                          <span className="ml-2 text-base text-gray-600">
                            ({product.rating.toFixed(1)}) • {product.reviews} reviews
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-4 text-base leading-6">{product.short_description || product.description}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          {product.tags.map((tag, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        <p className="text-base text-gray-500">by {product.seller} • {product.downloads} downloads</p>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <div className="mb-4">
                          <span className="text-3xl font-bold text-gray-900">${product.price}</span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="block text-base text-gray-500 line-through">${product.originalPrice}</span>
                          )}
                        </div>
                        
                        <div className="flex gap-3">
                          <Link 
                            to={`/products/${product.id}`}
                            className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors text-base font-medium"
                          >
                            View Details
                          </Link>
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="px-4 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                            title="Add to Cart"
                          >
                            <ShoppingCartIcon className="h-6 w-6" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center mt-8 space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!hasPrev || currentPage <= 1}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            {[...Array(Math.min(5, totalPages))].map((_, index) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = index + 1;
              } else if (currentPage <= 3) {
                pageNum = index + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + index;
              } else {
                pageNum = currentPage - 2 + index;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-2 border rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasNext || currentPage >= totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}

{/* No Results */}
{products.length === 0 && !loading && (
  <div className="text-center py-12">
    <div className="text-gray-400 mb-4">
      <MagnifyingGlassIcon className="h-16 w-16 mx-auto" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
    <p className="text-gray-600 mb-6">
      {searchTerm && searchTerm.trim() !== '' 
        ? `No products match your search for "${searchTerm}".`
        : (priceRange[0] > 0 || priceRange[1] < 10000)
          ? `No products found in the selected price range $${priceRange[0]} - $${priceRange[1]}.`
          : "No products match your current filters."
      }
    </p>
    {(searchTerm || priceRange[0] > 0 || priceRange[1] < 10000) && (
      <div className="space-y-2">
        <button
          onClick={handleClearFilters}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Clear Filters
        </button>
        <p className="text-sm text-gray-500 mt-2">
          Try adjusting your search term or price range
        </p>
      </div>
    )}
  </div>
)}
      </div>
    </div>
  );
};

export default React.memo(Products);