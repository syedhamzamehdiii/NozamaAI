import  { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Star, 
  Heart, 
  ShoppingCart, 
  Share2,
  Tag,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Globe,
  Shield,
  Zap,
  Play,
  PlayIcon
} from 'lucide-react';
import { apiService } from '../../services/Api';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState({});
  const [selectedTab, setSelectedTab] = useState('description');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    fetchProduct();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching product:', id);
      const response = await apiService.getProduct(id);
      
      if (response && response.product) {
        setProduct(response.product);
        console.log('✅ Product loaded:', response.product);
      } else {
        throw new Error('Product not found');
      }
    } catch (err) {
      console.error('❌ Error fetching product:', err);
      setError(err.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (index) => {
    setImageError(prev => ({ ...prev, [index]: true }));
  };

  const nextImage = () => {
    if (product?.images?.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === product.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (product?.images?.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? product.images.length - 1 : prev - 1
      );
    }
  };

  const handleAddToCart = () => {
    // Add to cart logic
    console.log('Adding to cart:', { productId: id, quantity });
    // You can implement your cart logic here
  };

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    console.log('Wishlist toggled:', !isWishlisted);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.title || 'Product',
          text: product?.description || 'Check out this product',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 !== 0;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400 opacity-50" />);
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />);
      }
    }
    return stars;
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-4">
            <h2 className="font-bold text-lg mb-2">Error Loading Product</h2>
            <p>{error}</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Handle no product
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Product Not Found</h2>
          <p className="text-gray-600 mb-6">The product you are looking for does nnt exist.</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleShare}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Share product"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleWishlist}
                className={`p-2 rounded-lg transition-colors ${
                  isWishlisted 
                    ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                    : 'text-gray-600 hover:text-red-600 hover:bg-gray-100'
                }`}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
          {/* Image Gallery */}
          <div className="flex flex-col-reverse">
            {/* Image thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="hidden mt-6 w-full max-w-2xl mx-auto sm:block lg:max-w-none">
                <div className="grid grid-cols-4 gap-6">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`relative h-24 bg-white rounded-md flex items-center justify-center text-sm font-medium uppercase text-gray-900 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring focus:ring-opacity-50 focus:ring-offset-4 ${
                        index === currentImageIndex ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      {!imageError[index] ? (
                        <img
                          src={image}
                          alt={`${product.title} ${index + 1}`}
                          className="w-full h-full object-cover object-center rounded-md"
                          onError={() => handleImageError(index)}
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main image */}
            <div className="w-full aspect-w-1 aspect-h-1">
              <div className="relative bg-white rounded-lg overflow-hidden">
                {product.images && product.images.length > 0 && !imageError[currentImageIndex] ? (
                  <img
                    src={product.images[currentImageIndex]}
                    alt={product.title}
                    className="w-full h-full object-cover object-center"
                    onError={() => handleImageError(currentImageIndex)}
                  />
                ) : (
                  <div className="w-full h-96 flex items-center justify-center bg-gray-100">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                
                {/* Image navigation */}
                {product.images && product.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-75 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-75 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Image counter */}
                {product.images && product.images.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {product.images.length}
                  </div>
                )}
              </div>
            </div>
          </div>
{/* Product Images and Video */}
<div>
  <div className="relative mb-4">
    {product.images && product.images.length > 0 && product.images[selectedImage] ? (
      <img 
        src={product.images[selectedImage]} 
        alt={product.title}
        className="w-full h-96 object-cover rounded-lg bg-gray-100"
        onError={handleImageError}
      />
    ) : product.demo_video_url ? (
      <video 
        src={product.demo_video_url.startsWith('/uploads') 
          ? `http://localhost:8000${product.demo_video_url}` 
          : product.demo_video_url
        }
        className="w-full h-96 object-cover rounded-lg bg-gray-100"
        controls
        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236b7280'%3EVideo Preview%3C/text%3E%3C/svg%3E"
      >
        Your browser does not support the video tag.
      </video>
    ) : (
      <div className="w-full h-96 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-lg">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No media available</p>
        </div>
      </div>
    )}
    
    <button className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-50">
      <Share2 className="h-5 w-5" />
    </button>
    
    {product.demo_video_url && product.images && product.images.length > 0 && (
      <button 
        onClick={() => setSelectedImage('video')}
        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg hover:bg-opacity-40 transition-all"
      >
          <Play className="h-8 w-8 text-blue-600" />
          {/* <PlayIcon className="h-8 w-8 text-blue-600" /> */}
      </button>
    )}
  </div>
  
  {/* Thumbnails including video */}
  {((product.images && product.images.length > 0) || product.demo_video_url) && (
    <div className="flex space-x-2 overflow-x-auto">
      {/* Image Thumbnails */}
      {product.images && product.images.map((image, index) => (
        <button
          key={`img-${index}`}
          onClick={() => setSelectedImage(index)}
          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
            selectedImage === index ? 'border-blue-600' : 'border-gray-200'
          }`}
        >
          <img 
            src={image} 
            alt={`View ${index + 1}`} 
            className="w-full h-full object-cover bg-gray-100"
            onError={handleImageError}
          />
        </button>
      ))}
      
      {/* Video Thumbnail */}
      {product.demo_video_url && (
        <button
          onClick={() => setSelectedImage('video')}
          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
            selectedImage === 'video' ? 'border-blue-600' : 'border-gray-200'
          } bg-gray-800 flex items-center justify-center`}
        >
          <>
            <Play className="h-8 w-8 text-white" />
            <PlayIcon className="h-8 w-8 text-white" />
          </>
        </button>
      )}
    </div>
  )}
</div>
          {/* Product info */}
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
            {/* Title and price */}
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                {product.title}
              </h1>
              <div className="mt-3">
                <h2 className="sr-only">Product information</h2>
                <p className="text-3xl text-gray-900 font-bold">
                  ${product.price}
                </p>
              </div>
            </div>

            {/* Rating */}
            {product.rating && (
              <div className="mt-3 flex items-center">
                <div className="flex items-center">
                  {renderStars(product.rating.rate)}
                </div>
                <p className="ml-2 text-sm text-gray-600">
                  {product.rating.rate} ({product.rating.count} reviews)
                </p>
              </div>
            )}

            {/* Category and other details */}
            <div className="mt-6 space-y-2">
              {product.category && (
                <div className="flex items-center text-sm text-gray-600">
                  <Tag className="w-4 h-4 mr-2" />
                  <span className="capitalize">{product.category}</span>
                </div>
              )}
              
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="w-4 h-4 mr-2" />
                <span>Secure Payment</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Globe className="w-4 h-4 mr-2" />
                <span>Worldwide Shipping</span>
              </div>
            </div>

            {/* Quantity and Add to Cart */}
            <div className="mt-8">
              <div className="flex items-center space-x-4 mb-6">
                <label htmlFor="quantity" className="text-sm font-medium text-gray-700">
                  Quantity:
                </label>
                <select
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="rounded-md border border-gray-300 py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-blue-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </button>
                
                <button
                  onClick={handleWishlist}
                  className={`px-4 py-3 rounded-md border transition-colors ${
                    isWishlisted
                      ? 'border-red-500 text-red-600 bg-red-50 hover:bg-red-100'
                      : 'border-gray-300 text-gray-600 hover:text-red-600 hover:border-red-500'
                  }`}
                  aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="mt-8 border-t border-gray-200 pt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Features</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center">
                  <Zap className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-sm text-gray-600">Fast Processing</span>
                </div>
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-sm text-gray-600">Quality Guaranteed</span>
                </div>
                <div className="flex items-center">
                  <Globe className="w-5 h-5 text-purple-600 mr-3" />
                  <span className="text-sm text-gray-600">Global Shipping</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product details tabs */}
        <div className="mt-16">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'description', label: 'Description', icon: FileText },
                { id: 'reviews', label: 'Reviews', icon: Star },
                { id: 'details', label: 'Details', icon: Tag },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-8">
            {selectedTab === 'description' && (
              <div className="prose max-w-none">
                <p className="text-gray-600 leading-relaxed">
                  {product.description || 'No description available.'}
                </p>
              </div>
            )}

            {selectedTab === 'reviews' && (
              <div>
                {product.rating ? (
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center mb-4">
                      <div className="flex items-center">
                        {renderStars(product.rating.rate)}
                      </div>
                      <span className="ml-2 text-lg font-medium text-gray-900">
                        {product.rating.rate} out of 5
                      </span>
                    </div>
                    <p className="text-gray-600">
                      Based on {product.rating.count} reviews
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-600">No reviews available.</p>
                )}
              </div>
            )}

            {selectedTab === 'details' && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">
                      {product.category || 'Not specified'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Price</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      ${product.price}
                    </dd>
                  </div>
                  {product.rating && (
                    <>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Rating</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {product.rating.rate} / 5
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Reviews</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {product.rating.count} reviews
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;