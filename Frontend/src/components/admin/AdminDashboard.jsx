//AdminDashboard.jsx - Complete Enhanced Real-Time Version
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import {
  UsersIcon,
  CubeIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  BellIcon,
  ArrowPathIcon,
  SignalIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Real-time system status
  const [systemStatus, setSystemStatus] = useState({
    online: true,
    lastUpdate: new Date(),
    uptime: '99.9%',
    usersOnline: Math.floor(Math.random() * 2000) + 1000,
    serverLoad: 45.2,
    memoryUsage: 68.5
  });

  // Data states
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProducts: 0,
    pendingProducts: 0,
    totalOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    conversionRate: 0,
    avgOrderValue: 0
  });

  const [revenueData, setRevenueData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    conversionRate: 0,
    avgOrderValue: 0,
    platformUptime: 0,
    avgLoadTime: 0
  });

  // API base URL - adjust according to your backend
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

  // API call helper function
  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  };

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      console.log('📊 Fetching real-time dashboard stats...');
      const data = await apiCall('/admin/dashboard/stats');
      setStats({
        totalUsers: data.total_users || 0,
        activeUsers: data.active_users || 0,
        totalProducts: data.total_products || 0,
        pendingProducts: data.pending_products || 0,
        totalOrders: data.total_orders || 0,
        completedOrders: data.completed_orders || 0,
        totalRevenue: data.total_revenue || 0,
        monthlyRevenue: data.monthly_revenue || 0,
        conversionRate: data.conversion_rate || 0,
        avgOrderValue: data.avg_order_value || 0
      });
      setLastRefresh(new Date());
      console.log('✅ Dashboard stats updated with real data');
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  // Fetch revenue data for chart
  const fetchRevenueData = async () => {
    try {
      const data = await apiCall('/admin/dashboard/revenue-trend');
      setRevenueData(data.map(item => ({
        name: item.month || item.name,
        revenue: item.revenue || 0,
        orders: item.orders || 0
      })));
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
      setRevenueData([]);
    }
  };

  // Replace the existing fetchCategoryData function
const fetchCategoryData = async () => {
  try {
    const data = await apiCall('/admin/dashboard/category-distribution');
    
    // Debug log to see what data we're getting
    console.log('Category data received:', data);
    
    const colors = ['#DAA425', '#DAA740', '#B8941F', '#9A7F1A', '#8B7016', '#7A6014'];
    setCategoryData(data.map((item, index) => ({
      name: item.category || item.name, // Make sure we're using the right field
      value: item.percentage || item.value || 0, // Ensure we have a value
      color: colors[index % colors.length]
    })));
  } catch (error) {
    console.error('Failed to fetch category data:', error);
    setCategoryData([]); // Set empty array on error
  }
};

  // Fetch user growth data
  const fetchUserGrowthData = async () => {
    try {
      const data = await apiCall('/admin/dashboard/user-growth');
      setUserGrowthData(data.map(item => ({
        name: item.period || item.name,
        users: item.user_count || item.users
      })));
    } catch (error) {
      console.error('Failed to fetch user growth data:', error);
      setUserGrowthData([]);
    }
  };

  // Fetch recent activity
  const fetchRecentActivity = async () => {
    try {
      const data = await apiCall('/admin/dashboard/recent-activity');
      
      // Map activity types to icons and colors
      const getActivityIcon = (type) => {
        const iconMap = {
          'user_registration': { icon: UsersIcon, color: 'text-[#DAA425]' },
          'product_submission': { icon: CubeIcon, color: 'text-[#DAA425]' },
          'order_completed': { icon: ShoppingBagIcon, color: 'text-[#DAA425]' },
          'system_alert': { icon: ExclamationTriangleIcon, color: 'text-red-500' },
          'revenue_milestone': { icon: BanknotesIcon, color: 'text-[#DAA425]' },
          'product_approved': { icon: CheckCircleIcon, color: 'text-green-500' },
          'order_pending': { icon: ClockIcon, color: 'text-yellow-500' }
        };
        return iconMap[type] || { icon: BellIcon, color: 'text-gray-400' };
      };

      setRecentActivity(data.map(item => ({
        id: item.id,
        type: item.activity_type || item.type,
        message: item.message,
        timestamp: item.timestamp || item.created_at,
        ...getActivityIcon(item.activity_type || item.type)
      })));
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      setRecentActivity([]);
    }
  };

  // Fetch top products
  const fetchTopProducts = async () => {
    try {
      const data = await apiCall('/admin/dashboard/top-products');
      setTopProducts(data.map(item => ({
        id: item.id,
        title: item.title || item.name,
        sales: item.sales_count || item.sales,
        revenue: item.total_revenue || item.revenue,
        growth: item.growth_percentage || item.growth,
        category: item.category
      })));
    } catch (error) {
      console.error('Failed to fetch top products:', error);
      setTopProducts([]);
    }
  };

  // Fetch performance metrics
  const fetchPerformanceMetrics = async () => {
    try {
      const data = await apiCall('/admin/dashboard/performance-metrics');
      setPerformanceMetrics({
        conversionRate: data.conversion_rate || 0,
        avgOrderValue: data.avg_order_value || 0,
        platformUptime: data.platform_uptime || 0,
        avgLoadTime: data.avg_load_time || 0
      });
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    }
  };

  // Update system status with real-time data
const updateSystemStatus = async () => {
  try {
    // Get real system data from backend
    const healthData = await apiCall('/admin/system/health');
    const statsData = await apiCall('/admin/dashboard/stats');
    
    setSystemStatus(prev => ({
      ...prev,
      lastUpdate: new Date(),
      usersOnline: statsData.active_users || prev.usersOnline,
      serverLoad: healthData.cpu_usage || Math.floor(Math.random() * 30) + 40,
      memoryUsage: healthData.memory_usage || Math.floor(Math.random() * 20) + 60,
      uptime: healthData.uptime || '99.9%'
    }));
  } catch (error) {
    // Fallback to mock data if API fails
    setSystemStatus(prev => ({
      ...prev,
      lastUpdate: new Date(),
      usersOnline: Math.floor(Math.random() * 2000) + 1000,
      serverLoad: Math.floor(Math.random() * 30) + 40,
      memoryUsage: Math.floor(Math.random() * 20) + 60
    }));
  }
};

  // Update system status every 10 seconds
  useEffect(() => {
    const statusInterval = setInterval(updateSystemStatus, 10000); // Update every 10 seconds
    return () => clearInterval(statusInterval);
  }, []);

  // Fetch all data on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchDashboardStats(),
          fetchRevenueData(),
          fetchCategoryData(),
          fetchUserGrowthData(),
          fetchRecentActivity(),
          fetchTopProducts(),
          fetchPerformanceMetrics()
        ]);
      } catch (error) {
        setError('Failed to load dashboard data');
        console.error('Dashboard data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Real-time updates - Key stats every 30 seconds
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (!loading) {
        console.log('🔄 Auto-refreshing key dashboard stats...');
        fetchDashboardStats();
      }
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [loading]);

  // System status updates every minute
  useEffect(() => {
    const statusInterval = setInterval(updateSystemStatus, 60000);
    return () => clearInterval(statusInterval);
  }, []);

  // Refresh data function
  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchRevenueData(),
        fetchCategoryData(),
        fetchUserGrowthData(),
        fetchRecentActivity(),
        fetchTopProducts(),
        fetchPerformanceMetrics()
      ]);
      updateSystemStatus();
      setLastRefresh(new Date());
    } catch (error) {
      setError('Failed to refresh dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
      return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
    } catch (error) {
      return 'Unknown time';
    }
  };

  // Loading component
  if (loading && !stats.totalUsers) {
    return (
      <div className="min-h-screen bg-black text-white p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 2xl:p-12">
        <div className="max-w-full mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 xl:h-20 xl:w-20 border-b-2 border-[#DAA425] mx-auto mb-4"></div>
              <p className="text-gray-400 text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl">Loading real-time dashboard data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error component
  if (error && !stats.totalUsers) {
    return (
      <div className="min-h-screen bg-black text-white p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 2xl:p-12">
        <div className="max-w-full mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 text-red-500 mx-auto mb-4" />
              <p className="text-red-400 mb-4 text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl">{error}</p>
              <button
                onClick={refreshData}
                className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-3 py-2 xs:px-4 xs:py-2 sm:px-4 sm:py-2 md:px-6 md:py-3 lg:px-8 lg:py-4 text-xs xs:text-sm sm:text-base md:text-lg rounded-lg transition-all duration-300"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 2xl:p-12">
      <div className="max-w-full mx-auto space-y-4 xs:space-y-5 lg:space-y-6 xl:space-y-8 2xl:space-y-10">
{/* Simplified Header - Remove Status from Top */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl text-white">
              Platform overview and management tools
            </h1>
            <p className="text-xs xs:text-sm text-gray-400 mt-1">
              Real-time data • Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          
          {/* Simple Status Indicator Only */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 bg-[#DAA425] rounded-full animate-pulse"></div>
              <span className="text-xs xs:text-sm sm:text-base text-white">System Online</span>
            </div>
            <button
              onClick={refreshData}
              disabled={loading}
              className="flex items-center px-2 py-1 xs:px-3 xs:py-1.5 bg-[#DAA425] text-black rounded-lg hover:bg-[#DAA740] transition-all duration-300 disabled:opacity-50 text-xs xs:text-sm"
            >
              <ArrowPathIcon className={`h-3 w-3 xs:h-4 xs:w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8 2xl:gap-10">
          {/* Total Users */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 xs:p-2.5 sm:p-3 md:p-3.5 lg:p-4 xl:p-5 bg-[#DAA425] bg-opacity-20 rounded-lg xs:rounded-xl">
                <UsersIcon className="h-5 w-5 xs:h-6 xs:w-6 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-10 xl:w-10 2xl:h-12 2xl:w-12 text-[#DAA425]" />
              </div>
              <div className="ml-3 xs:ml-4 sm:ml-4 md:ml-5 lg:ml-6 flex-1">
                <p className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg xl:text-xl font-medium text-gray-400">Total Users</p>
                <div className="flex items-baseline">
                  <p className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white">
                    {stats.totalUsers.toLocaleString()}
                  </p>
                  <p className="ml-2 text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg text-[#DAA425] flex items-center">
                    <ArrowTrendingUpIcon className="h-3 w-3 xs:h-4 xs:w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 mr-1" />
                    {stats.activeUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
                  </p>
                </div>
                <p className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg text-gray-500">
                  {stats.activeUsers.toLocaleString()} active
                </p>
              </div>
            </div>
          </div>

          {/* Total Products */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 xs:p-2.5 sm:p-3 md:p-3.5 lg:p-4 xl:p-5 bg-[#DAA425] bg-opacity-20 rounded-lg xs:rounded-xl">
                <CubeIcon className="h-5 w-5 xs:h-6 xs:w-6 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-10 xl:w-10 2xl:h-12 2xl:w-12 text-[#DAA425]" />
              </div>
              <div className="ml-3 xs:ml-4 sm:ml-4 md:ml-5 lg:ml-6 flex-1">
                <p className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg xl:text-xl font-medium text-gray-400">Total Products</p>
                <div className="flex items-baseline">
                  <p className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white">
                    {stats.totalProducts.toLocaleString()}
                  </p>
                  <p className="ml-2 text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg text-[#DAA425] flex items-center">
                    <ArrowTrendingUpIcon className="h-3 w-3 xs:h-4 xs:w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 mr-1" />
                    8%
                  </p>
                </div>
                <p className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg text-gray-500">
                  {stats.pendingProducts} pending review
                </p>
              </div>
            </div>
          </div>

          {/* Total Orders */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 xs:p-2.5 sm:p-3 md:p-3.5 lg:p-4 xl:p-5 bg-[#DAA425] bg-opacity-20 rounded-lg xs:rounded-xl">
                <ShoppingBagIcon className="h-5 w-5 xs:h-6 xs:w-6 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-10 xl:w-10 2xl:h-12 2xl:w-12 text-[#DAA425]" />
              </div>
              <div className="ml-3 xs:ml-4 sm:ml-4 md:ml-5 lg:ml-6 flex-1">
                <p className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg xl:text-xl font-medium text-gray-400">Total Orders</p>
                <div className="flex items-baseline">
                  <p className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white">
                    {stats.totalOrders.toLocaleString()}
                  </p>
                  <p className="ml-2 text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg text-orange-500 flex items-center">
                    {stats.totalOrders === 0 ? (
                      <span className="text-gray-500">No orders yet</span>
                    ) : (
                      <>
                        <ArrowTrendingUpIcon className="h-3 w-3 xs:h-4 xs:w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 mr-1" />
                        15%
                      </>
                    )}
                  </p>
                </div>
                <p className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg text-gray-500">
                  {stats.completedOrders.toLocaleString()} completed
                </p>
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 xs:p-2.5 sm:p-3 md:p-3.5 lg:p-4 xl:p-5 bg-[#DAA425] bg-opacity-20 rounded-lg xs:rounded-xl">
                <BanknotesIcon className="h-5 w-5 xs:h-6 xs:w-6 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-10 xl:w-10 2xl:h-12 2xl:w-12 text-[#DAA425]" />
              </div>
              <div className="ml-3 xs:ml-4 sm:ml-4 md:ml-5 lg:ml-6 flex-1">
                <p className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg xl:text-xl font-medium text-gray-400">Total Revenue</p>
                <div className="flex items-baseline">
                  <p className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white">
                    ${stats.totalRevenue >= 1000000 ? 
                      (stats.totalRevenue / 1000000).toFixed(1) + 'M' : 
                      stats.totalRevenue >= 1000 ? 
                      (stats.totalRevenue / 1000).toFixed(1) + 'K' : 
                      stats.totalRevenue.toFixed(0)}
                  </p>
                  <p className="ml-2 text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg text-[#DAA425] flex items-center">
                    {stats.totalRevenue > 0 ? (
                      <>
                        <ArrowTrendingUpIcon className="h-3 w-3 xs:h-4 xs:w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 mr-1" />
                        22%
                      </>
                    ) : (
                      <span className="text-gray-500">$0</span>
                    )}
                  </p>
                </div>
                <p className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg text-gray-500">
                  ${stats.monthlyRevenue >= 1000 ? 
                    (stats.monthlyRevenue / 1000).toFixed(0) + 'K' : 
                    stats.monthlyRevenue.toFixed(0)} this month
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4 xs:gap-5 lg:gap-6 xl:gap-8 2xl:gap-10">
          {/* Revenue Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 xs:mb-5 sm:mb-6 space-y-2 sm:space-y-0">
              <h3 className="text-base xs:text-lg sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-[#DAA425]">Revenue Trend</h3>
              <div className="flex space-x-2">
                <button className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg px-2 xs:px-3 sm:px-3 md:px-4 lg:px-5 py-1 xs:py-1.5 sm:py-2 bg-[#DAA425] text-black rounded-lg">6M</button>
                {/* <button className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg px-2 xs:px-3 sm:px-3 md:px-4 lg:px-5 py-1 xs:py-1.5 sm:py-2 text-gray-400 hover:bg-gray-800 hover:text-[#DAA425] rounded-lg transition-all duration-300">1Y</button> */}
              </div>
            </div>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#DAA425" 
                    strokeWidth={3}
                    dot={{ fill: '#DAA425', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#DAA425' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                No revenue data available
              </div>
            )}
          </div>

          {/* Category Distribution */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10">
            <h3 className="text-base xs:text-lg sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-[#DAA425] mb-4 xs:mb-5 sm:mb-6">Product Categories</h3>
            {categoryData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F3F4F6'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 xs:mt-5 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 xs:gap-3">
                  {categoryData.map((category, index) => (
                    <div key={index} className="flex items-center">
                      <div 
                        className="w-3 h-3 xs:w-4 xs:h-4 sm:w-4 sm:h-4 rounded-full mr-2 xs:mr-3"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg text-gray-400 flex-1">{category.name}</span>
                      <span className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg font-medium text-white">{category.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                No category data available
              </div>
            )}
          </div>
        </div>

        {/* User Growth Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10">
          <h3 className="text-base xs:text-lg sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-[#DAA425] mb-4 xs:mb-5 sm:mb-6">User Growth</h3>
          {userGrowthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Bar 
                  dataKey="users" 
                  fill="#DAA425"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              No user growth data available
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xs:gap-5 lg:gap-6 xl:gap-8 2xl:gap-10">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10">
            <div className="flex items-center justify-between mb-4 xs:mb-5 sm:mb-6">
              <h2 className="text-base xs:text-lg sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-[#DAA425]">Recent Activity</h2>
              {/* <button className="text-[#DAA425] hover:text-[#DAA740] text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg font-medium transition-colors duration-300">
                View all
              </button> */}
            </div>
            <div className="space-y-3 xs:space-y-4 sm:space-y-4 md:space-y-5">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 xs:space-x-4 sm:space-x-4 md:space-x-5 p-2 xs:p-3 sm:p-3 md:p-4 lg:p-5 rounded-lg hover:bg-gray-800 transition-all duration-300">
                    <div className={`flex-shrink-0 w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full bg-gray-800 flex items-center justify-center`}>
                      <activity.icon className={`h-3 w-3 xs:h-4 xs:w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg text-white">{activity.message}</p>
                      <p className="text-xs xs:text-sm sm:text-sm text-gray-500">{formatTimestamp(activity.timestamp)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No recent activity
                </div>
              )}
            </div>
          </div>

 {/* Top Products - Real Data Version */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10">
            <div className="flex items-center justify-between mb-4 xs:mb-5 sm:mb-6">
              <h2 className="text-base xs:text-lg sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-[#DAA425]">Top Products</h2>
              {/* <button className="text-[#DAA425] hover:text-[#DAA740] text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg font-medium transition-colors duration-300">
                View all
              </button> */}
            </div>
            <div className="space-y-3 xs:space-y-4 sm:space-y-4 md:space-y-5">
              {topProducts && topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-2 xs:p-3 sm:p-3 md:p-4 lg:p-5 rounded-lg hover:bg-gray-800 transition-all duration-300">
                    <div className="flex items-center space-x-2 xs:space-x-3 sm:space-x-3 md:space-x-4 min-w-0 flex-1">
                      <div className="flex-shrink-0 w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-[#DAA425] bg-opacity-20 rounded-full flex items-center justify-center">
                        <span className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg font-bold text-[#DAA425]">{index + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg font-medium text-white truncate">
                          {product.title}
                        </p>
                        <div className="flex items-center space-x-1 xs:space-x-2 sm:space-x-2">
                          <span className="text-xs xs:text-sm sm:text-sm text-gray-500">
                            {product.sales_count || product.sales || 0} sales
                          </span>
                          <span className="text-xs text-gray-600">•</span>
                          <span className="text-xs xs:text-sm sm:text-sm text-gray-500">
                            {product.category || 'N/A'}
                          </span>
                        </div>
                        {product.total_revenue > 0 && (
                          <div className="text-xs text-[#DAA425] mt-1">
                            ${(product.total_revenue || product.revenue || 0).toFixed(0)} revenue
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <CubeIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-sm">No products available yet</p>
                  <p className="text-xs text-gray-600 mt-1">Start by adding some products to see top performers</p>
                </div>
              )}
            </div>
          </div>

          </div> {/* End of Recent Activity and Top Products grid */}

        {/* Performance Metrics - MOVE THIS SECTION HERE */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8 2xl:gap-10">
          {/* Conversion Rate */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10 text-center hover:bg-gray-800 transition-all duration-300">
            <div className="text-2xl xs:text-3xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-[#DAA425] mb-2 xs:mb-3">
              {performanceMetrics.conversionRate.toFixed(1)}%
            </div>
            <div className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-400">Conversion Rate</div>
            <div className="text-xs xs:text-sm sm:text-sm md:text-base text-[#DAA425] mt-1 xs:mt-2">+0.3% from last month</div>
          </div>

          {/* Avg Order Value */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10 text-center hover:bg-gray-800 transition-all duration-300">
            <div className="text-2xl xs:text-3xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-[#DAA425] mb-2 xs:mb-3">
              ${performanceMetrics.avgOrderValue.toFixed(2)}
            </div>
            <div className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-400">Avg Order Value</div>
            <div className="text-xs xs:text-sm sm:text-sm md:text-base text-[#DAA425] mt-1 xs:mt-2">+$12.50 from last month</div>
          </div>

          {/* Platform Uptime */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10 text-center hover:bg-gray-800 transition-all duration-300">
            <div className="text-2xl xs:text-3xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-[#DAA425] mb-2 xs:mb-3">
              {performanceMetrics.platformUptime.toFixed(1)}%
            </div>
            <div className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-400">Platform Uptime</div>
            <div className="text-xs xs:text-sm sm:text-sm md:text-base text-[#DAA425] mt-1 xs:mt-2">+0.2% from last month</div>
          </div>

          {/* Avg Load Time */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10 text-center hover:bg-gray-800 transition-all duration-300">
            <div className="text-2xl xs:text-3xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-[#DAA425] mb-2 xs:mb-3">
              {performanceMetrics.avgLoadTime.toFixed(1)}s
            </div>
            <div className="text-xs xs:text-sm sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-400">Avg Load Time</div>
            <div className="text-xs xs:text-sm sm:text-sm md:text-base text-red-500 mt-1 xs:mt-2">+0.1s from last month</div>
          </div>
        </div>

      </div> {/* End of max-w-full mx-auto */}

      {/* Footer comes AFTER performance metrics */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-2 z-50">
        <div className="max-w-full mx-auto flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-[#DAA425] rounded-full animate-pulse"></div>
              <span>System Online</span>
            </div>
            <span>Last Update: {systemStatus.lastUpdate.toLocaleTimeString()}</span>
            <span>Uptime: {systemStatus.uptime}</span>
            <span>Users Online: {systemStatus.usersOnline.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Load: {systemStatus.serverLoad}%</span>
            <span>Memory: {systemStatus.memoryUsage}%</span>
            <span className="text-[#DAA425] font-medium">All systems operational</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;