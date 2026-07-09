import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrashIcon, 
  PlusIcon, 
  MinusIcon, 
  ShoppingBagIcon,
  TagIcon,
  GiftIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { apiService } from '../services/Api';
import { ImageUtils } from '../utils/imageUtils';

const Cart = () => {
  const { 
    items: cartItems, 
    updateQuantity, 
    removeItem, 
    clearCart,
    totalItems,
    currentUserId,
    isLoggedIn,
    debugInfo,
    isLoading: cartLoading,
    error: cartError
  } = useCart();
  
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Create a placeholder image function
  const createPlaceholderImage = (title, width = 100, height = 80) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#4F46E5';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${Math.min(width, height) / 8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const shortTitle = title ? title.substring(0, 10) : 'Product';
    ctx.fillText(shortTitle, width / 2, height / 2);
    
    return canvas.toDataURL();
  };

  // Fetch recommended products
  useEffect(() => {
    const fetchRecommendedProducts = async () => {
      try {
        setLoading(true);
        const response = await apiService.getProducts({ limit: 4 });
        if (response && response.products) {
          const cartProductIds = cartItems.map(item => item.id);
          const filtered = response.products
            .filter(product => !cartProductIds.includes(product._id))
            .slice(0, 2)
            .map(product => ({
              id: product._id,
              title: product.title,
              price: product.price,
              originalPrice: product.original_price,
              image: product.images && product.images.length > 0 
                ? product.images[0] 
                : createPlaceholderImage(product.title, 80, 60),
              rating: product.rating || 0,
              category: product.category
            }));
          setRecommendedProducts(filtered);
        }
      } catch (error) {
        console.error('Error fetching recommended products:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if cart has items and user is logged in
    if (cartItems && cartItems.length > 0 && isLoggedIn) {
      fetchRecommendedProducts();
    }
  }, [cartItems, isLoggedIn]);

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (!isLoggedIn) {
      showError('Error', 'Please log in to modify cart');
      return;
    }

    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    
    try {
      const result = updateQuantity(productId, newQuantity);
      if (result.success) {
        showSuccess('Updated', 'Cart updated successfully');
      } else {
        showError('Error', result.error || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      showError('Error', 'Failed to update quantity');
    }
  };

  const handleRemoveItem = (productId) => {
    if (!isLoggedIn) {
      showError('Error', 'Please log in to modify cart');
      return;
    }

    try {
      const result = removeItem(productId);
      if (result.success) {
        showSuccess('Removed', 'Item removed from cart');
      } else {
        showError('Error', result.error || 'Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      showError('Error', 'Failed to remove item');
    }
  };

  const handleClearCart = () => {
    if (!isLoggedIn) {
      showError('Error', 'Please log in to modify cart');
      return;
    }

    try {
      const result = clearCart();
      if (result.success) {
        setPromoCode('');
        setAppliedPromo(null);
        setIsPromoApplied(false);
        showSuccess('Cleared', 'Cart cleared successfully');
      } else {
        showError('Error', result.error || 'Failed to clear cart');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      showError('Error', 'Failed to clear cart');
    }
  };

  const applyPromoCode = () => {
    if (!isLoggedIn) {
      showError('Error', 'Please log in to apply promo codes');
      return;
    }

    // Mock promo code validation
    const validCodes = {
      'SAVE10': { discount: 10, type: 'percentage' },
      'WELCOME': { discount: 50, type: 'fixed' },
      'STUDENT': { discount: 15, type: 'percentage' },
      'NOZAMA20': { discount: 20, type: 'percentage' }
    };

    if (validCodes[promoCode.toUpperCase()]) {
      setAppliedPromo(validCodes[promoCode.toUpperCase()]);
      setIsPromoApplied(true);
      showSuccess('Promo Applied', `${promoCode} has been applied successfully!`);
    } else {
      showError('Invalid Code', 'Please enter a valid promo code');
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setIsPromoApplied(false);
    setPromoCode('');
    showSuccess('Promo Removed', 'Promo code has been removed');
  };

  const handleImageError = (e) => {
    const productTitle = e.target.alt || 'Product';
    e.target.src = createPlaceholderImage(productTitle);
    e.target.onerror = null;
  };

  // Calculate totals manually
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscount = cartItems.reduce((sum, item) => {
    const originalPrice = item.originalPrice || item.price;
    return sum + ((originalPrice - item.price) * item.quantity);
  }, 0);
  
  let promoDiscount = 0;
  if (appliedPromo) {
    if (appliedPromo.type === 'percentage') {
      promoDiscount = subtotal * (appliedPromo.discount / 100);
    } else {
      promoDiscount = Math.min(appliedPromo.discount, subtotal);
    }
  }

  const total = Math.max(0, subtotal - promoDiscount);
  const calculatedTotalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Separate in-stock and out-of-stock items
  const inStockItems = cartItems.filter(item => item.status === 'approved' || !item.status);
  const outOfStockItems = cartItems.filter(item => item.status && item.status !== 'approved');

  // Get user display name
  const getUserDisplayName = () => {
    return user?.first_name || user?.firstName || user?.name || user?.email || 'User';
  };

  // Show loading state while cart is loading
  if (cartLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your cart...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if user is not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <ShoppingBagIcon className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Please log in to view your cart</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              You need to be logged in to add items to cart and make purchases.
            </p>
            <div className="space-x-4">
              <Link 
                to="/login"
                className="inline-flex items-center bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Log In
              </Link>
              <Link 
                to="/products"
                className="inline-flex items-center bg-gray-200 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Browse Products
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle empty cart or null/undefined cartItems
  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <ShoppingBagIcon className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Looks like you haven't added any AI tools to your cart yet. Start exploring our marketplace!
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                Logged in as: {getUserDisplayName()}
              </p>
              <p className="text-xs text-gray-400">
                User ID: {currentUserId || 'Not found'}
              </p>
            </div>
            <Link 
              to="/products"
              className="inline-flex items-center bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold mt-4"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="text-gray-600 mt-2">
              {calculatedTotalItems} items in your cart • Logged in as: {getUserDisplayName()}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              User ID: {currentUserId || 'Not found'}
            </p>
          </div>
          <Link 
            to="/products"
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Continue Shopping
          </Link>
        </div>

        {/* Show cart error if exists */}
        {cartError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800">{cartError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Cart Items</h2>
                  {cartItems && cartItems.length > 0 && (
                    <button
                      onClick={handleClearCart}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Clear Cart
                    </button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {/* In Stock Items */}
                {inStockItems.map((item, index) => (
                  <div key={`in-stock-${item.id || index}`} className="p-6">
                    <div className="flex items-start space-x-4">
                      <img 
                        src={ImageUtils.getImageUrl(item.image) || createPlaceholderImage(item.title)}
                        alt={item.title}
                        className="w-20 h-16 object-cover rounded-lg flex-shrink-0"
                        onError={handleImageError}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-4">
                            <h3 className="text-lg font-medium text-gray-900 mb-1">
                              <Link 
                                to={`/products/${item.id}`}
                                className="hover:text-blue-600"
                              >
                                {item.title}
                              </Link>
                            </h3>
                            <p className="text-gray-600 text-sm mb-2">
                              {item.description || 'No description available'}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>by {item.seller || 'Unknown Seller'}</span>
                              <span>•</span>
                              <span>{item.category || 'Uncategorized'}</span>
                              <span>•</span>
                              <span>{item.license || 'Standard'} License</span>
                            </div>
                            
                            {/* Status and Featured badges */}
                            <div className="flex items-center gap-2 mt-2">
                              {item.status && (
                                <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                                  item.status === 'approved' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {item.status}
                                </span>
                              )}
                              {item.featured && (
                                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  Featured
                                </span>
                              )}
                              {item.originalPrice && item.originalPrice > item.price && (
                                <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                  <TagIcon className="h-3 w-3 mr-1" />
                                  {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-600">Quantity:</span>
                            <div className="flex items-center border border-gray-300 rounded-lg">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                className="p-2 hover:bg-gray-100 rounded-l-lg"
                              >
                                <MinusIcon className="h-4 w-4" />
                              </button>
                              <span className="px-4 py-2 border-l border-r border-gray-300">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                className="p-2 hover:bg-gray-100 rounded-r-lg"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-bold text-gray-900">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                              {item.originalPrice && item.originalPrice > item.price && (
                                <span className="text-sm text-gray-500 line-through">
                                  ${(item.originalPrice * item.quantity).toFixed(2)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">${item.price} each</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Out of Stock Items */}
                {outOfStockItems.length > 0 && (
                  <>
                    <div className="px-6 py-4 bg-gray-50">
                      <div className="flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900">Items Under Review</span>
                      </div>
                    </div>
                    {outOfStockItems.map((item, index) => (
                      <div key={`out-of-stock-${item.id || index}`} className="p-6 bg-gray-50 opacity-60">
                        <div className="flex items-start space-x-4">
                          <img 
                            src={ImageUtils.getImageUrl(item.image) || createPlaceholderImage(item.title)}
                            alt={item.title}
                            className="w-20 h-16 object-cover rounded-lg flex-shrink-0 grayscale"
                            onError={handleImageError}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 pr-4">
                                <h3 className="text-lg font-medium text-gray-700 mb-1">{item.title}</h3>
                                <p className="text-gray-500 text-sm mb-2">
                                  {item.description || 'No description available'}
                                </p>
                                <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                                  {item.status || 'Under Review'}
                                </span>
                              </div>
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Recommended Items */}
            {recommendedProducts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">You might also like</h3>
                </div>
                <div className="p-6 space-y-4">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                  ) : (
                    recommendedProducts.map((item, index) => (
                      <div key={`recommended-${item.id || index}`} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <img 
                          src={ImageUtils.getImageUrl(item.image) || createPlaceholderImage(item.title, 80, 60)}
                          alt={item.title}
                          className="w-16 h-12 object-cover rounded-md flex-shrink-0"
                          onError={handleImageError}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{item.title}</h4>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center space-x-1">
                              <span className="text-sm font-bold text-gray-900">${item.price}</span>
                              {item.originalPrice && item.originalPrice > item.price && (
                                <span className="text-xs text-gray-500 line-through">${item.originalPrice}</span>
                              )}
                            </div>
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500">★ {item.rating.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                        <Link
                          to={`/products/${item.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-8">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Promo Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Promo Code
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isPromoApplied}
                    />
                    {!isPromoApplied ? (
                      <button
                        onClick={applyPromoCode}
                        disabled={!promoCode.trim()}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Apply
                      </button>
                    ) : (
                      <button
                        onClick={removePromoCode}
                        className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {isPromoApplied && (
                    <div className="mt-2 flex items-center text-sm text-green-600">
                      <CheckIcon className="h-4 w-4 mr-1" />
                      Promo code applied successfully!
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({inStockItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                    <span className="text-gray-900">${subtotal.toFixed(2)}</span>
                  </div>
                  
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Product Discounts</span>
                      <span className="text-green-600">-${totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Promo Code Discount ({promoCode})</span>
                      <span className="text-green-600">-${promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Processing Fee</span>
                    <span className="text-gray-900">Free</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Download Delivery</span>
                    <span className="text-gray-900">Instant</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
                  </div>
                  {(totalDiscount > 0 || promoDiscount > 0) && (
                    <p className="text-sm text-green-600 mt-1">
                      You saved ${(totalDiscount + promoDiscount).toFixed(2)}!
                    </p>
                  )}
                </div>

                {/* Checkout Button */}
                <div className="pt-4">
                  {inStockItems.length > 0 ? (
                    <Link
                      to="/checkout"
                      className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-center block"
                    >
                      Proceed to Checkout
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded-lg cursor-not-allowed font-semibold"
                    >
                      No Items Available for Checkout
                    </button>
                  )}
                </div>

                {/* Security Notice */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-start text-xs text-gray-500">
                    <CheckIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>
                      Secure checkout with 256-bit SSL encryption. Your payment information is protected.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Why Shop with Nozama.ai?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900 mb-1">Instant Access</h3>
                <p className="text-sm text-gray-600">Download your AI tools immediately after purchase with secure links.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900 mb-1">Quality Guaranteed</h3>
                <p className="text-sm text-gray-600">All tools are verified and reviewed by our expert community.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <CheckIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900 mb-1">24/7 Support</h3>
                <p className="text-sm text-gray-600">Get help from our technical support team whenever you need it.</p>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default Cart;