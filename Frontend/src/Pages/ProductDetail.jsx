//pages/ProductDetail.jsx - COMPLETE FIXED VERSION
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  StarIcon, 
  ShoppingCartIcon, 
  HeartIcon,
  ShareIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  UserIcon,
  PlayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { apiService } from '../services/Api';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import SmartImage from '../components/SmartImage';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentMedia, setCurrentMedia] = useState('images'); // 'images' or 'video'

  // Get cart functions and login status
  const { addItem, isLoggedIn, currentUserId } = useCart();
  const { showSuccess, showError } = useNotification();

  // Debug: Log cart context
  useEffect(() => {
    console.log('🔍 Cart context status:', { isLoggedIn, currentUserId });
  }, [isLoggedIn, currentUserId]);

  // Helper function to get video URL
  const getVideoUrl = (videoData) => {
    if (!videoData) return null;
    
    let videoUrl = null;
    
    if (typeof videoData === 'string') {
      videoUrl = videoData;
    } else if (typeof videoData === 'object' && videoData !== null) {
      videoUrl = videoData.url || videoData.file_url || videoData.path || videoData.src;
    }
    
    if (!videoUrl) return null;
    
    // If it's already a full URL, return as-is
    if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
      return videoUrl;
    }
    
    // If it starts with /uploads, prepend base URL
    if (videoUrl.startsWith('/uploads/')) {
      return `http://localhost:8000${videoUrl}`;
    }
    
    // Default: assume it's in uploads directory
    const cleanPath = videoUrl.startsWith('/') ? videoUrl.substring(1) : videoUrl;
    return `http://localhost:8000/uploads/${cleanPath}`;
  };

  // Check if product is already in wishlist
  useEffect(() => {
    if (product) {
      try {
        const savedWishlist = localStorage.getItem('wishlist');
        if (savedWishlist) {
          const wishlistItems = JSON.parse(savedWishlist);
          const isInWishlist = Array.isArray(wishlistItems) && 
            wishlistItems.some(item => item.id === product.id);
          setIsWishlisted(isInWishlist);
        }
      } catch (error) {
        console.error('Error checking wishlist status:', error);
      }
    }
  }, [product]);

  // Fetch product data from backend
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching product with ID:', id);
        const response = await apiService.getProduct(id);
        console.log('Product response:', response);
        
        if (response && response.product) {
          const backendProduct = response.product;
          
          console.log('Raw images from backend:', backendProduct.images);
          console.log('Raw demo video from backend:', backendProduct.demo_video);
          
          // Transform backend data to match frontend format
          const transformedProduct = {
            id: backendProduct._id || backendProduct.id,
            title: backendProduct.title || 'Untitled Product',
            description: backendProduct.description || '',
            longDescription: backendProduct.description || 'No detailed description available.',
            price: Number(backendProduct.price) || 0,
            originalPrice: backendProduct.original_price ? Number(backendProduct.original_price) : null,
            rating: Number(backendProduct.rating) || 0,
            reviewCount: Number(backendProduct.rating_count) || 0,
            downloads: Number(backendProduct.download_count) || 0,
            
            // Pass raw image and video data - SmartImage will handle URL construction
            images: backendProduct.images || [],
            demoVideo: backendProduct.demo_video || null,
            
            tags: Array.isArray(backendProduct.tags) ? backendProduct.tags : [],
            category: backendProduct.category || 'Uncategorized',
            seller: {
              name: backendProduct.seller_name || backendProduct.seller_id || 'Unknown Seller',
              rating: 4.5,
              products: 0,
              joinDate: "2024",
              verified: backendProduct.seller_name === 'Admin'
            },
            features: Array.isArray(backendProduct.features) && backendProduct.features.length > 0 
              ? backendProduct.features 
              : [
                  "Complete source code included",
                  "Documentation included", 
                  "Technical support available",
                  "Commercial license included"
                ],
            requirements: Array.isArray(backendProduct.requirements) && backendProduct.requirements.length > 0 
              ? backendProduct.requirements 
              : ["No specific requirements"],
            lastUpdated: backendProduct.updated_at ? new Date(backendProduct.updated_at).toLocaleDateString() : 'Unknown',
            version: backendProduct.version || '1.0.0',
            license: backendProduct.license_type || 'Standard',
            fileSize: backendProduct.files && backendProduct.files.length > 0 ? 'Available' : 'N/A',
            compatibility: ["Windows", "macOS", "Linux"],
            reviews: [],
            relatedProducts: [],
            status: backendProduct.status,
            featured: Boolean(backendProduct.featured),
            sales_count: Number(backendProduct.sales_count) || 0,
            view_count: Number(backendProduct.view_count) || 0,
            created_at: backendProduct.created_at,
            files: backendProduct.files || []
          };
          
          console.log('Final transformed product:', transformedProduct);
          setProduct(transformedProduct);
          
          // Fetch related products
          fetchRelatedProducts(transformedProduct.category);
          
        } else {
          setError('Product not found');
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Fetch reviews when product is loaded
useEffect(() => {
  if (product && product.id) {
    fetchProductReviews();
  }
}, [product?.id]);

 const fetchRelatedProducts = async (category) => {
  try {
    const response = await apiService.getProducts({ 
      category: category,
      limit: 4 
    });
    
    if (response && response.products) {
      const related = response.products
        .filter(p => (p._id || p.id) !== id) // Check both formats
        .slice(0, 3)
        .map(p => {
          // Ensure we have a valid ID
          const productId = p._id || p.id;
          
          // Validate the ID exists and is not empty
          if (!productId || productId === 'undefined' || productId === 'null') {
            console.warn('Invalid product ID found:', p);
            return null;
          }
          
          return {
            id: productId,
            title: p.title || 'Unknown Product',
            price: p.price || 0,
            rating: p.rating || 0,
            image: p.images?.[0] || null
          };
        })
        .filter(p => p !== null); // Remove invalid products
      
      console.log('Related products:', related);
      setRelatedProducts(related);
    }
  } catch (err) {
    console.error('Error fetching related products:', err);
    setRelatedProducts([]); // Set empty array on error
  }
};

  // ✅ FIXED ADD TO CART FUNCTION
  const addToCart = () => {
    try {
      console.log('🛒 Adding product to cart:', product.id, product.title);
      console.log('🔍 Login status:', isLoggedIn, 'User ID:', currentUserId);
      console.log('🔍 Full product object:', product);
      
      // Check if user is logged in first
      if (!isLoggedIn) {
        showError('Login Required', 'Please log in to add items to your cart');
        return;
      }

      // Validate product ID
      if (!product.id && !product._id) {
        console.error('❌ Product missing ID:', product);
        showError('Error', 'Product ID is missing. Cannot add to cart.');
        return;
      }

      // Prepare the product data for the cart
      const productId = product.id || product._id;
      const cartProduct = {
        id: productId,
        _id: productId, // Backup ID format
        title: product.title,
        name: product.title, // Backup name format
        price: product.price,
        originalPrice: product.originalPrice,
        original_price: product.originalPrice, // Backup format
        image: product.images?.[0] || null,
        images: product.images,
        seller: product.seller?.name || 'Unknown Seller',
        seller_name: product.seller?.name, // Backup format
        category: product.category || 'Uncategorized',
        license: product.license || 'Standard',
        license_type: product.license, // Backup format
        description: product.description || '',
        short_description: product.description, // Backup format
        status: product.status || 'approved',
        featured: product.featured || false
      };

      console.log('🛒 Cart product data:', cartProduct);

      const result = addItem(cartProduct, quantity);
      console.log('🛒 Add to cart result:', result);
      
      if (result && result.success !== false) {
        showSuccess('Added to Cart', `${product.title} has been added to your cart.`);
        console.log('✅ Product successfully added to cart');
      } else {
        const errorMessage = result?.error || 'Failed to add product to cart';
        console.error('❌ Failed to add to cart:', errorMessage);
        showError('Error', errorMessage);
      }
    } catch (error) {
      console.error('❌ Error in addToCart:', error);
      showError('Error', 'Failed to add product to cart. Please try again.');
    }
  };

  const toggleWishlist = () => {
    try {
      console.log('Toggle wishlist called for product:', product.id);
      
      // Get current wishlist from localStorage
      const savedWishlist = localStorage.getItem('wishlist');
      console.log('Current wishlist data:', savedWishlist);
      
      let wishlistItems = [];
      
      if (savedWishlist && savedWishlist !== '[]' && savedWishlist !== 'null') {
        try {
          wishlistItems = JSON.parse(savedWishlist);
          // Ensure it's an array
          if (!Array.isArray(wishlistItems)) {
            console.log('Wishlist was not an array, resetting');
            wishlistItems = [];
          }
        } catch (parseError) {
          console.error('Error parsing wishlist:', parseError);
          wishlistItems = [];
        }
      }

      console.log('Current wishlist items:', wishlistItems.length);
      const existingIndex = wishlistItems.findIndex(item => item.id === product.id);
      console.log('Existing index:', existingIndex);

      if (existingIndex > -1) {
        // Remove from wishlist
        wishlistItems.splice(existingIndex, 1);
        setIsWishlisted(false);
        console.log('Removed from wishlist, new length:', wishlistItems.length);
        showSuccess('Removed from Wishlist', `${product.title} has been removed from your wishlist.`);
      } else {
        // Add to wishlist
        const wishlistItem = {
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.price,
          originalPrice: product.originalPrice,
          rating: product.rating,
          images: product.images,
          image: product.images?.[0], // fallback for compatibility
          downloads: product.downloads,
          tags: product.tags,
          category: product.category,
          addedAt: new Date().toISOString()
        };
        
        console.log('Adding item to wishlist:', wishlistItem);
        wishlistItems.push(wishlistItem);
        setIsWishlisted(true);
        console.log('Added to wishlist, new length:', wishlistItems.length);
        showSuccess('Added to Wishlist', `${product.title} has been added to your wishlist.`);
      }

      // Save updated wishlist with extra verification
      const updatedWishlistString = JSON.stringify(wishlistItems);
      console.log('About to save to localStorage:', updatedWishlistString);
      
      localStorage.setItem('wishlist', updatedWishlistString);
      
      // Verify it was saved
      const verification = localStorage.getItem('wishlist');
      console.log('Verification - what was actually saved:', verification);
      
      // Don't trigger events that might cause clearing
      // Instead, use a timeout to allow current operation to complete
      setTimeout(() => {
        // Dispatch a custom event for same-page updates
        window.dispatchEvent(new CustomEvent('wishlistUpdated', {
          detail: { wishlistItems, action: existingIndex > -1 ? 'remove' : 'add' }
        }));
      }, 100);
      
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      showError('Error', 'Failed to update wishlist. Please try again.');
    }
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <StarIcon 
        key={i} 
        className={`h-5 w-5 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

const fetchProductReviews = async () => {
  try {
    // Try to fetch from backend first
    const response = await fetch(`http://localhost:8000/api/v1/products/${id}/reviews?limit=20`);

    if (response.ok) {
      const serverReviews = await response.json();
      setProduct(prev => ({
        ...prev,
        reviews: Array.isArray(serverReviews) ? serverReviews : [],
        reviewCount: Array.isArray(serverReviews) ? serverReviews.length : 0
      }));
      return;
    }
  } catch (error) {
    console.error('Error fetching reviews:', error);
  }

  // Fallback to local reviews only when server not available
  const localReviews = JSON.parse(localStorage.getItem('productReviews') || '{}');
  const productLocalReviews = localReviews[id] || [];
  setProduct(prev => ({
    ...prev,
    reviews: productLocalReviews,
    reviewCount: productLocalReviews.length
  }));
};

  // Handle video play
  const handleVideoPlay = () => {
    setCurrentMedia('video');
    setShowVideoModal(true);
  };

  // Handle media switch
  const switchToImages = () => {
    setCurrentMedia('images');
    setSelectedImage(0);
  };

  const switchToVideo = () => {
    setCurrentMedia('video');
  };

  // Main media rendering (images + video)
  const renderMainMedia = () => {
    if (currentMedia === 'video' && product.demoVideo) {
      const videoUrl = getVideoUrl(product.demoVideo);
      
      if (videoUrl) {
        return (
          <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden">
            <video 
              src={videoUrl}
              controls
              className="w-full h-full object-contain"
              onError={(e) => {
                console.error('Video failed to load:', videoUrl);
                setCurrentMedia('images'); // Fallback to images if video fails
              }}
              onLoadStart={() => {
                console.log('Video started loading:', videoUrl);
              }}
            >
              Your browser does not support the video tag.
            </video>
            
            {/* Switch back to images button */}
            <button
              onClick={switchToImages}
              className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        );
      }
    }
    
    // Default to images
    if (product.images && product.images.length > 0 && product.images[selectedImage]) {
      return (
        <div className="relative">
          <SmartImage 
            src={product.images[selectedImage]}
            alt={product.title}
            className="w-full h-96 object-cover rounded-lg"
            fallbackClassName="w-full h-96 rounded-lg"
            onLoad={() => {
              console.log('Main image loaded successfully');
            }}
            onError={() => {
              console.log('Main image failed to load');
            }}
          />
          
          {/* Video play button overlay if video exists */}
          {product.demoVideo && (
            <button 
              onClick={switchToVideo}
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg hover:bg-opacity-40 transition-all group"
            >
              <div className="bg-white rounded-full p-4 group-hover:scale-110 transition-transform">
                <PlayIcon className="h-8 w-8 text-blue-600" />
              </div>
            </button>
          )}
        </div>
      );
    } else {
      return (
        <div className="w-full h-96 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No product media available</p>
          </div>
        </div>
      );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-500 mb-4">
            <ExclamationTriangleIcon className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Product Not Found</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            to="/products" 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  // Create media items array for thumbnails
  const mediaItems = [];
  
  // Add images
  if (product.images && product.images.length > 0) {
    product.images.forEach((image, index) => {
      mediaItems.push({
        type: 'image',
        src: image,
        index: index,
        alt: `Product image ${index + 1}`
      });
    });
  }
  
  // Add video if it exists
  if (product.demoVideo) {
    mediaItems.push({
      type: 'video',
      src: product.demoVideo,
      alt: 'Demo video'
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-blue-600">Products</Link>
          <span>/</span>
          <span className="text-gray-900">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Product Media */}
          <div>
            <div className="relative mb-4">
              {renderMainMedia()}
              
              <button className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-50">
                <ShareIcon className="h-5 w-5" />
              </button>
            </div>
            
            {/* Media Thumbnails - show both images and video */}
            {mediaItems.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {mediaItems.map((media, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (media.type === 'image') {
                        setCurrentMedia('images');
                        setSelectedImage(media.index);
                      } else if (media.type === 'video') {
                        setCurrentMedia('video');
                      }
                    }}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 relative ${
                      (currentMedia === 'images' && selectedImage === media.index) || 
                      (currentMedia === 'video' && media.type === 'video')
                        ? 'border-blue-600' : 'border-gray-200'
                    }`}
                  >
                    {media.type === 'image' ? (
                      <SmartImage 
                        src={media.src}
                        alt={media.alt}
                        className="w-full h-full object-cover"
                        fallbackClassName="w-full h-full"
                        showFallback={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-black flex items-center justify-center">
                        <PlayIcon className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Media Info */}
            <div className="mt-4 text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>📸 {product.images?.length || 0} images</span>
                {product.demoVideo && <span>🎥 1 demo video</span>}
                <span>📁 {product.files?.length || 0} files</span>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {product.category}
              </span>
              {product.seller.verified && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                  <CheckIcon className="h-3 w-3 mr-1" />
                  Verified Seller
                </span>
              )}
              {product.featured && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                  Featured
                </span>
              )}
              <span className={`text-xs px-2 py-1 rounded-full ${
                product.status === 'approved' 
                  ? 'bg-green-100 text-green-800' 
                  : product.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {product.status}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.title}</h1>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center">
                {renderStars(product.rating)}
                <span className="ml-2 text-gray-600">({product.rating.toFixed(1)})</span>
              </div>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{product.reviewCount} reviews</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{product.downloads} downloads</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{product.sales_count} sales</span>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-blue-600">${product.price}</span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <>
                    <span className="text-xl text-gray-500 line-through">${product.originalPrice}</span>
                    <span className="bg-red-100 text-red-800 text-sm px-2 py-1 rounded-full">
                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-gray-600 mt-2">One-time purchase • {product.license} license</p>
            </div>

            <p className="text-gray-700 mb-6 leading-relaxed">{product.description}</p>

            {/* Key Features */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">What is Included:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.features.slice(0, 6).map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <CheckIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Purchase Section */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              {/* Show login prompt if not logged in */}
              {!isLoggedIn && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    Please <Link to="/login" className="font-medium underline">log in</Link> to add items to your cart.
                  </p>
                </div>
              )}
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 hover:bg-gray-100 rounded-l-lg"
                    disabled={!isLoggedIn}
                  >
                    -
                  </button>
                  <span className="px-4 py-2 border-x border-gray-300">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2 hover:bg-gray-100 rounded-r-lg"
                    disabled={!isLoggedIn}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={addToCart}
                  disabled={!isLoggedIn}
                  className={`flex-1 px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    isLoggedIn 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCartIcon className="h-5 w-5" />
                  {isLoggedIn ? 'Add to Cart' : 'Login to Add to Cart'}
                </button>
                <button
                  onClick={toggleWishlist}
                  className="p-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {isWishlisted ? (
                    <HeartIconSolid className="h-5 w-5 text-red-500" />
                  ) : (
                    <HeartIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="flex items-center text-sm text-gray-600 gap-4">
                <div className="flex items-center">
                  <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                  Instant download
                </div>
                <div className="flex items-center">
                  <CheckIcon className="h-4 w-4 mr-1" />
                  30-day money back
                </div>
              </div>
            </div>

            {/* Product Meta */}
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Last Updated:</span> {product.lastUpdated}
              </div>
              <div>
                <span className="font-medium">Version:</span> {product.version}
              </div>
              <div>
                <span className="font-medium">File Size:</span> {product.fileSize}
              </div>
              <div>
                <span className="font-medium">License:</span> {product.license}
              </div>
              <div>
                <span className="font-medium">Views:</span> {product.view_count}
              </div>
              <div>
                <span className="font-medium">Files:</span> {product.files.length}
              </div>
            </div>

            {/* Download Files Section */}
            {product.files && product.files.length > 0 && (
              <div className="mb-6 mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Available Files:</h3>
                <div className="space-y-2">
                  {product.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <ArrowDownTrayIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-sm text-gray-700">
                          {typeof file === 'string' ? (file.split('\\').pop() || file.split('/').pop()) : `File ${index + 1}`}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">Available after purchase</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="mt-6">
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm hover:bg-gray-200 cursor-pointer"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Seller Info */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {product.seller.name}
                  {product.seller.verified && (
                    <CheckIcon className="h-4 w-4 text-green-500" />
                  )}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    {renderStars(product.seller.rating)}
                    <span className="ml-1">({product.seller.rating})</span>
                  </div>
                  <span>{product.seller.products} products</span>
                  <span>Since {product.seller.joinDate}</span>
                </div>
              </div>
            </div>
 \          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-lg">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {['description', 'requirements', 'reviews', 'compatibility'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                <div className="whitespace-pre-line text-gray-700 leading-relaxed mb-6">
                  {product.longDescription}
                </div>
                
                {/* Product Files */}
                {product.files && product.files.length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Included Files ({product.files.length})</h3>
                    <div className="space-y-3">
                      {product.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <ArrowDownTrayIcon className="h-5 w-5 text-blue-600 mr-3" />
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                {typeof file === 'string' ? (file.split('\\').pop() || file.split('/').pop()) : (file.name || file.filename || `File ${index + 1}`)}
                              </span>
                              <p className="text-xs text-gray-500">
                                Available for download after purchase
                              </p>
                            </div>
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {typeof file === 'string' ? (file.split('.').pop()?.toUpperCase() || 'FILE') : 'FILE'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requirements' && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">System Requirements</h3>
                <ul className="space-y-2">
                  {product.requirements.map((req, index) => (
                    <li key={index} className="flex items-center text-gray-700">
                      <CheckIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
                <h3 className="font-semibold text-gray-900 mb-4 mt-6">Compatibility</h3>
                <div className="flex flex-wrap gap-2">
                  {product.compatibility.map((platform, index) => (
                    <span
                      key={index}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
  <div>
    <div className="flex items-center justify-between mb-6">
      <h3 className="font-semibold text-gray-900">Customer Reviews ({product.reviews?.length || 0})</h3>
    </div>
    
    {product.reviews && product.reviews.length > 0 ? (
      <div className="space-y-6">
        {product.reviews.map((review, index) => (
          <div key={index} className="border-b border-gray-200 pb-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center mb-2">
                  {renderStars(review.rating)}
                  <span className="ml-2 text-sm font-medium text-gray-900">{review.rating}/5</span>
                </div>
                {review.title && (
                  <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                )}
                <p className="text-sm text-gray-600">
                  By {review.user_name || 'Anonymous'} • {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {(review.content || review.comment) && (
              <p className="text-gray-700 mb-4">{review.content || review.comment}</p>
            )}
            
            {review.seller_response && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Response from Seller:</p>
                <p className="text-sm text-gray-700">{review.seller_response}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center py-12 text-gray-500">
        <p>No reviews yet.</p>
      </div>
    )}
  </div>
)}

            {activeTab === 'compatibility' && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Platform Compatibility</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.compatibility.map((platform, index) => (
                    <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                      <span className="font-medium text-gray-900">{platform}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  to={`/products/${relatedProduct.id}`}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <SmartImage
                    src={relatedProduct.image}
                    alt={relatedProduct.title}
                    className="w-full h-48 object-cover"
                    fallbackClassName="w-full h-48"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{relatedProduct.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-blue-600">${relatedProduct.price}</span>
                      <div className="flex items-center">
                        {renderStars(relatedProduct.rating)}
                        <span className="ml-1 text-sm text-gray-600">({relatedProduct.rating.toFixed(1)})</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;