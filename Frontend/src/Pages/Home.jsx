import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, StarIcon, ShoppingBagIcon, UsersIcon, CpuChipIcon } from '@heroicons/react/24/outline';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ PERFORMANCE OPTIMIZATION 1: Memoized static data
  const stats = useMemo(() => [
    { label: "AI Tools", value: "10,000+", icon: CpuChipIcon },
    { label: "Happy Customers", value: "50,000+", icon: UsersIcon },
    { label: "Total Downloads", value: "1M+", icon: ShoppingBagIcon }
  ], []);

  const features = useMemo(() => [
    {
      icon: CpuChipIcon,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100",
      title: "AI-Powered Search",
      description: "Find the perfect AI tool with our intelligent search and recommendation system"
    },
    {
      icon: ShoppingBagIcon,
      iconColor: "text-green-600",
      bgColor: "bg-green-100",
      title: "Instant Delivery",
      description: "Get your AI tools immediately after purchase with secure download links"
    },
    {
      icon: UsersIcon,
      iconColor: "text-purple-600",
      bgColor: "bg-purple-100",
      title: "Global Community",
      description: "Connect with AI developers and researchers from around the world"
    },
    {
      icon: StarIcon,
      iconColor: "text-yellow-600",
      bgColor: "bg-yellow-100",
      title: "Quality Assured",
      description: "All tools are reviewed and rated by our community for quality assurance"
    }
  ], []);

  // ✅ NEW: Function to validate if product still exists
  const validateProductExists = useCallback(async (productId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/products/${productId}`, {
        method: 'GET', // Use HEAD to check existence without downloading full data
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return response.ok;
    } catch (error) {
      console.warn(`Failed to validate product ${productId}:`, error);
      return false;
    }
  }, []);

  // ✅ NEW: Function to remove deleted products from state and cache
  const removeDeletedProducts = useCallback(async (products) => {
    if (!products || products.length === 0) return products;

    console.log('🔍 Validating featured products...');
    const validationPromises = products.map(async (product) => {
      const exists = await validateProductExists(product.id || product._id);
      return { product, exists };
    });

    const validationResults = await Promise.all(validationPromises);
    const validProducts = validationResults
      .filter(result => result.exists)
      .map(result => result.product);

    const removedCount = products.length - validProducts.length;
    if (removedCount > 0) {
      console.log(`🗑️ Removed ${removedCount} deleted product(s) from featured products`);
      
      // Update cache with valid products only
      const cacheKey = 'featured_products';
      localStorage.setItem(cacheKey, JSON.stringify(validProducts));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
    }

    return validProducts;
  }, [validateProductExists]);

  // ✅ NEW: Function to handle real-time product deletion
  const handleProductDeletion = useCallback((deletedProductId) => {
    console.log(`🗑️ Product ${deletedProductId} was deleted, updating featured products...`);
    
    setFeaturedProducts(prevProducts => {
      const updatedProducts = prevProducts.filter(
        product => product.id !== deletedProductId && product._id !== deletedProductId
      );
      
      // Update cache
      const cacheKey = 'featured_products';
      localStorage.setItem(cacheKey, JSON.stringify(updatedProducts));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
      return updatedProducts;
    });
  }, []);

  // ✅ NEW: Listen for product deletion events (if using WebSocket/SSE)
  useEffect(() => {
  
    // Example: Custom event listener for product deletion
    const handleCustomDeletion = (event) => {
      if (event.detail && event.detail.productId) {
        handleProductDeletion(event.detail.productId);
      }
    };

    window.addEventListener('productDeleted', handleCustomDeletion);

    return () => {
      window.removeEventListener('productDeleted', handleCustomDeletion);
    };
  }, [handleProductDeletion]);

  // ✅ PERFORMANCE OPTIMIZATION 2: Optimized helper functions (memoized)
  const formatPrice = useCallback((price) => {
    if (typeof price === 'number') {
      return `$${price.toFixed(2)}`;
    }
    if (typeof price === 'string') {
      if (price.includes('$')) return price;
      const numPrice = parseFloat(price);
      if (!isNaN(numPrice)) {
        return `$${numPrice.toFixed(2)}`;
      }
    }
    return '$0.00';
  }, []);

  const getRating = useCallback((product) => {
    if (product.rating && typeof product.rating === 'number') {
      return product.rating;
    }
    if (product.reviews && Array.isArray(product.reviews) && product.reviews.length > 0) {
      const totalRating = product.reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
      return (totalRating / product.reviews.length).toFixed(1);
    }
    return (4.0 + Math.random() * 1.0).toFixed(1);
  }, []);

  const getProductImage = useCallback((product) => {
    const normalize = (raw) => {
      if (!raw) return './placeholder-product.jpg';
      if (raw.startsWith('http')) return raw;
      const clean = raw.replace(/\\/g, '/');
      if (clean.startsWith('/uploads/')) return `http://localhost:8000${clean}`;
      return `http://localhost:8000/uploads/${clean}`;
    };
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return normalize(product.images[0]);
    }
    if (product.image) return normalize(product.image);
    return './placeholder-product.jpg';
  }, []);

  const getProductTags = useCallback((product) => {
    if (product.tags && Array.isArray(product.tags)) {
      return product.tags.slice(0, 2);
    }
    if (product.category) {
      return [product.category];
    }
    return ['AI Tool'];
  }, []);

  // ✅ ENHANCED: API call with product validation
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check cache first
        const cacheKey = 'featured_products';
        const cacheExpiry = 5 * 60 * 1000; // 5 minutes
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(`${cacheKey}_time`);
        
        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < cacheExpiry) {
            console.log('✅ Using cached featured products');
            const cachedProducts = JSON.parse(cached);
            
            // Validate cached products in background
            setTimeout(async () => {
              const validatedProducts = await removeDeletedProducts(cachedProducts);
              if (validatedProducts.length !== cachedProducts.length) {
                setFeaturedProducts(validatedProducts);
              }
            }, 100);
            
            setFeaturedProducts(cachedProducts);
            setLoading(false);
            return;
          }
        }

        console.log('🚀 Fetching fresh featured products...');
        const startTime = Date.now();
        
        // Set a timeout for the API call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 5000); // 5 second timeout
        
        const response = await fetch('http://localhost:8000/api/v1/products/?limit=6&sort_by=featured&sort_order=desc', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const fetchTime = Date.now() - startTime;
        console.log(`⏱️ API call took ${fetchTime}ms`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Transform products faster
        const products = data.products || data || [];
        const transformedProducts = products.slice(0, 6).map(product => {
          const id = product._id || product.id || 'unknown';
          return {
            ...product,
            id,
            _id: id, // Ensure both formats
            title: product.title || 'Untitled Product',
            price: Number(product.price) || 0,
            rating: Number(product.rating) || 4.5,
            images: product.images || [],
            tags: product.tags || ['AI Tool'],
            category: product.category || 'Uncategorized',
            description: product.description || 'No description available.'
          };
        });

        // Get top 3 valid products for featured display
        const featuredProductsToShow = transformedProducts.slice(0, 3);
        setFeaturedProducts(featuredProductsToShow);
        
        // Cache the results
        localStorage.setItem(cacheKey, JSON.stringify(featuredProductsToShow));
        localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
        
        console.log(`✅ Featured products loaded in ${Date.now() - startTime}ms`);
        setError(null);
        
      } catch (err) {
        console.error('❌ Error fetching products:', err);
        
        // Try to use stale cache as fallback, but validate it
        const staleCache = localStorage.getItem('featured_products');
        if (staleCache) {
          console.log('🔄 Using stale cache as fallback');
          const cachedProducts = JSON.parse(staleCache);
          const validatedProducts = await removeDeletedProducts(cachedProducts);
          setFeaturedProducts(validatedProducts);
        } else {
          // Use mock data as ultimate fallback
          console.log('🔄 Using mock data as fallback');
          setFeaturedProducts([
            {
              id: 'mock-1',
              _id: 'mock-1',
              title: 'AI Image Generator',
              description: 'Advanced AI tool for generating high-quality images',
              price: 29.99,
              rating: 4.8,
              images: ['./placeholder-product.jpg'],
              tags: ['AI', 'Images'],
              category: 'AI Tools'
            },
            {
              id: 'mock-2',
              _id: 'mock-2',
              title: 'Text Analysis API',
              description: 'Powerful natural language processing API',
              price: 19.99,
              rating: 4.6,
              images: ['./placeholder-product.jpg'],
              tags: ['AI', 'Text'],
              category: 'APIs'
            },
            {
              id: 'mock-3',
              _id: 'mock-3',
              title: 'Dataset Collection',
              description: 'Curated dataset for machine learning training',
              price: 39.99,
              rating: 4.7,
              images: ['./placeholder-product.jpg'],
              tags: ['Dataset', 'ML'],
              category: 'Datasets'
            }
          ]);
        }
        
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [removeDeletedProducts]);

  // ✅ NEW: Public method to manually refresh featured products
  const refreshFeaturedProducts = useCallback(() => {
    console.log('🔄 Manually refreshing featured products...');
    setLoading(true);
    
    // Clear cache to force fresh fetch
    localStorage.removeItem('featured_products');
    localStorage.removeItem('featured_products_time');
    
    // Trigger re-fetch by updating a dependency
    window.location.reload(); // Simple approach, or you could use a state variable
  }, []);

  // ✅ NEW: Expose refresh function globally for other components
  useEffect(() => {
    window.refreshFeaturedProducts = refreshFeaturedProducts;
    return () => {
      delete window.refreshFeaturedProducts;
    };
  }, [refreshFeaturedProducts]);

  // ✅ PERFORMANCE OPTIMIZATION 4: Show skeleton loading immediately
  if (loading && featuredProducts.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        {/* Hero Section - Loads immediately */}
        <div className="relative bg-white">
          <div className="absolute inset-0 bg-gray-50 opacity-10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl text-black md:text-6xl font-bold mb-6">
                Your AI Marketplace
              </h1>
              <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-gray-700">
                Discover, purchase, and integrate cutting-edge AI tools, datasets, and ML modules from a global community of developers
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  to="/products" 
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow"
                >
                  Explore AI Tools
                </Link>
                <Link 
                  to="/seller" 
                  className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-600 hover:text-white transition-colors"
                >
                  Start Selling
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section - Loads immediately */}
        <div className="bg-white py-16 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <stat.icon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Products - Skeleton Loading */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured AI Tools</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Discover the most popular and highly-rated AI tools from our marketplace
              </p>
            </div>
            
            {/* Skeleton Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg shadow overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-3 w-3/4"></div>
                    <div className="h-6 bg-gray-200 rounded mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded mb-4 w-1/2"></div>
                    <div className="flex justify-between items-center">
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                      <div className="h-10 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-white ">
        <div className="absolute inset-0 bg-gray-50 opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl text-black md:text-6xl font-bold mb-6">
              Your AI Marketplace
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-gray-700">
              Discover, purchase, and integrate cutting-edge AI tools, datasets, and ML modules from a global community of developers
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/products" 
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow"
              >
                Explore AI Tools
              </Link>
              <Link 
                to="/seller" 
                className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-600 hover:text-white transition-colors"
              >
                Start Selling
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-16 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <stat.icon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured AI Tools</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover the most popular and highly-rated AI tools from our marketplace
            </p>
          </div>
          
          {/* Error State */}
          {error && (
            <div className="text-center mb-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-yellow-800 text-sm">
                  ⚠️ Using cached data. Backend connection: {error}
                </p>
              </div>
            </div>
          )}

          {/* Products Grid */}
          {featuredProducts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-fr">
              {featuredProducts.map((product) => (
                <div 
                  key={product.id || product._id} 
                  className="bg-white border border-gray-200 rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full"
                >
                  {/* Product Image */}
                  <div className="relative h-48 flex-shrink-0">
                    <img 
                      src={getProductImage(product)} 
                      alt={product.title || 'AI Tool'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = './placeholder-product.jpg';
                      }}
                    />
                  </div>
                  
                  {/* Product Content */}
                  <div className="p-6 flex flex-col flex-grow">
                    {/* Rating Section */}
                    <div className="flex items-center mb-2 h-5">
                      <div className="flex items-center">
                        {Array.from({ length: 5 }, (_, i) => (
                          <StarIcon 
                            key={`star-${product.id}-${i}`} 
                            className={`h-4 w-4 ${i < Math.floor(getRating(product)) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-gray-600">({getRating(product)})</span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 h-14 line-clamp-2 overflow-hidden">
                      {product.title || 'Untitled AI Tool'}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-gray-600 mb-4 h-12 line-clamp-2 overflow-hidden text-sm">
                      {product.description || 'AI tool description not available.'}
                    </p>
                    
                    {/* Spacer */}
                    <div className="flex-grow"></div>
                    
                    {/* Tags and Price */}
                    <div className="flex items-center justify-between mb-4 h-8">
                      <div className="flex gap-2 flex-wrap">
                        {getProductTags(product).slice(0, 2).map((tag, index) => (
                          <span key={`tag-${product.id}-${index}`} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full whitespace-nowrap">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-xl font-bold text-gray-900 whitespace-nowrap ml-2">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                    
                    {/* Button */}
                    <Link 
                      to={`/products/${product.id || product._id}`}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center h-10 flex items-center justify-center font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* No Products State */}
          {featuredProducts.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 max-w-md mx-auto">
                <CpuChipIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Featured Products</h3>
                <p className="text-gray-500 mb-4">There are currently no featured products available.</p>
                <button
                  onClick={refreshFeaturedProducts}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Refresh Products
                </button>
              </div>
            </div>
          )}
          
          {/* View All Products Link */}
          {featuredProducts.length > 0 && (
            <div className="text-center mt-12">
              <Link 
                to="/products" 
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
              >
                View All Products
                <ChevronRightIcon className="h-5 w-5 ml-1" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Nozama.ai?</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={`feature-${index}`} className="text-center">
                <div className={`${feature.bgColor} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <feature.icon className={`h-8 w-8 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl text-gray-900 font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-700">
            Join thousands of developers and businesses already using Nozama.ai to accelerate their AI projects
          </p>
            <Link 
              to="/products" 
              className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-600 hover:text-white transition-colors"
            >
              Browse Products
            </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;