import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  PhoneIcon,
  BellIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const NotificationLog = () => {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const pageSize = 20;
  
  // Performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    avgDeliveryTime: 0,
    bounceRate: 0,
    openRate: 0,
    clickRate: 0
  });
  
  // Channel distribution
  const [channelDistribution, setChannelDistribution] = useState([]);

  // API base URL
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

  // Fetch notifications with filters and pagination
  const fetchNotifications = async (page = 1, search = '', type = 'all', status = 'all', channel = 'all') => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
        ...(type !== 'all' && { type }),
        ...(status !== 'all' && { status }),
        ...(channel !== 'all' && { channel })
      });

      const data = await apiCall(`/admin/notifications?${params}`);
      
      setNotifications(data.notifications || []);
      setTotalNotifications(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / pageSize));
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    }
  };

  // Fetch performance metrics
  const fetchPerformanceMetrics = async () => {
    try {
      const data = await apiCall('/admin/notifications/performance-metrics');
      setPerformanceMetrics({
        avgDeliveryTime: data.avg_delivery_time || 0,
        bounceRate: data.bounce_rate || 0,
        openRate: data.open_rate || 0,
        clickRate: data.click_rate || 0
      });
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    }
  };

  // Fetch channel distribution
  const fetchChannelDistribution = async () => {
    try {
      const data = await apiCall('/admin/notifications/channel-distribution');
      
      const channelIcons = {
        email: <EnvelopeIcon className="h-4 w-4" />,
        sms: <PhoneIcon className="h-4 w-4" />,
        push: <BellIcon className="h-4 w-4" />
      };

      setChannelDistribution(data.map(item => ({
        channel: item.channel,
        count: item.count || 0,
        percentage: item.percentage || 0,
        icon: channelIcons[item.channel] || <EnvelopeIcon className="h-4 w-4" />
      })));
    } catch (error) {
      console.error('Failed to fetch channel distribution:', error);
      setChannelDistribution([]);
    }
  };

  // Export notification log
  const exportLog = async () => {
    try {
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(channelFilter !== 'all' && { channel: channelFilter })
      });

      const response = await fetch(`${API_BASE_URL}/admin/notifications/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `notification-log-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Failed to export log:', error);
      alert('Failed to export notification log');
    }
  };

  // Resend notification
  const resendNotification = async (notificationId) => {
    try {
      await apiCall(`/admin/notifications/${notificationId}/resend`, {
        method: 'POST'
      });
      
      // Refresh notifications
      fetchNotifications(currentPage, searchTerm, typeFilter, statusFilter, channelFilter);
      alert('Notification resent successfully');
    } catch (error) {
      console.error('Failed to resend notification:', error);
      alert('Failed to resend notification');
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchNotifications(currentPage, searchTerm, typeFilter, statusFilter, channelFilter),
        fetchPerformanceMetrics(),
        fetchChannelDistribution()
      ]);
    } catch (error) {
      setError('Failed to load notification data');
      console.error('Notification data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Effect to filter notifications when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        fetchNotifications(1, searchTerm, typeFilter, statusFilter, channelFilter);
      } else {
        setCurrentPage(1);
        fetchNotifications(1, searchTerm, typeFilter, statusFilter, channelFilter);
      }
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, typeFilter, statusFilter, channelFilter]);

  // Filter notifications locally for immediate feedback
  useEffect(() => {
    let filtered = notifications.filter(notification => {
      const matchesSearch = 
        notification.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || notification.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || notification.status === statusFilter;
      const matchesChannel = channelFilter === 'all' || notification.channel === channelFilter;
      
      return matchesSearch && matchesType && matchesStatus && matchesChannel;
    });

    setFilteredNotifications(filtered);
  }, [notifications, searchTerm, typeFilter, statusFilter, channelFilter]);

  // Handle pagination
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchNotifications(page, searchTerm, typeFilter, statusFilter, channelFilter);
    }
  };

  // Refresh data
  const refreshData = () => {
    fetchAllData();
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-[#DAA425] bg-opacity-20 text-[#DAA425] border border-[#DAA425]';
      case 'sent':
        return 'bg-blue-900 bg-opacity-20 text-blue-400 border border-blue-400';
      case 'failed':
        return 'bg-red-900 bg-opacity-20 text-red-400 border border-red-400';
      case 'pending':
        return 'bg-yellow-900 bg-opacity-20 text-yellow-400 border border-yellow-400';
      default:
        return 'bg-gray-800 bg-opacity-20 text-gray-400 border border-gray-400';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'order_confirmation':
        return 'bg-blue-900 bg-opacity-20 text-blue-400 border border-blue-400';
      case 'product_approved':
        return 'bg-[#DAA425] bg-opacity-20 text-[#DAA425] border border-[#DAA425]';
      case 'system_alert':
        return 'bg-red-900 bg-opacity-20 text-red-400 border border-red-400';
      case 'marketing':
        return 'bg-purple-900 bg-opacity-20 text-purple-400 border border-purple-400';
      case 'payment_received':
        return 'bg-green-900 bg-opacity-20 text-green-400 border border-green-400';
      default:
        return 'bg-gray-800 bg-opacity-20 text-gray-400 border border-gray-400';
    }
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email':
        return <EnvelopeIcon className="h-4 w-4" />;
      case 'sms':
        return <PhoneIcon className="h-4 w-4" />;
      case 'push':
        return <BellIcon className="h-4 w-4" />;
      default:
        return <EnvelopeIcon className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusCounts = () => {
    return {
      delivered: notifications.filter(n => n.status === 'delivered').length,
      pending: notifications.filter(n => n.status === 'pending').length,
      failed: notifications.filter(n => n.status === 'failed').length,
      total: notifications.length
    };
  };

  const inputClasses = "w-full px-3 sm:px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] transition-all duration-300 text-sm";
  const selectClasses = "px-3 sm:px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] transition-all duration-300 text-sm";

  // Loading component
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-2 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DAA425] mx-auto mb-4"></div>
              <p className="text-gray-400">Loading notifications...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error component
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-2 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={refreshData}
                className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-4 py-2 rounded-lg transition-all duration-300"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-black text-white p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#DAA425]">Notification Log</h1>
            <p className="text-sm sm:text-base text-gray-300 mt-1">Monitor email and notification delivery</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={refreshData}
              className="p-2 text-gray-400 hover:text-[#DAA425] hover:bg-gray-900 rounded-lg transition-all duration-300"
              title="Refresh Data"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={exportLog}
              className="w-full sm:w-auto bg-[#DAA425] hover:bg-[#DAA740] text-black px-4 py-2 rounded-lg transition-all duration-300 font-medium text-sm sm:text-base"
            >
              Export Log
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-[#DAA425] bg-opacity-20 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 sm:h-8 sm:w-8 text-[#DAA425]" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Delivered</p>
                <p className="text-lg sm:text-2xl font-bold text-white">
                  {statusCounts.delivered}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-yellow-900 bg-opacity-20 rounded-lg">
                <ClockIcon className="h-5 w-5 sm:h-8 sm:w-8 text-yellow-400" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Pending</p>
                <p className="text-lg sm:text-2xl font-bold text-white">
                  {statusCounts.pending}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-red-900 bg-opacity-20 rounded-lg">
                <XCircleIcon className="h-5 w-5 sm:h-8 sm:w-8 text-red-400" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Failed</p>
                <p className="text-lg sm:text-2xl font-bold text-white">
                  {statusCounts.failed}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-[#DAA425] bg-opacity-20 rounded-lg">
                <BanknotesIcon className="h-5 w-5 sm:h-8 sm:w-8 text-[#DAA425]" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Success Rate</p>
                <p className="text-lg sm:text-2xl font-bold text-white">
                  {statusCounts.total > 0 ? Math.round((statusCounts.delivered / statusCounts.total) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications by recipient or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputClasses} pl-8 sm:pl-10`}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-none lg:flex lg:space-x-4">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={selectClasses}
              >
                <option value="all">All Types</option>
                <option value="order_confirmation">Order Confirmation</option>
                <option value="product_approved">Product Approved</option>
                <option value="system_alert">System Alert</option>
                <option value="marketing">Marketing</option>
                <option value="payment_received">Payment Received</option>
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={selectClasses}
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
              
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className={selectClasses}
              >
                <option value="all">All Channels</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="block lg:hidden space-y-4">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div key={notification.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(notification.type)}`}>
                      {notification.type?.replace('_', ' ') || 'Unknown'}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(notification.status)}`}>
                      {notification.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    {getChannelIcon(notification.channel)}
                    <span className="text-xs">{notification.channel}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="text-sm font-medium text-white">{notification.title}</div>
                    <div className="text-xs text-gray-400">{notification.recipient}</div>
                  </div>
                  
                  <div className="text-sm text-gray-300">{notification.message}</div>
                  
                  {notification.failure_reason && (
                    <div className="text-xs text-red-400 bg-red-900 bg-opacity-20 p-2 rounded">
                      {notification.failure_reason}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(notification.sent_at)}
                    </div>
                    {notification.status === 'failed' && (
                      <button
                        onClick={() => resendNotification(notification.id)}
                        className="text-xs bg-[#DAA425] text-black px-2 py-1 rounded hover:bg-[#DAA740] transition-colors duration-300"
                      >
                        Resend
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              No notifications found
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Content
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Sent At
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification) => (
                    <tr key={notification.id} className="hover:bg-gray-800 transition-colors duration-300">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(notification.type)}`}>
                          {notification.type?.replace('_', ' ') || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {notification.recipient}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white font-medium">{notification.title}</div>
                        <div className="text-sm text-gray-400 truncate max-w-xs">{notification.message}</div>
                        {notification.failure_reason && (
                          <div className="text-xs text-red-400 mt-1 bg-red-900 bg-opacity-20 px-2 py-1 rounded">
                            {notification.failure_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(notification.status)}`}>
                          {notification.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatTimestamp(notification.sent_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          {getChannelIcon(notification.channel)}
                          <span>{notification.channel}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {notification.status === 'failed' && (
                          <button
                            onClick={() => resendNotification(notification.id)}
                            className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-3 py-1 rounded text-xs transition-colors duration-300"
                          >
                            Resend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No notifications found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notification Performance Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* Delivery Performance */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-[#DAA425] mb-4">Delivery Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded">
                <span className="text-sm text-white">Average Delivery Time</span>
                <span className="text-sm font-medium text-[#DAA425]">{performanceMetrics.avgDeliveryTime.toFixed(1)}s</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded">
                <span className="text-sm text-white">Bounce Rate</span>
                <span className="text-sm font-medium text-red-400">{performanceMetrics.bounceRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded">
                <span className="text-sm text-white">Open Rate</span>
                <span className="text-sm font-medium text-blue-400">{performanceMetrics.openRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded">
                <span className="text-sm text-white">Click Rate</span>
                <span className="text-sm font-medium text-purple-400">{performanceMetrics.clickRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Channel Distribution */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-[#DAA425] mb-4">Channel Distribution</h3>
            <div className="space-y-4">
              {channelDistribution.length > 0 ? (
                channelDistribution.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="text-gray-400">{item.icon}</div>
                        <span className="text-sm text-white capitalize">{item.channel}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">{item.count}</span>
                        <span className="text-sm font-medium text-[#DAA425]">{item.percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-[#DAA425] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No channel data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
          <div className="text-sm text-gray-400">
            Showing <span className="text-white">{Math.min((currentPage - 1) * pageSize + 1, totalNotifications)}</span> to{' '}
            <span className="text-white">{Math.min(currentPage * pageSize, totalNotifications)}</span> of{' '}
            <span className="text-white">{totalNotifications}</span> notifications
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className={`px-3 py-1 text-sm rounded transition-colors duration-300 ${
                currentPage <= 1 
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Previous
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
              if (pageNum > totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 text-sm rounded transition-colors duration-300 ${
                    currentPage === pageNum
                      ? 'bg-[#DAA425] text-black'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className={`px-3 py-1 text-sm rounded transition-colors duration-300 ${
                currentPage >= totalPages 
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationLog;