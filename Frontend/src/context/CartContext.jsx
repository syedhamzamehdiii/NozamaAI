import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Initial state
const initialState = {
  items: [],
  totalItems: 0,
  subtotal: 0,
  discount: 0,
  tax: 0,
  total: 0,
  isLoading: true,
  error: null,
  promoCode: null,
  shippingCost: 0,
  currentUserId: null // Track current user
};

// Action types
const CART_ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  APPLY_PROMO_CODE: 'APPLY_PROMO_CODE',
  REMOVE_PROMO_CODE: 'REMOVE_PROMO_CODE',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  LOAD_CART: 'LOAD_CART',
  SAVE_CART: 'SAVE_CART',
  SET_USER: 'SET_USER', // New action to set current user
  CLEAR_USER_CART: 'CLEAR_USER_CART' // New action to clear cart for user switch
};

// Helper function to calculate totals
const calculateTotals = (items, promoCode = null) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate discount from individual item discounts
  const itemDiscount = items.reduce((sum, item) => {
    const itemDiscount = item.originalPrice ? (item.originalPrice - item.price) * item.quantity : 0;
    return sum + itemDiscount;
  }, 0);

  // Calculate promo code discount
  let promoDiscount = 0;
  if (promoCode) {
    if (promoCode.type === 'percentage') {
      promoDiscount = subtotal * (promoCode.discount / 100);
    } else if (promoCode.type === 'fixed') {
      promoDiscount = Math.min(promoCode.discount, subtotal);
    }
  }

  const totalDiscount = itemDiscount + promoDiscount;
  const tax = 0;
  const shippingCost = 0;
  const total = Math.max(0, subtotal - promoDiscount + tax + shippingCost);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    subtotal,
    discount: totalDiscount,
    tax,
    shippingCost,
    total,
    totalItems
  };
};

// ✅ USER-SPECIFIC localStorage helpers
const CART_STORAGE_PREFIX = 'nozama_cart_user_'; // User-specific prefix

// Get user-specific storage key
const getUserCartKey = (userId) => {
  if (!userId) return null;
  return `${CART_STORAGE_PREFIX}${userId}`;
};

// Save cart for specific user
const saveCartToStorage = (cartData, userId) => {
  if (!userId) {
    console.warn('⚠️ Cannot save cart: No user ID provided');
    return;
  }

  try {
    const userCartKey = getUserCartKey(userId);
    const dataToSave = {
      items: cartData.items,
      promoCode: cartData.promoCode,
      userId: userId,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(userCartKey, JSON.stringify(dataToSave));
    console.log(`✅ Cart saved for user ${userId}:`, dataToSave.items.length, 'items');
  } catch (error) {
    console.error('❌ Failed to save cart to localStorage:', error);
  }
};

// Load cart for specific user
const loadCartFromStorage = (userId) => {
  if (!userId) {
    console.log('📭 No user ID provided, returning empty cart');
    return { items: [], promoCode: null };
  }

  try {
    const userCartKey = getUserCartKey(userId);
    const savedData = localStorage.getItem(userCartKey);
    
    if (savedData) {
      const parsed = JSON.parse(savedData);
      console.log(`✅ Cart loaded for user ${userId}:`, parsed.items?.length || 0, 'items');
      console.log('📅 Cart saved at:', parsed.timestamp);
      return {
        items: parsed.items || [],
        promoCode: parsed.promoCode || null
      };
    } else {
      console.log(`📭 No saved cart found for user ${userId}`);
    }
  } catch (error) {
    console.error('❌ Failed to load cart from localStorage:', error);
  }
  return { items: [], promoCode: null };
};

// Clear cart for specific user
const clearUserCartFromStorage = (userId) => {
  if (!userId) return;
  
  try {
    const userCartKey = getUserCartKey(userId);
    localStorage.removeItem(userCartKey);
    console.log(`🧹 Cart cleared for user ${userId}`);
  } catch (error) {
    console.error('❌ Failed to clear user cart from localStorage:', error);
  }
};

// Get current user ID from localStorage/auth context
const getCurrentUserId = () => {
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      return userData.id || userData._id || userData.email;
    }
  } catch (error) {
    console.error('Error getting current user ID:', error);
  }
  return null;
};

// Reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.SET_USER: {
      const newUserId = action.payload;
      console.log(`👤 Setting user in cart: ${newUserId}`);
      
      // If user changed, clear current cart and load new user's cart
      if (state.currentUserId !== newUserId) {
        const userCart = loadCartFromStorage(newUserId);
        const totals = calculateTotals(userCart.items, userCart.promoCode);
        
        return {
          ...state,
          currentUserId: newUserId,
          items: userCart.items,
          promoCode: userCart.promoCode,
          ...totals,
          isLoading: false,
          error: null
        };
      }
      
      return {
        ...state,
        currentUserId: newUserId,
        isLoading: false
      };
    }

    case CART_ACTIONS.CLEAR_USER_CART: {
      console.log('🧹 Clearing cart for user switch');
      return {
        ...initialState,
        isLoading: false,
        currentUserId: null
      };
    }

    case CART_ACTIONS.ADD_ITEM: {
      if (!state.currentUserId) {
        console.error('❌ Cannot add item: No user logged in');
        return {
          ...state,
          error: 'User not logged in'
        };
      }

      const existingItemIndex = state.items.findIndex(item => item.id === action.payload.id);
      let newItems;

      if (existingItemIndex >= 0) {
        newItems = state.items.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: item.quantity + (action.payload.quantity || 1) }
            : item
        );
        console.log('🔄 Updated existing item quantity:', action.payload.title);
      } else {
        newItems = [...state.items, { ...action.payload, quantity: action.payload.quantity || 1 }];
        console.log('➕ Added new item to cart:', action.payload.title);
      }

      const totals = calculateTotals(newItems, state.promoCode);

      return {
        ...state,
        items: newItems,
        ...totals,
        error: null
      };
    }

    case CART_ACTIONS.REMOVE_ITEM: {
      if (!state.currentUserId) {
        return {
          ...state,
          error: 'User not logged in'
        };
      }

      const removedItem = state.items.find(item => item.id === action.payload);
      const newItems = state.items.filter(item => item.id !== action.payload);
      const totals = calculateTotals(newItems, state.promoCode);

      console.log('🗑️ Removed item from cart:', removedItem?.title);

      return {
        ...state,
        items: newItems,
        ...totals
      };
    }

    case CART_ACTIONS.UPDATE_QUANTITY: {
      if (!state.currentUserId) {
        return {
          ...state,
          error: 'User not logged in'
        };
      }

      const { id, quantity } = action.payload;
      
      if (quantity <= 0) {
        const removedItem = state.items.find(item => item.id === id);
        const newItems = state.items.filter(item => item.id !== id);
        const totals = calculateTotals(newItems, state.promoCode);
        
        console.log('🗑️ Removed item (quantity 0):', removedItem?.title);
        
        return {
          ...state,
          items: newItems,
          ...totals
        };
      }

      const newItems = state.items.map(item => 
        item.id === id ? { ...item, quantity } : item
      );
      const totals = calculateTotals(newItems, state.promoCode);

      console.log('🔄 Updated quantity for item:', id, 'to:', quantity);

      return {
        ...state,
        items: newItems,
        ...totals
      };
    }

    case CART_ACTIONS.CLEAR_CART:
      console.log('🧹 Clearing entire cart');
      return {
        ...state,
        items: [],
        promoCode: null,
        ...calculateTotals([], null)
      };

    case CART_ACTIONS.APPLY_PROMO_CODE: {
      const totals = calculateTotals(state.items, action.payload);
      
      console.log('🎫 Applied promo code:', action.payload.code);
      
      return {
        ...state,
        promoCode: action.payload,
        ...totals,
        error: null
      };
    }

    case CART_ACTIONS.REMOVE_PROMO_CODE: {
      const totals = calculateTotals(state.items, null);
      
      console.log('🗑️ Removed promo code');
      
      return {
        ...state,
        promoCode: null,
        ...totals
      };
    }

    case CART_ACTIONS.LOAD_CART: {
      const totals = calculateTotals(action.payload.items, action.payload.promoCode);
      
      console.log('📥 Loaded cart from storage:', action.payload.items.length, 'items');
      
      return {
        ...state,
        items: action.payload.items || [],
        promoCode: action.payload.promoCode || null,
        ...totals,
        isLoading: false
      };
    }

    case CART_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case CART_ACTIONS.SET_ERROR:
      console.error('❌ Cart error:', action.payload);
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case CART_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

// Create context
const CartContext = createContext();

// Cart Provider Component
export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // ✅ Monitor user changes and load appropriate cart
  useEffect(() => {
    const checkUserAndLoadCart = () => {
      const currentUserId = getCurrentUserId();
      
      if (currentUserId !== state.currentUserId) {
        console.log(`👤 User changed from ${state.currentUserId} to ${currentUserId}`);
        dispatch({
          type: CART_ACTIONS.SET_USER,
          payload: currentUserId
        });
      } else if (!state.currentUserId && !currentUserId) {
        // No user logged in
        dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
      }
    };

    // Check immediately
    checkUserAndLoadCart();

    // Also listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'user') {
        console.log('👤 User change detected in localStorage');
        checkUserAndLoadCart();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Check periodically in case of auth changes
    const interval = setInterval(checkUserAndLoadCart, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [state.currentUserId]);

  // ✅ Save cart to localStorage whenever cart state changes (user-specific)
  useEffect(() => {
    if (!state.isLoading && state.currentUserId) {
      const cartData = {
        items: state.items,
        promoCode: state.promoCode
      };
      saveCartToStorage(cartData, state.currentUserId);
    }
  }, [state.items, state.promoCode, state.isLoading, state.currentUserId]);

  // Add item to cart
  const addItem = (product, quantity = 1) => {
    if (!state.currentUserId) {
      return { success: false, error: 'Please log in to add items to cart' };
    }

    try {
      console.log('🛒 Adding item to cart for user:', state.currentUserId, '- Product:', product.title);

      const cartItem = {
        id: product.id || product._id,
        title: product.title || product.name,
        price: parseFloat(product.price) || 0,
        originalPrice: product.originalPrice || product.original_price,
        image: product.image || product.images?.[0] || null,
        seller: product.seller || product.seller_name || 'Unknown Seller',
        category: product.category || 'Uncategorized',
        license: product.license || product.license_type || 'Standard',
        description: product.description || product.short_description || '',
        status: product.status || 'approved',
        quantity: parseInt(quantity) || 1
      };

      if (!cartItem.id || !cartItem.title || cartItem.price <= 0) {
        throw new Error('Invalid product data: missing required fields');
      }

      dispatch({
        type: CART_ACTIONS.ADD_ITEM,
        payload: cartItem
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error adding item to cart:', error);
      dispatch({
        type: CART_ACTIONS.SET_ERROR,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  };

  // Remove item from cart
  const removeItem = (itemId) => {
    if (!state.currentUserId) {
      return { success: false, error: 'Please log in to modify cart' };
    }

    dispatch({
      type: CART_ACTIONS.REMOVE_ITEM,
      payload: itemId
    });
    return { success: true };
  };

  // Update item quantity
  const updateQuantity = (itemId, quantity) => {
    if (!state.currentUserId) {
      return { success: false, error: 'Please log in to modify cart' };
    }

    dispatch({
      type: CART_ACTIONS.UPDATE_QUANTITY,
      payload: { id: itemId, quantity: parseInt(quantity) || 0 }
    });
    return { success: true };
  };

  // Clear entire cart
  const clearCart = () => {
    if (!state.currentUserId) {
      return { success: false, error: 'Please log in to clear cart' };
    }

    dispatch({ type: CART_ACTIONS.CLEAR_CART });
    clearUserCartFromStorage(state.currentUserId);
    return { success: true };
  };

  // Apply promo code
  const applyPromoCode = async (code) => {
    if (!state.currentUserId) {
      return { success: false, error: 'Please log in to apply promo codes' };
    }

    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });

      const validCodes = {
        'SAVE10': { discount: 10, type: 'percentage', description: '10% off your order' },
        'WELCOME': { discount: 50, type: 'fixed', description: '$50 off your first order' },
        'STUDENT': { discount: 15, type: 'percentage', description: '15% student discount' },
        'NOZAMA20': { discount: 20, type: 'percentage', description: '20% off everything' }
      };

      await new Promise(resolve => setTimeout(resolve, 1000));

      const promoData = validCodes[code.toUpperCase()];
      
      if (promoData) {
        dispatch({
          type: CART_ACTIONS.APPLY_PROMO_CODE,
          payload: {
            code: code.toUpperCase(),
            discount: promoData.discount,
            type: promoData.type,
            description: promoData.description
          }
        });

        dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
        return { success: true, message: 'Promo code applied successfully!' };
      } else {
        dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
        return { success: false, error: 'Invalid promo code' };
      }
    } catch (error) {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
      return { success: false, error: 'Failed to validate promo code' };
    }
  };

  // Remove promo code
  const removePromoCode = () => {
    dispatch({ type: CART_ACTIONS.REMOVE_PROMO_CODE });
  };

  // Get item by ID
  const getItem = (itemId) => {
    return state.items.find(item => item.id === itemId);
  };

  // Check if item is in cart
  const isInCart = (itemId) => {
    return state.items.some(item => item.id === itemId);
  };

  // Get item quantity
  const getItemQuantity = (itemId) => {
    const item = state.items.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  };

  // Get cart summary for checkout
  const getCartSummary = () => {
    return {
      items: state.items,
      subtotal: state.subtotal,
      discount: state.discount,
      tax: state.tax,
      shippingCost: state.shippingCost,
      total: state.total,
      totalItems: state.totalItems,
      promoCode: state.promoCode
    };
  };

  // Validate cart
  const validateCart = async () => {
    if (!state.currentUserId) {
      return { success: false, error: 'Please log in to validate cart' };
    }

    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const validationResult = {
        valid: true,
        items: state.items,
        message: 'Cart validation successful'
      };

      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
      return { success: true, data: validationResult };
    } catch (error) {
      dispatch({
        type: CART_ACTIONS.SET_ERROR,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: CART_ACTIONS.CLEAR_ERROR });
  };

  // Debug function
  const debugCart = () => {
    const allUserCarts = {};
    
    // Get all cart keys from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CART_STORAGE_PREFIX)) {
        const userId = key.replace(CART_STORAGE_PREFIX, '');
        try {
          const cartData = JSON.parse(localStorage.getItem(key));
          allUserCarts[userId] = {
            itemCount: cartData.items?.length || 0,
            lastUpdated: cartData.timestamp
          };
        } catch (e) {
          allUserCarts[userId] = { error: 'Failed to parse' };
        }
      }
    }

    
    return {
      currentUserId: state.currentUserId,
      userEmail: getCurrentUserId(),
      cartsByUser: allUserCarts
    };
  };

  const value = {
    // State
    items: state.items,
    totalItems: state.totalItems,
    subtotal: state.subtotal,
    discount: state.discount,
    tax: state.tax,
    shippingCost: state.shippingCost,
    total: state.total,
    isLoading: state.isLoading,
    error: state.error,
    promoCode: state.promoCode,
    currentUserId: state.currentUserId, // ✅ Expose current user ID
    isLoggedIn: !!state.currentUserId, // ✅ Helper to check if user is logged in

    // Actions
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    applyPromoCode,
    removePromoCode,
    clearError,

    // Utilities
    getItem,
    isInCart,
    getItemQuantity,
    getCartSummary,
    validateCart,
    debugCart,

    // Computed properties
    isEmpty: state.items.length === 0,
    itemCount: state.items.length,
    
    // ✅ Debug info for development
    debugInfo: debugCart()
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;