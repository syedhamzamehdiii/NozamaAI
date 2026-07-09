// src/pages/Wishlist.jsx - FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  HeartIcon,
  ShoppingCartIcon,
  TrashIcon,
  StarIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import SmartImage from '../components/SmartImage';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const { showSuccess, showError } = useNotification();

  // Memoized function to load wishlist
  const loadWishlist = useCallback(() => {
    try {
      console.log('🔄 Loading wishlist from localStorage...');
      
      const savedWishlist = localStorage.getItem('wishlist');
      console.log('📦 Raw wishlist data:', savedWishlist);
      
      if (savedWishlist && savedWishlist !== '[]' && savedWishlist !== 'null') {
        try {
          const parsedWishlist = JSON.parse(savedWishlist);
          console.log('✅ Parsed wishlist:', parsedWishlist);
          
          if (Array.isArray(parsedWishlist)) {
            setWishlistItems(parsedWishlist);
            console.log('✅ Set wishlist items:', parsedWishlist.length, 'items');
            return parsedWishlist.length;
          } else {
            console.log('❌ Parsed data is not an array');
          }
        } catch (parseError) {
          console.error('❌ Parse error:', parseError);
        }
      } else {
        console.log('ℹ️ No valid wishlist data found');
      }
      
      // Only set empty array if we don't already have items
      setWishlistItems(prev => prev.length > 0 ? prev : []);
      return 0;
    } catch (error) {
      console.error('❌ Error loading wishlist:', error);
      if (showError) {
        showError('Error', 'Failed to load wishlist items');
      }
      return 0;
    }
  }, [showError]);

  // Load wishlist on mount - ONLY ONCE
  useEffect(() => {
    let mounted = true;
    
    const initializeWishlist = async () => {
      if (!mounted) return;
      
      setLoading(true);
      const itemCount = loadWishlist();
      console.log('🚀 Initial wishlist load complete:', itemCount, 'items');
      
      if (mounted) {
        setLoading(false);
      }
    };

    // Small delay to ensure component is fully mounted
    const timer = setTimeout(initializeWishlist, 50);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []); // NO DEPENDENCIES - only run once on mount

  // Listen for wishlist updates from other components
  useEffect(() => {
    const handleWishlistUpdate = (event) => {
      console.log('🔔 Wishlist update event received:', event.detail);
      
      // Don't reload if we're in loading state
      if (!loading) {
        setTimeout(() => {
          const itemCount = loadWishlist();
          console.log('🔄 Reloaded after update:', itemCount, 'items');
        }, 100);
      }
    };

    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    
    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
    };
  }, [loading, loadWishlist]);

  // Save wishlist whenever items change (but not during initial load)
  useEffect(() => {
    if (!loading && wishlistItems.length >= 0) {
      try {
        const dataToSave = JSON.stringify(wishlistItems);
        localStorage.setItem('wishlist', dataToSave);
        console.log('💾 Saved wishlist to localStorage:', dataToSave);
      } catch (error) {
        console.error('❌ Error saving wishlist:', error);
      }
    }
  }, [wishlistItems, loading]);

  // Remove item from wishlist
  const removeFromWishlist = useCallback((productId) => {
    try {
      console.log('🗑️ Removing item from wishlist:', productId);
      setWishlistItems(prev => {
        const updated = prev.filter(item => item.id !== productId);
        console.log('✅ Removed item, new length:', updated.length);
        return updated;
      });
      
      if (showSuccess) {
        showSuccess('Removed from Wishlist', 'Item has been removed from your wishlist');
      }
    } catch (error) {
      console.error('❌ Error removing from wishlist:', error);
      if (showError) {
        showError('Error', 'Failed to remove item from wishlist');
      }
    }
  }, [showSuccess, showError]);

  // Add item to cart
  const addToCart = useCallback((product) => {
    try {
      const result = addItem(product, 1);
      if (result && result.success !== false) {
        if (showSuccess) {
          showSuccess('Added to Cart', `${product.title} has been added to your cart`);
        }
      }
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      if (showError) {
        showError('Error', 'Failed to add product to cart');
      }
    }
  }, [addItem, showSuccess, showError]);

  // Clear entire wishlist
  const clearWishlist = useCallback(() => {
    try {
      console.log('🧹 Clearing entire wishlist');
      setWishlistItems([]);
      if (showSuccess) {
        showSuccess('Wishlist Cleared', 'All items have been removed from your wishlist');
      }
    } catch (error) {
      console.error('❌ Error clearing wishlist:', error);
      if (showError) {
        showError('Error', 'Failed to clear wishlist');
      }
    }
  }, [showSuccess, showError]);

  // Render star rating
  const renderStars = useCallback((rating) => {
    return [...Array(5)].map((_, i) => (
      <StarIcon 
        key={i} 
        className={`h-4 w-4 ${i < Math.floor(rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your wishlist...</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty wishlist state
  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">My Wishlist</h1>
            <p className="text-gray-600">Save items you love for later</p>
          </div>

          {/* Empty State */}
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full mb-6">
              <HeartIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Browse our products and click the heart icon to add items to your wishlist
            </p>
            <Link
              to="/products"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <EyeIcon className="h-5 w-5" />
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
            <p className="text-gray-600 mt-2">{wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''} saved</p>
          </div>
          {wishlistItems.length > 0 && (
            <button
              onClick={clearWishlist}
              className="text-red-600 hover:text-red-700 font-medium flex items-center gap-2"
            >
              <TrashIcon className="h-5 w-5" />
              Clear All
            </button>
          )}
        </div>

        {/* Wishlist Items */}
        <div className="space-y-6">
          {wishlistItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-6">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <SmartImage
                      src={item.images?.[0] || item.image}
                      alt={item.title || 'Product'}
                      className="w-24 h-24 object-cover rounded-lg"
                      fallbackClassName="w-24 h-24 rounded-lg"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link
                          to={`/products/${item.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors block"
                        >
                          {item.title || 'Untitled Product'}
                        </Link>
                        
                        <p className="text-gray-600 mt-1 line-clamp-2">
                          {item.description || 'No description available'}
                        </p>

                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center">
                            {renderStars(item.rating)}
                            <span className="ml-2 text-sm text-gray-600">
                              ({item.rating?.toFixed(1) || '0.0'})
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {item.downloads || 0} downloads
                          </span>
                        </div>

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {item.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                            {item.tags.length > 3 && (
                              <span className="text-xs text-gray-500 px-2 py-1">
                                +{item.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-blue-600">
                          ${item.price || '0.00'}
                        </div>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <div className="text-sm text-gray-500 line-through">
                            ${item.originalPrice}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={() => addToCart(item)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <ShoppingCartIcon className="h-4 w-4" />
                        Add to Cart
                      </button>

                      <Link
                        to={`/products/${item.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                      >
                        <EyeIcon className="h-4 w-4" />
                        View Details
                      </Link>

                      <button
                        onClick={() => removeFromWishlist(item.id)}
                        className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove from wishlist"
                      >
                        <HeartIconSolid className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Continue Shopping */}
        <div className="text-center mt-12">
          <Link
            to="/products"
            className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2"
          >
            <EyeIcon className="h-5 w-5" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Wishlist;