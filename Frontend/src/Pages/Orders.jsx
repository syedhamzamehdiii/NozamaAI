import React, { useState, useEffect } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/Api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    completed: 0,
    processing: 0,
    totalSpent: 0
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingItem, setReviewingItem] = useState(null);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    title: '',
    comment: ''
  });
  const [reviewedItems, setReviewedItems] = useState(new Set());
  const checkIfItemReviewed = (productId, orderId) => {
  const reviewKey = `${orderId}-${productId}`;
  const localReviews = JSON.parse(localStorage.getItem('userOrderReviews') || '{}');
  return localReviews[reviewKey] === true;
};
  const markItemAsReviewed = (productId, orderId) => {
  const reviewKey = `${orderId}-${productId}`;
  const localReviews = JSON.parse(localStorage.getItem('userOrderReviews') || '{}');
  localReviews[reviewKey] = true;
  localStorage.setItem('userOrderReviews', JSON.stringify(localReviews));
  
  setReviewedItems(prev => new Set([...prev, reviewKey]));
};
  // FIXED: Add missing downloading state
  const [downloadingItems, setDownloadingItems] = useState(new Set());
  
  // Add order details modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'completed', label: 'Completed' },
    { value: 'processing', label: 'Processing' },
    { value: 'pending', label: 'Pending' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'failed', label: 'Failed' }
  ];

  const dateOptions = [
    { value: 'all', label: 'All Time' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: '1year', label: 'Last Year' }
  ];

  useEffect(() => {
    fetchOrdersData();
  }, []);

  const fetchOrdersData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Updated API calls to match your backend endpoints
      const [userProfile, ordersResponse, orderStatsResponse] = await Promise.allSettled([
        fetchUserProfile(),
        fetchUserOrders(),
        fetchOrderStats()
      ]);

      // Handle user profile
      if (userProfile.status === 'fulfilled') {
        setUser(userProfile.value);
      } else {
        console.warn('Could not fetch user profile:', userProfile.reason);
        // Set default user for testing
        setUser({ 
          id: "temp_user_123",
          email: "user@example.com",
          first_name: "Test",
          last_name: "User"
        });
      }

      // Handle orders data
      if (ordersResponse.status === 'fulfilled') {
        const ordersData = ordersResponse.value;
        console.log('Raw orders data:', ordersData);
        
        const processedOrders = processOrdersData(ordersData);
        setOrders(processedOrders);
        calculateStats(processedOrders);
      } else {
        console.warn('Could not fetch orders:', ordersResponse.reason);
        setOrders([]);
        calculateStats([]);
      }

      // Handle order stats
      if (orderStatsResponse.status === 'fulfilled') {
        const statsData = orderStatsResponse.value;
        console.log('Order stats data:', statsData);
        
        setOrderStats({
          total: statsData.total_orders || 0,
          completed: statsData.completed_orders || 0,
          processing: statsData.pending_orders || 0,
          totalSpent: statsData.total_spent || 0
        });
      }

    } catch (err) {
      console.error('Error fetching orders data:', err);
      setError('Failed to load orders. Please try again.');
      setOrders([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  // Updated API call functions to match your backend
  const fetchUserProfile = async () => {
    try {
      // Try multiple endpoints for user profile
      const endpoints = [
        '/api/v1/users/me',
        '/api/v1/auth/profile', 
        '/api/v1/auth/me',
        '/api/v1/user/profile',
        '/api/v1/profile'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`http://localhost:8000${endpoint}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              // Add authentication headers if you have them
              // 'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`User profile from ${endpoint}:`, data);
            return data;
          }
        } catch (endpointError) {
          console.warn(`Failed to fetch from ${endpoint}:`, endpointError);
        }
      }
      
      throw new Error('All user profile endpoints failed');
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  };

  const fetchUserOrders = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        console.warn('No auth token found');
        return [];
      }

      console.log('🔑 Using token for orders request:', token.slice(-10));

      const response = await fetch('http://localhost:8000/api/v1/orders/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Orders response:', data);
        
        if (data.success && data.data) {
          return data.data;
        } else if (Array.isArray(data)) {
          return data;
        } else {
          return [];
        }
      } else {
        console.error('❌ Orders request failed:', response.status);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error(`Orders request failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  };

  const fetchOrderStats = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // If no token, return default stats
      if (!token) {
        return {
          total_orders: 0,
          completed_orders: 0,
          pending_orders: 0,
          total_spent: 0
        };
      }

      const response = await fetch('http://localhost:8000/api/v1/orders/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Add this line
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Order stats:', data);
        return data.success ? data.data : data;
      } else {
        if (response.status === 401) {
          console.log('Not authenticated for stats');
          return {
            total_orders: 0,
            completed_orders: 0,
            pending_orders: 0,
            total_spent: 0
          };
        }
        throw new Error(`Stats request failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching order stats:', error);
      return {
        total_orders: 0,
        completed_orders: 0,
        pending_orders: 0,
        total_spent: 0
      };
    }
  };

  const processOrdersData = (rawOrders) => {
    if (!Array.isArray(rawOrders)) {
      console.warn('Orders data is not an array:', rawOrders);
      return [];
    }

    return rawOrders.map((order, index) => {
      // Create a unique ID if none exists
      const orderId = order.id || order._id || order.order_id || `order_${Date.now()}_${index}`;
      
      return {
        id: orderId,
        date: order.created_at || order.date || order.order_date || new Date().toISOString(),
        status: order.status || 'pending',
        total: parseFloat(order.total_amount || order.amount || order.total || 0),
        items: processOrderItems(order.items || order.products || order.line_items || []),
        email: order.billing_address?.email || order.customer_email || order.email || user?.email || 'unknown@example.com',
        paymentMethod: formatPaymentMethod(order.payment_method || order.payment_method_id || 'Card'),
        paymentIntentId: order.stripe_payment_intent_id || order.payment_intent_id || null,
        notes: order.notes || order.description || '',
        completedAt: order.completed_at || order.fulfilled_at || null,
        billingAddress: order.billing_address || order.address || null,
        shippingAddress: order.shipping_address || null,
        currency: order.currency || 'USD',
        subtotal: parseFloat(order.subtotal || order.total_amount || order.amount || 0),
        tax: parseFloat(order.tax_amount || order.tax || 0),
        shipping: parseFloat(order.shipping_amount || order.shipping || 0),
        discount: parseFloat(order.discount_amount || order.discount || 0)
      };
    });
  };

  const processOrderItems = (items) => {
    if (!Array.isArray(items)) {
      console.warn('Order items is not an array:', items);
      return [];
    }

    return items.map((item, index) => {
      // Handle different item structures safely
      const itemId = item?.product_id || item?.id || item?.sku || `item-${index}`;
      const itemTitle = item?.product_title || item?.product_name || item?.name || item?.title || 'Unknown Product';
      const itemPrice = parseFloat(item?.price || item?.unit_price || 0);
      const itemQuantity = parseInt(item?.quantity || item?.qty || 1);

      // SAFE image handling - no placeholder, no errors
      let imageUrl = null;
      
      // Try to get image from various possible fields
      const possibleImageFields = ['image_url', 'image', 'product_image', 'thumbnail'];
      for (const field of possibleImageFields) {
        if (item?.[field] && !item[field].includes('placeholder')) {
          imageUrl = item[field];
          break;
        }
      }
      
      // Only process valid image URLs
      if (imageUrl && imageUrl.startsWith('/uploads/')) {
        imageUrl = `http://localhost:8000${imageUrl}`;
      }

      return {
        id: itemId,
        title: itemTitle,
        price: itemPrice,
        quantity: itemQuantity,
        image: imageUrl, // Will be null if no valid image
        downloadUrl: item?.download_url || item?.file_url || null,
        seller: item?.seller_name || item?.vendor_name || 'Nozama AI',
        productId: item?.product_id || item?.id || itemId,
        category: item?.category || 'AI Tools',
        sku: item?.sku || null,
        digital: item?.digital !== false, // Assume digital by default
        downloadCount: item?.download_count || 0,
        downloadExpiry: item?.download_expiry || null
      };
    });
  };

  const formatPaymentMethod = (paymentMethod) => {
    if (!paymentMethod || paymentMethod === 'Unknown') return 'Payment Method';
    
    // Handle Stripe payment method format
    if (typeof paymentMethod === 'object') {
      const { type, card } = paymentMethod;
      if (type === 'card' && card) {
        return `${card.brand?.toUpperCase() || 'CARD'} ****${card.last4 || '0000'}`;
      }
      return 'Card Payment';
    }
    
    // Handle string format
    if (typeof paymentMethod === 'string') {
      // Clean up common payment method strings
      if (paymentMethod.toLowerCase().includes('stripe')) return 'Card Payment';
      if (paymentMethod.toLowerCase().includes('paypal')) return 'PayPal';
      if (paymentMethod.toLowerCase().includes('apple')) return 'Apple Pay';
      if (paymentMethod.toLowerCase().includes('google')) return 'Google Pay';
      return paymentMethod;
    }
    
    return 'Card Payment';
  };

  const calculateStats = (ordersData) => {
    const stats = {
      total: ordersData.length,
      completed: ordersData.filter(order => order.status === 'completed').length,
      processing: ordersData.filter(order => ['processing', 'pending', 'confirmed'].includes(order.status)).length,
      totalSpent: ordersData
        .filter(order => ['completed', 'fulfilled'].includes(order.status))
        .reduce((sum, order) => sum + order.total, 0)
    };
    setOrderStats(prevStats => ({ ...prevStats, ...stats }));
  };

  useEffect(() => {
    let filtered = orders;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchLower) ||
        order.email.toLowerCase().includes(searchLower) ||
        order.items.some(item => 
          item.title.toLowerCase().includes(searchLower) ||
          item.seller.toLowerCase().includes(searchLower) ||
          (item.sku && item.sku.toLowerCase().includes(searchLower))
        )
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRange) {
        case '7days':
          filterDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          filterDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          filterDate.setDate(now.getDate() - 90);
          break;
        case '1year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(order => new Date(order.date) >= filterDate);
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, dateRange]);


// Add this useEffect after your existing useEffects
useEffect(() => {
  if (orders.length > 0) {
    // Initialize reviewed items set
    const localReviews = JSON.parse(localStorage.getItem('userOrderReviews') || '{}');
    const reviewKeys = Object.keys(localReviews).filter(key => localReviews[key]);
    setReviewedItems(new Set(reviewKeys));
  }
}, [orders]);



  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'fulfilled':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'processing':
      case 'pending':
      case 'confirmed':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'failed':
      case 'cancelled':
      case 'refunded':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'fulfilled':
        return 'bg-green-100 text-green-800';
      case 'processing':
      case 'pending':
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'cancelled':
      case 'refunded':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show order details modal
  const showOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetailsModal(true);
  };

  // Close order details modal
  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setShowOrderDetailsModal(false);
  };

  // FIXED: Corrected handleDownload function with proper parameter handling
  const handleDownload = async (item, order = null) => {
    try {
      // CRITICAL FIX: Validate input parameters
      if (!item) {
        console.error('❌ Download item is null or undefined');
        alert('❌ Download information is missing');
        return;
      }

      console.log('🔥 Starting download for:', item);
      
      const productId = item.productId || item.id;
      const productTitle = item.title || 'Unknown Product';
      
      if (!productId) {
        console.error('❌ No product ID found for download');
        alert('❌ No product ID found for download');
        return;
      }

      // Add to downloading set
      setDownloadingItems(prev => new Set([...prev, productId]));

      console.log('📥 Downloading product:', productId);

      try {
        // Try the backend endpoint
        const response = await fetch(`http://localhost:8000/api/v1/orders/download-product-files/${productId}`, {
          method: 'GET'
        });

        console.log('📡 Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Download failed:', errorText);
          
          if (response.status === 404) {
            throw new Error(`Files not available for "${productTitle}". Please contact support.`);
          } else if (response.status === 403) {
            throw new Error('You are not authorized to download this file.');
          } else {
            throw new Error(`Download failed: ${response.status} - ${errorText}`);
          }
        }

        // Handle the download
        const blob = await response.blob();
        console.log('📦 Blob size:', blob.size);

        if (blob.size === 0) {
          throw new Error('Downloaded file is empty');
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Create a safe filename
        const safeTitle = productTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        link.download = `${safeTitle}_files.zip`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('✅ Download completed successfully');
        alert(`✅ Downloaded: ${productTitle}`);

      } catch (downloadError) {
        console.error('❌ Download failed, creating mock download:', downloadError);
        
        // Create mock download for development
        const mockContent = `
# ${productTitle} - Download Package

Thank you for your purchase!

This is a mock download file for development purposes.

Product ID: ${productId}
Order ID: ${order?.id || 'N/A'}
Downloaded: ${new Date().toISOString()}

## Package Contents:
- Documentation
- Source files
- Examples
- License

For actual products, this would contain the real downloadable content.
        `;
        
        const blob = new Blob([mockContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${productTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_mock.txt`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(`✅ Mock download created for: ${productTitle}`);
      }

    } catch (error) {
      console.error('❌ Download error:', error);
      alert(`❌ ${error.message}`);
    } finally {
      // Remove from downloading set
      setDownloadingItems(prev => {
        const newSet = new Set(prev);
        const productId = item?.productId || item?.id;
        if (productId) {
          newSet.delete(productId);
        }
        return newSet;
      });
    }
  };

  const resendEmail = async (orderId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/orders/${orderId}/resend-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        alert('Order confirmation email resent successfully!');
      } else {
        throw new Error(`Failed to resend email: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to resend email:', error);
      if (error.status === 429) {
        alert('Too many email requests. Please wait before trying again.');
      } else {
        alert('Failed to resend email. Please try again later.');
      }
    }
  };

  const reorderItems = async (order) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/orders/${order.id}/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          items: order.items.map(item => ({
            product_id: item.productId,
            quantity: item.quantity
          }))
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully added ${result.items_added || order.items.length} items to cart!`);
      } else {
        throw new Error(`Reorder failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to reorder items:', error);
      alert('Failed to add items to cart. Please try adding them manually.');
    }
  };

  // FIXED: Safe item image rendering
  const renderItemImage = (item) => {
    const hasValidImage = item.image && !item.image.includes('placeholder');
    
    if (hasValidImage) {
      return (
        <img
          src={item.image}
          alt={item.title}
          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'flex';
          }}
        />
      );
    }
    
    return (
      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-blue-500 text-2xl">📦</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Orders</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchOrdersData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <DocumentDuplicateIcon className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">No Orders Yet</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              You haven't placed any orders yet. Start exploring our AI tools marketplace!
            </p>
            <Link 
              to="/products"
              className="inline-flex items-center bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Browse AI Tools
            </Link>
          </div>
        </div>
      </div>
    );
  }

const openReviewModal = (item, order) => {
  const productId = item.productId || item.id;
  const orderId = order.id;
  
  // Check if already reviewed for this specific order
  if (checkIfItemReviewed(productId, orderId)) {
    alert('You have already reviewed this item for this order');
    return;
  }
  
  setReviewingItem({ ...item, orderId: orderId });
  setShowReviewModal(true);
};

const closeReviewModal = () => {
  setShowReviewModal(false);
  setReviewingItem(null);
  setReviewData({ rating: 5, title: '', comment: '' });
};

const submitReview = async () => {
  if (!reviewData.comment.trim()) {
    alert('Please write a review comment');
    return;
  }

  try {
    const productId = reviewingItem.productId || reviewingItem.id;
    const orderId = reviewingItem.orderId;
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    let userName = 'Anonymous';
    
    try {
      const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
      userName = userInfo.first_name || userInfo.name || 'User';
    } catch (e) {
      console.log('Could not get user info');
    }
    
    const response = await fetch(`http://localhost:8000/api/v1/products/${productId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        // Pass user id explicitly for backend fallback auth
        'X-User-Id': (JSON.parse(localStorage.getItem('user') || '{}').id) ||
                     (JSON.parse(localStorage.getItem('user') || '{}')._id) || ''
      },
      body: JSON.stringify({
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        user_name: userName,
        order_id: orderId
      })
    });

    if (response.ok) {
      alert('Review submitted successfully!');
      closeReviewModal();
      
      // Mark as reviewed for this specific order
      markItemAsReviewed(productId, orderId);
      
      const newReview = {
        id: Date.now(),
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        user_name: userName,
        created_at: new Date().toISOString(),
        product_id: productId,
        order_id: orderId
      };
      
      const existingReviews = JSON.parse(localStorage.getItem('productReviews') || '{}');
      if (!existingReviews[productId]) existingReviews[productId] = [];
      existingReviews[productId].unshift(newReview);
      localStorage.setItem('productReviews', JSON.stringify(existingReviews));
      
    } else {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to submit review');
    }
  } catch (error) {
    console.error('Review submission error:', error);
    alert(`Failed to submit review: ${error.message}`);
  }
};

const checkExistingReview = async (productId) => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const response = await fetch(`http://localhost:8000/api/v1/reviews/user/my-reviews?product_id=${productId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const reviews = await response.json();
      return reviews.length > 0;
    }
  } catch (error) {
    console.error('Error checking existing review:', error);
  }
  return false;
};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-600 mt-2">
            Track and manage your AI tool purchases
            {user && ` • Welcome back, ${user.first_name || 'User'}!`}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders, products, or sellers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {dateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              More Filters
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">All Methods</option>
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="apple-pay">Apple Pay</option>
                    <option value="google-pay">Google Pay</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="amount-desc">Highest Amount</option>
                    <option value="amount-asc">Lowest Amount</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
          <button
            onClick={fetchOrdersData}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Refresh
          </button>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Order Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Order {order.id}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center">
                          <CalendarDaysIcon className="h-4 w-4 mr-1" />
                          {formatDate(order.date)}
                        </div>
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1 capitalize">{order.status}</span>
                          </span>
                        </div>
                        <span>•</span>
                        <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span className="font-semibold">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-4 md:mt-0">
                    <button
                      onClick={() => showOrderDetails(order)}
                      className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-6">
                <div className="space-y-4">
                  {order.items.map((item, index) => {
                    const isDownloading = downloadingItems.has(item.productId || item.id);
                    
                    return (
                      <div key={`${item.id}-${index}`} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                        {/* FIXED: Safe image rendering */}
                        {renderItemImage(item)}
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-medium text-gray-900 mb-1">
                            <Link 
                              to={`/products/${item.productId || item.id}`}
                              className="hover:text-blue-600"
                            >
                              {item.title}
                            </Link>
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>by {item.seller}</span>
                            <span>•</span>
                            <span>Quantity: {item.quantity}</span>
                            <span>•</span>
                            <span className="font-semibold">{formatCurrency(item.price)}</span>
                            {item.sku && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-xs">SKU: {item.sku}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
{/* Updated Download and Review buttons with conditional logic */}
<div className="flex items-center space-x-2">
  {(order.status === 'completed' || order.status === 'fulfilled') ? (
    <>
      {item.digital !== false ? (
        <button
          onClick={() => handleDownload(item, order)}
          disabled={isDownloading}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isDownloading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              <span>Downloading...</span>
            </>
          ) : (
            <>
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Download
            </>
          )}
        </button>
      ) : (
        <span className="text-xs text-gray-500">Physical item</span>
      )}
      
      {/* Conditional Review button */}
      {checkIfItemReviewed(item.productId || item.id, order.id) ? (
        <button
          disabled
          className="flex items-center px-3 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed text-sm"
        >
          <StarIcon className="h-4 w-4 mr-1" />
          Reviewed
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Review button clicked for:', item.title);
            openReviewModal(item, order);
          }}
          className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          <StarIcon className="h-4 w-4 mr-1" />
          Review
        </button>
      )}
    </>
  ) : (
    <div className="flex items-center space-x-2">
      <span className="flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
        <ClockIcon className="h-4 w-4 mr-2" />
        {order.status === 'processing' ? 'Processing' : order.status === 'confirmed' ? 'Confirmed' : 'Pending'}
      </span>
      <span className="text-xs text-gray-500">Review available after completion</span>
    </div>
  )}
</div>
                      </div>
                    );
                  })}
                </div>

                {/* Order Footer */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                      <span>Payment: {order.paymentMethod}</span>
                      <span>•</span>
                      <span>Email: {order.email}</span>
                      {order.paymentIntentId && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-xs">ID: {order.paymentIntentId.slice(-8)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Currency: {order.currency || 'USD'}</span>
                    </div>
                    <div className="mt-2 md:mt-0 text-right">
                      {order.subtotal !== order.total && (
                        <div className="text-xs text-gray-500 mb-1">
                          Subtotal: {formatCurrency(order.subtotal)}
                          {order.tax > 0 && <span> + Tax: {formatCurrency(order.tax)}</span>}
                          {order.shipping > 0 && <span> + Shipping: {formatCurrency(order.shipping)}</span>}
                          {order.discount > 0 && <span> - Discount: {formatCurrency(order.discount)}</span>}
                        </div>
                      )}
                      <span className="font-semibold text-gray-900">Total: {formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredOrders.length === 0 && (searchTerm !== '' || statusFilter !== 'all' || dateRange !== 'all') && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <MagnifyingGlassIcon className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateRange('all');
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Order Summary Stats */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {orderStats.total}
              </div>
              <div className="text-sm text-gray-600">Total Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {orderStats.completed}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {orderStats.processing}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatCurrency(orderStats.totalSpent)}
              </div>
              <div className="text-sm text-gray-600">Total Spent</div>
            </div>
          </div>
        </div>

        {/* Debug Information (Remove in production) */}
        

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help with Your Orders?</h3>
          <p className="text-gray-600 mb-4">
            Our support team is here to help you with order issues, downloads, or any questions you may have.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link 
              to="/contact"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <EnvelopeIcon className="h-4 w-4 mr-2" />
              Contact Support
            </Link>
            
            <button
              onClick={fetchOrdersData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Order Details - #{selectedOrder.id}
              </h3>
              <button
                onClick={closeOrderDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Order Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-500">Order Date</p>
                <p className="text-sm text-gray-900">{formatDate(selectedOrder.date)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusIcon(selectedOrder.status)}
                  <span className="ml-1 capitalize">{selectedOrder.status}</span>
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Amount</p>
                <p className="text-sm text-gray-900">{formatCurrency(selectedOrder.total)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Method</p>
                <p className="text-sm text-gray-900">{selectedOrder.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-sm text-gray-900">{selectedOrder.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Currency</p>
                <p className="text-sm text-gray-900">{selectedOrder.currency || 'USD'}</p>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Items Ordered</h4>
              <div className="space-y-4">
                {selectedOrder.items.map((item, index) => {
                  const isDownloading = downloadingItems.has(item.productId || item.id);
                  
                  return (
                    <div key={`${item.id}-${index}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        {renderItemImage(item)}
                        <div>
                          <h5 className="font-medium text-gray-900">{item.title}</h5>
                          <p className="text-sm text-gray-500">by {item.seller}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span>Quantity: {item.quantity}</span>
                            <span>•</span>
                            <span className="font-semibold">{formatCurrency(item.price)}</span>
                            {item.sku && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-xs">SKU: {item.sku}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Download and review buttons in modal */}
<div className="flex items-center space-x-2">
  {(selectedOrder.status === 'completed' || selectedOrder.status === 'fulfilled') && item.digital !== false ? (
    <>
      <button
        onClick={() => handleDownload(item, selectedOrder)}
        disabled={isDownloading}
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDownloading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            <span>Downloading...</span>
          </>
        ) : (
          <>
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Download
          </>
        )}
      </button>
      
      {/* Conditional review button in modal */}
      {checkIfItemReviewed(item.productId || item.id, selectedOrder.id) ? (
        <button
          disabled
          className="flex items-center px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
        >
          <StarIcon className="h-4 w-4 mr-2" />
          Reviewed
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closeOrderDetails();
            setTimeout(() => openReviewModal(item, selectedOrder), 100);
          }}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <StarIcon className="h-4 w-4 mr-2" />
          Review
        </button>
      )}
    </>
  ) : (
    <span className="flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-lg">
      {selectedOrder.status === 'completed' ? 'Not Available' : 'Processing'}
    </span>
  )}
</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary in Modal */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.tax > 0 && (
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Tax:</span>
                  <span>{formatCurrency(selectedOrder.tax)}</span>
                </div>
              )}
              {selectedOrder.shipping > 0 && (
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Shipping:</span>
                  <span>{formatCurrency(selectedOrder.shipping)}</span>
                </div>
              )}
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Discount:</span>
                  <span>-{formatCurrency(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold text-gray-900 border-t border-gray-200 pt-2">
                <span>Total:</span>
                <span>{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={closeOrderDetails}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>

            </div>
          </div>
        </div>
      )}


            {/* Review Modal */}
{showReviewModal && reviewingItem && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Write a Review</h3>
        <button
          onClick={closeReviewModal}
          className="text-gray-500 hover:text-gray-700"
        >
          <XCircleIcon className="h-6 w-6" />
        </button>
      </div>
      
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-2">{reviewingItem.title}</h4>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setReviewData(prev => ({ ...prev, rating: star }))}
                className={`h-6 w-6 ${star <= reviewData.rating ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                <StarIcon className="h-6 w-6" />
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Review Title</label>
          <input
            type="text"
            value={reviewData.title}
            onChange={(e) => setReviewData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Brief summary of your experience"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
          <textarea
            value={reviewData.comment}
            onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Share your thoughts about this product..."
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          onClick={closeReviewModal}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submitReview}
          disabled={!reviewData.comment.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Review
        </button>
      </div>
    </div>
  </div>
)}


    </div>

    
  );
};

export default Orders;