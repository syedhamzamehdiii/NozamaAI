// Updated ProductCard Component - Replace your existing ProductCard

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Star, 
  Download, 
  Heart, 
  ShoppingCart, 
  Eye,
  User,
  Calendar,
  Image as ImageIcon
} from 'lucide-react';
import PropTypes from 'prop-types';

const ProductCard = ({ product, onAddToCart, onAddToWishlist, className = '' }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Safely get product data with defaults
  const {
    _id = '',
    title = 'Untitled Product',
    description = 'No description available',
    price = 0,
    images = [],
    category = 'General',
    rating = 0,
    reviewCount = 0,
    downloads = 0,
    seller = {},
    createdAt = new Date(),
    tags = [],
  } = product || {};

  // Get the main image with better URL handling
  const getMainImage = () => {
    if (images && images.length > 0) {
      const firstImage = images[0];
      
      if (typeof firstImage === 'string') {
        // Skip any placeholder URLs
        if (firstImage.includes('placeholder') || firstImage.includes('via.placeholder')) {
          return null;
        }
        
        // If it starts with /uploads, prepend the base URL
        if (firstImage.startsWith('/uploads')) {
          return `http://localhost:8000${firstImage}`;
        }
        
        // If it's already a full URL, return as is
        if (firstImage.startsWith('http')) {
          return firstImage;
        }
        
        // Otherwise, treat as relative path
        return `http://localhost:8000/uploads/${firstImage}`;
      }
    }
    return null;
  };

  const mainImage = getMainImage();

  // Get all images for preview
  const getAllImages = () => {
    if (!images || images.length === 0) return [];
    
    return images.map(img => {
      if (typeof img === 'string') return img;
      return img.url || img.file_url || '';
    }).filter(Boolean);
  };

  const allImages = getAllImages();

  // Format price
  const formatPrice = (price) => {
    if (price === 0 || price === '0') return 'Free';
    return `$${parseFloat(price).toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Recent';
    }
  };

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  // Handle add to cart
  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  // Handle add to wishlist
  const handleAddToWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToWishlist) {
      onAddToWishlist(product);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col h-full ${className}`}>
      {/* Product Image - FIXED HEIGHT */}
      <div className="relative h-48 bg-gray-100 overflow-hidden flex-shrink-0">
        <Link to={`/products/${_id}`} className="block h-full">
          {mainImage && !imageError ? (
            <>
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
              <img
                src={mainImage}
                alt={title}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </Link>

        {/* Overlay Actions */}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handleAddToWishlist}
            className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Add to Wishlist"
          >
            <Heart className="w-4 h-4" />
          </button>
          <Link
            to={`/products/${_id}`}
            className="p-2 bg-white rounded-full shadow-md hover:bg-blue-50 hover:text-blue-600 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Link>
        </div>

        {/* Price Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            price === 0 || price === '0' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {formatPrice(price)}
          </span>
        </div>

        {/* Image Count Indicator */}
        {allImages.length > 1 && (
          <div className="absolute bottom-3 left-3 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
            +{allImages.length - 1} more
          </div>
        )}
      </div>

      {/* Product Info - FLEXIBLE CONTENT */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Category & Date - FIXED HEIGHT */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2 h-6">
          <span className="bg-gray-100 px-2 py-1 rounded truncate">{category}</span>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span className="whitespace-nowrap">{formatDate(createdAt)}</span>
          </div>
        </div>

        {/* Title - FIXED HEIGHT */}
        <Link to={`/products/${_id}`} className="block">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-2 hover:text-blue-600 transition-colors line-clamp-2 h-14 overflow-hidden">
            {title}
          </h3>
        </Link>

        {/* Description - FIXED HEIGHT */}
        <p className="text-gray-600 text-sm mb-3 line-clamp-2 h-10 overflow-hidden">
          {description}
        </p>

        {/* Rating & Downloads - FIXED HEIGHT */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3 h-5">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
            <span className="font-medium">{rating.toFixed(1)}</span>
            <span>({reviewCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="w-4 h-4 flex-shrink-0" />
            <span>{downloads.toLocaleString()}</span>
          </div>
        </div>

        {/* Seller Info - FIXED HEIGHT */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 h-5">
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            by {seller.name || seller.username || 'Unknown Seller'}
          </span>
        </div>

        {/* Tags - FIXED HEIGHT */}
        <div className="flex flex-wrap gap-1 mb-3 h-8 overflow-hidden">
          {tags && tags.length > 0 ? (
            <>
              {tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded whitespace-nowrap"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded whitespace-nowrap">
                  +{tags.length - 3}
                </span>
              )}
            </>
          ) : (
            <div className="h-6"></div> // Spacer when no tags
          )}
        </div>

        {/* SPACER - PUSHES BUTTONS TO BOTTOM */}
        <div className="flex-grow"></div>

        {/* Action Buttons - FIXED HEIGHT AT BOTTOM */}
        <div className="flex gap-2 h-10">
          <Link
            to={`/products/${_id}`}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center flex items-center justify-center"
          >
            View Details
          </Link>
          {price > 0 && (
            <button
              onClick={handleAddToCart}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
              title="Add to Cart"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

ProductCard.propTypes = {
  product: PropTypes.object.isRequired,
  onAddToCart: PropTypes.func,
  onAddToWishlist: PropTypes.func,
  className: PropTypes.string
};

export default ProductCard;