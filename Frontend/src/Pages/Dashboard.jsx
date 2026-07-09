import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBagIcon, 
  CpuChipIcon, 
  ClockIcon, 
  EyeIcon,
  ChartBarIcon,
  BellIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth(); // Get user from auth context
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalPurchases: 0,
    activeOrders: 0,
    totalSpent: 0.0,
    toolsOwned: 0
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Add notifications modal state
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🏠 Starting REAL dashboard data fetch...');

      // Get the auth token (check multiple sources like your backend does)
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      console.log('🔑 Using token for dashboard:', token.substring(0, 20) + '...');

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // Initialize dashboard data
      const dashboardData = {
        stats: { totalPurchases: 0, activeOrders: 0, totalSpent: 0.0, toolsOwned: 0 },
        recentOrders: [],
        recentProducts: [],
        notifications: []
      };

      // 1. FETCH REAL ORDERS DATA (Priority #1)
      console.log('📦 Fetching orders from /api/v1/orders...');
      
      try {
        const ordersResponse = await fetch('http://localhost:8000/api/v1/orders/', {
          method: 'GET',
          headers: headers
        });

        console.log('📊 Orders API response status:', ordersResponse.status);

        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          console.log('📦 Orders data received:', ordersData);

          if (ordersData.success && ordersData.data && Array.isArray(ordersData.data)) {
            const orders = ordersData.data;
            
            // Calculate real stats from orders
            const completedOrders = orders.filter(order => order.status === 'completed');
            const activeOrdersCount = orders.filter(order => 
              order.status === 'processing' || order.status === 'pending'
            ).length;
            
            const totalSpent = orders.reduce((sum, order) => {
              if (order.status === 'completed') {
                return sum + (parseFloat(order.total_amount || 0));
              }
              return sum;
            }, 0);

            dashboardData.stats = {
              totalPurchases: completedOrders.length,
              activeOrders: activeOrdersCount,
              totalSpent: totalSpent,
              toolsOwned: completedOrders.length // Tools owned = completed purchases
            };

            // Process recent orders (last 5)
            dashboardData.recentOrders = orders
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .slice(0, 5)
              .map(order => ({
                id: order.id || order._id,
                productName: getProductNameFromOrder(order),
                status: order.status || 'pending',
                date: formatOrderDate(order.created_at),
                amount: parseFloat(order.total_amount || 0),
                downloadUrl: order.status === 'completed' ? '#' : null
              }));

            console.log('✅ Real orders processed:', {
              totalOrders: orders.length,
              completedOrders: completedOrders.length,
              activeOrders: activeOrdersCount,
              totalSpent: totalSpent,
              recentOrders: dashboardData.recentOrders.length
            });
          }
        } else {
          console.error('❌ Orders API failed:', ordersResponse.status, ordersResponse.statusText);
          // Try alternative orders stats endpoint
          await tryOrdersStatsEndpoint(headers, dashboardData);
        }
      } catch (ordersError) {
        console.error('❌ Orders fetch failed:', ordersError);
        // Try fallback endpoint
        await tryOrdersStatsEndpoint(headers, dashboardData);
      }

      // 2. FETCH PRODUCTS FOR "RECENTLY VIEWED" SECTION
      console.log('🎯 Fetching products...');
      
      try {
        const productsResponse = await fetch('http://localhost:8000/api/v1/products/?limit=3', {
          method: 'GET',
          headers: headers
        });

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          console.log('🛍️ Products data received:', productsData);

          let products = [];
          if (productsData.products && Array.isArray(productsData.products)) {
            products = productsData.products;
          } else if (Array.isArray(productsData)) {
            products = productsData;
          }

          dashboardData.recentProducts = products.slice(0, 3).map(product => ({
            id: product.id || product._id,
            name: product.title || product.name || 'AI Tool',
            price: parseFloat(product.price || 0),
            image: getProductImage(product),
            rating: product.rating || 4.5
          }));

          console.log('✅ Products processed:', dashboardData.recentProducts.length);
        }
      } catch (productsError) {
        console.warn('⚠️ Products fetch failed:', productsError.message);
        // Add fallback products
        dashboardData.recentProducts = [
          {
            id: 'explore',
            name: 'Explore AI Tools',
            price: 0,
            image: '/api/v1/placeholder/100x80',
            rating: 5.0
          }
        ];
      }

      // 3. Generate smart notifications based on real data
      const userName = user?.first_name || user?.firstName || 'User';
      dashboardData.notifications = generateSmartNotifications(userName, dashboardData.stats, dashboardData.recentOrders);

      // 4. Update all state with real data
      setStats(dashboardData.stats);
      setRecentOrders(dashboardData.recentOrders);
      setRecentlyViewed(dashboardData.recentProducts);
      setNotifications(dashboardData.notifications);

      console.log('🎉 Dashboard data loaded successfully with REAL data:', {
        stats: dashboardData.stats,
        ordersCount: dashboardData.recentOrders.length,
        productsCount: dashboardData.recentProducts.length
      });

    } catch (err) {
      console.error('❌ Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to try the orders stats endpoint
  const tryOrdersStatsEndpoint = async (headers, dashboardData) => {
    try {
      console.log('🔄 Trying orders stats endpoint...');
      
      const statsResponse = await fetch('http://localhost:8000/api/v1/orders/stats', {
        method: 'GET',
        headers: headers
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('📊 Orders stats received:', statsData);

        if (statsData.success && statsData.data) {
          const data = statsData.data;
          dashboardData.stats = {
            totalPurchases: data.completed_orders || 0,
            activeOrders: data.pending_orders || 0,
            totalSpent: parseFloat(data.total_spent || 0),
            toolsOwned: data.completed_orders || 0
          };

          // Process recent orders from stats
          if (data.recent_orders && Array.isArray(data.recent_orders)) {
            dashboardData.recentOrders = data.recent_orders.slice(0, 5).map(order => ({
              id: order.id || order._id,
              productName: getProductNameFromOrder(order),
              status: order.status || 'completed',
              date: formatOrderDate(order.created_at),
              amount: parseFloat(order.total_amount || 0),
              downloadUrl: order.status === 'completed' ? '#' : null
            }));
          }

          console.log('✅ Stats endpoint worked:', dashboardData.stats);
        }
      }
    } catch (statsError) {
      console.warn('⚠️ Stats endpoint also failed:', statsError.message);
    }
  };

  // Helper function to extract product name from order
  const getProductNameFromOrder = (order) => {
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      const firstItem = order.items[0];
      return firstItem.product_name || firstItem.title || firstItem.name || 'AI Tool';
    }
    return order.product_name || 'AI Tool Purchase';
  };

  // Helper function to format order date
  const formatOrderDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString();
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Recent';
    }
  };

  // Helper function to get product image with fallback
  const getProductImage = (product) => {
    const normalize = (raw) => {
      if (!raw) return '/api/v1/placeholder/100x80';
      if (raw.startsWith('http')) return raw;
      const clean = raw.replace(/\\/g, '/');
      if (clean.startsWith('/uploads/')) return `http://localhost:8000${clean}`;
      return `http://localhost:8000/uploads/${clean}`;
    };
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return normalize(product.images[0]);
    }
    if (product.image) {
      return normalize(product.image);
    }
    return '/api/v1/placeholder/100x80';
  };

  // Helper function to generate smart notifications
  const generateSmartNotifications = (userName, stats, recentOrders) => {
    const notifications = [
      {
        id: 1,
        message: `Welcome back, ${userName}! Your dashboard is ready.`,
        time: 'Just now',
        type: 'success',
        read: false
      }
    ];

    if (stats.totalPurchases > 0) {
      notifications.push({
        id: 2,
        message: `You have ${stats.totalPurchases} completed purchase${stats.totalPurchases > 1 ? 's' : ''} worth ${formatCurrency(stats.totalSpent)}`,
        time: '5 minutes ago',
        type: 'info',
        read: false
      });
    } else {
      notifications.push({
        id: 2,
        message: 'Start shopping to see your orders and statistics here',
        time: '5 minutes ago',
        type: 'info',
        read: false
      });
    }

    if (stats.activeOrders > 0) {
      notifications.push({
        id: 3,
        message: `You have ${stats.activeOrders} active order${stats.activeOrders > 1 ? 's' : ''} being processed`,
        time: '1 hour ago',
        type: 'success',
        read: false
      });
    } else {
      notifications.push({
        id: 3,
        message: 'Check out our latest AI tools and updates',
        time: '1 hour ago',
        type: 'info',
        read: false
      });
    }

    // Add more sample notifications
    notifications.push(
      {
        id: 4,
        message: 'New AI tools have been added to the marketplace',
        time: '2 hours ago',
        type: 'info',
        read: true
      },
      {
        id: 5,
        message: 'Your account security settings were updated',
        time: '1 day ago',
        type: 'success',
        read: true
      },
      {
        id: 6,
        message: 'Don\'t miss out on our latest features and updates',
        time: '2 days ago',
        type: 'info',
        read: true
      }
    );

    return notifications;
  };

  // Handle notifications modal
  const openNotificationsModal = () => {
    setShowNotificationsModal(true);
  };

  const closeNotificationsModal = () => {
    setShowNotificationsModal(false);
  };

  // Mark notification as read
  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'info':
        return 'bg-gray-100 text-gray-800';
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

  const generateAvatarSVG = (initials, bgColor = '#4F46E5', textColor = '#FFFFFF') => {
    const svg = `
      <svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" fill="${bgColor}" rx="24"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="18" font-weight="bold" 
              fill="${textColor}" text-anchor="middle" dominant-baseline="central">${initials}</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    const firstName = user.first_name || user.firstName || '';
    const lastName = user.last_name || user.lastName || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          <p className="mt-2 text-sm text-gray-500">Fetching real data from your orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Error Loading Dashboard</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <div className="mt-4 space-x-3">
            <button 
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
            <Link 
              to="/orders"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              View Orders
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.first_name || user?.firstName || 'User'}! Here's what's happening with your AI tools.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingBagIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPurchases}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSpent)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CpuChipIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tools {user?.role === 'seller' ? 'Listed' : 'Owned'}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.toolsOwned}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                  <Link 
                    to="/orders" 
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentOrders.length > 0 ? recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900">{order.productName}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span>Order #{String(order.id).slice(-8)}</span>
                          <span className="mx-2">•</span>
                          <span>{order.date}</span>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(order.amount)}</p>
                        {order.downloadUrl && (
                          <Link
                            to={`/orders/${order.id}`}
                            className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            View Details
                          </Link>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <ShoppingBagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">No orders yet. Start shopping!</p>
                      <Link 
                        to="/products"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                      >
                        Browse Products
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Featured Products */}
            <div className="bg-white rounded-lg shadow mt-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Featured Products</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recentlyViewed.map((item) => (
                    <Link 
                      key={item.id}
                      to={`/products/${item.id}`}
                      className="group border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-20 object-cover rounded-md mb-3"
                        onError={(e) => {
                          e.target.src = '/api/v1/placeholder/100x80';
                        }}
                      />
                      <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 mb-1">
                        {item.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(item.price)}</span>
                        <span className="text-xs text-gray-500">★ {item.rating}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-6 space-y-3">
                <Link 
                  to="/products"
                  className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <CpuChipIcon className="h-5 w-5 mr-3 text-gray-400" />
                  Browse AI Tools
                </Link>
                {user?.role === 'seller' && (
                  <Link 
                    to="/seller"
                    className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    <PlusIcon className="h-5 w-5 mr-3 text-gray-400" />
                    Sell Your Tools
                  </Link>
                )}
                <Link 
                  to="/orders"
                  className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <EyeIcon className="h-5 w-5 mr-3 text-gray-400" />
                  View Orders
                </Link>
                <Link 
                  to="/profile"
                  className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <ChartBarIcon className="h-5 w-5 mr-3 text-gray-400" />
                  Profile Settings
                </Link>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {notifications.slice(0, 3).map((notification) => (
                    <div key={notification.id} className="flex items-start">
                      <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 mr-3 ${
                        notification.type === 'success' ? 'bg-green-400' : 'bg-blue-400'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* FIXED: Working "View all notifications" button */}
                <button 
                  onClick={openNotificationsModal}
                  className="mt-4 w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all notifications
                </button>
              </div>
            </div>

            {/* User Profile Card */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                {user?.picture || user?.avatar ? (
                  <img 
                    src={user.picture || user.avatar} 
                    alt={user.first_name || user.firstName}
                    className="h-12 w-12 rounded-full mr-3"
                    onError={(e) => {
                      e.target.src = generateAvatarSVG(getUserInitials());
                    }}
                  />
                ) : (
                  <img 
                    src={generateAvatarSVG(getUserInitials())}
                    alt="Profile"
                    className="h-12 w-12 rounded-full mr-3"
                  />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {user?.first_name || user?.firstName} {user?.last_name || user?.lastName}
                  </h3>
                  <p className="text-sm text-gray-600 capitalize">{user?.role || 'User'}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Member since {user?.created_at ? new Date(user.created_at).getFullYear() : 'recently'}
              </p>
              <Link 
                to="/profile"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                View Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* FIXED: Notifications Modal - Now in the correct location! */}
      {showNotificationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <BellIcon className="h-6 w-6 text-gray-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">All Notifications</h3>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {notifications.filter(n => !n.read).length} new
                  </span>
                )}
              </div>
              <button
                onClick={closeNotificationsModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Mark all as read button */}
            {notifications.filter(n => !n.read).length > 0 && (
              <div className="mb-4">
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Mark all as read
                </button>
              </div>
            )}
            
            {/* All Notifications List */}
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    notification.read 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1">
                      <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1 mr-3 ${
                        notification.type === 'success' ? 'bg-green-400' : 
                        notification.type === 'info' ? 'bg-blue-400' : 'bg-gray-400'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${
                          notification.read ? 'text-gray-600' : 'text-gray-900 font-medium'
                        }`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center mt-2">
                          <p className="text-xs text-gray-500">{notification.time}</p>
                          {!notification.read && (
                            <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty state */}
            {notifications.length === 0 && (
              <div className="text-center py-8">
                <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No notifications yet</p>
              </div>
            )}
            
            {/* Modal Footer */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {notifications.length} total notifications
              </div>
              <button
                onClick={closeNotificationsModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;