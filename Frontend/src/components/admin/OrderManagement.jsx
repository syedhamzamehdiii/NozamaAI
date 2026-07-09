import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

const OrderManagement = () => {
  // State management
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Statistics
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    processingOrders: 0,
    failedOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    refundedOrders: 0
  });

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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  };

  // Fetch orders with filters and pagination
  const fetchOrders = async (page = 1, filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && filters.status !== 'all' && { status: filters.status }),
        ...(filters.payment && filters.payment !== 'all' && { payment_status: filters.payment }),
        ...(filters.date && filters.date !== 'all' && { date_filter: filters.date })
      });

      const data = await apiCall(`/admin/orders?${queryParams}`);
      
      setOrders(data.orders || []);
      setTotalOrders(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
      
      // Update stats
      if (data.stats) {
        setStats({
          totalOrders: data.stats.total_orders || 0,
          completedOrders: data.stats.completed_orders || 0,
          processingOrders: data.stats.processing_orders || 0,
          failedOrders: data.stats.failed_orders || 0,
          cancelledOrders: data.stats.cancelled_orders || 0,
          totalRevenue: data.stats.total_revenue || 0,
          averageOrderValue: data.stats.average_order_value || 0,
          refundedOrders: data.stats.refunded_orders || 0
        });
      }

    } catch (error) {
      setError('Failed to load orders: ' + error.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single order details
  const fetchOrderDetails = async (orderId) => {
    try {
      const data = await apiCall(`/admin/orders/${orderId}`);
      return data;
    } catch (error) {
      alert('Failed to fetch order details: ' + error.message);
      return null;
    }
  };

  // Refund order
  const refundOrder = async (orderId) => {
    try {
      setSubmitting(true);
      await apiCall(`/admin/orders/${orderId}/refund`, {
        method: 'POST'
      });

      // Refresh orders list
      await fetchOrders(currentPage, {
        search: searchTerm,
        status: statusFilter,
        payment: paymentFilter,
        date: dateFilter
      });
      
      alert('Order refunded successfully');
      
    } catch (error) {
      alert('Failed to refund order: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Resend download email
  const resendDownload = async (orderId) => {
    try {
      setSubmitting(true);
      await apiCall(`/admin/orders/${orderId}/resend-download`, {
        method: 'POST'
      });
      
      alert('Download email resent successfully');
      
    } catch (error) {
      alert('Failed to resend download: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId, status) => {
    try {
      setSubmitting(true);
      await apiCall(`/admin/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });

      // Refresh orders list
      await fetchOrders(currentPage, {
        search: searchTerm,
        status: statusFilter,
        payment: paymentFilter,
        date: dateFilter
      });
      
      alert('Order status updated successfully');
      
    } catch (error) {
      alert('Failed to update order status: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Export orders
  const exportOrders = async () => {
    try {
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(paymentFilter !== 'all' && { payment_status: paymentFilter }),
        ...(dateFilter !== 'all' && { date_filter: dateFilter })
      });

      const response = await fetch(`${API_BASE_URL}/admin/orders/export?${params}`, {
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
        a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      alert('Failed to export orders: ' + error.message);
    }
  };

  // Effects
  useEffect(() => {
    fetchOrders(currentPage, {
      search: searchTerm,
      status: statusFilter,
      payment: paymentFilter,
      date: dateFilter
    });
  }, [currentPage]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        fetchOrders(1, {
          search: searchTerm,
          status: statusFilter,
          payment: paymentFilter,
          date: dateFilter
        });
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, paymentFilter, dateFilter]);

  // Local filtering for immediate feedback
  useEffect(() => {
    let filtered = orders.filter(order => {
      const matchesSearch = 
        order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.items && order.items.some(item => 
          item.title?.toLowerCase().includes(searchTerm.toLowerCase())
        ));
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || order.payment_status === paymentFilter;
      
      return matchesSearch && matchesStatus && matchesPayment;
    });

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, paymentFilter]);

  // Event handlers
  const refreshData = () => {
    fetchOrders(currentPage, {
      search: searchTerm,
      status: statusFilter,
      payment: paymentFilter,
      date: dateFilter
    });
  };

  const handleOrderAction = async (orderId, action) => {
    switch (action) {
      case 'view':
        const orderDetails = await fetchOrderDetails(orderId);
        if (orderDetails) {
          setSelectedOrder(orderDetails);
          setShowOrderModal(true);
        }
        break;
      case 'refund':
        if (window.confirm('Are you sure you want to refund this order?')) {
          await refundOrder(orderId);
        }
        break;
      case 'resend':
        await resendDownload(orderId);
        break;
      case 'complete':
        await updateOrderStatus(orderId, 'completed');
        break;
      case 'cancel':
        if (window.confirm('Are you sure you want to cancel this order?')) {
          await updateOrderStatus(orderId, 'cancelled');
        }
        break;
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-[#DAA425] bg-opacity-20 text-[#DAA425] border border-[#DAA425]';
      case 'processing':
        return 'bg-yellow-900 bg-opacity-20 text-yellow-400 border border-yellow-400';
      case 'failed':
        return 'bg-red-900 bg-opacity-20 text-red-400 border border-red-400';
      case 'cancelled':
        return 'bg-gray-800 bg-opacity-20 text-gray-400 border border-gray-400';
      case 'refunded':
        return 'bg-purple-900 bg-opacity-20 text-purple-400 border border-purple-400';
      default:
        return 'bg-gray-800 bg-opacity-20 text-gray-400 border border-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-[#DAA425]" />;
      case 'processing':
        return <ClockIcon className="h-4 w-4 text-yellow-400" />;
      case 'failed':
        return <XCircleIcon className="h-4 w-4 text-red-400" />;
      case 'cancelled':
        return <XCircleIcon className="h-4 w-4 text-gray-400" />;
      case 'refunded':
        return <ArrowPathIcon className="h-4 w-4 text-purple-400" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const inputClasses = "w-full px-3 sm:px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] transition-all duration-300 text-sm";
  const selectClasses = "px-3 sm:px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] transition-all duration-300 text-sm";

  // Loading component
  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-2 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DAA425] mx-auto mb-4"></div>
              <p className="text-gray-400">Loading orders...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error component
  if (error && orders.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-2 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
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

  return (
    <div className="min-h-screen bg-black text-white p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#DAA425]">Order Management</h1>
            <p className="text-sm sm:text-base text-gray-300 mt-1">Monitor and manage customer orders</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={refreshData}
              className="p-2 text-gray-400 hover:text-[#DAA425] hover:bg-gray-900 rounded-lg transition-all duration-300"
              title="Refresh Data"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-[#DAA425] bg-opacity-20 rounded-lg">
                <BanknotesIcon className="h-5 w-5 sm:h-8 sm:w-8 text-[#DAA425]" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Total Orders</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-[#DAA425] bg-opacity-20 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 sm:h-8 sm:w-8 text-[#DAA425]" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Completed</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.completedOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-yellow-900 bg-opacity-20 rounded-lg">
                <ClockIcon className="h-5 w-5 sm:h-8 sm:w-8 text-yellow-400" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Processing</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.processingOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300 col-span-2 lg:col-span-1">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-[#DAA425] bg-opacity-20 rounded-lg">
                <BanknotesIcon className="h-5 w-5 sm:h-8 sm:w-8 text-[#DAA425]" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Total Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-white">
                  ${stats.totalRevenue.toLocaleString()}
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
                placeholder="Search orders by ID, customer, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputClasses} pl-8 sm:pl-10`}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:flex-shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={selectClasses}
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
              
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className={selectClasses}
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="pending">Pending</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={selectClasses}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="block lg:hidden space-y-4">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-white">{order.id}</div>
                    <div className="text-xs text-gray-400">{formatDate(order.order_date)}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(order.status)}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div>
                    <div className="text-sm font-medium text-white">{order.customer_name}</div>
                    <div className="text-xs text-gray-400">{order.customer_email}</div>
                  </div>
                  
                  <div className="text-sm text-gray-300">
                    {(order.items || []).map((item, index) => (
                      <div key={index} className="truncate">
                        {item.title} (x{item.quantity})
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-300">{order.payment_method}</div>
                      <div className={`text-xs ${order.payment_status === 'paid' ? 'text-[#DAA425]' : 'text-red-400'}`}>
                        {order.payment_status}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-white">${order.total?.toFixed(2)}</div>
                  </div>
                  
                  {order.failure_reason && (
                    <div className="text-xs text-red-400 bg-red-900 bg-opacity-20 p-2 rounded">
                      {order.failure_reason}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-700">
                  <button
                    onClick={() => handleOrderAction(order.id, 'view')}
                    className="text-[#DAA425] hover:text-[#DAA740] p-1"
                    title="View Details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  {order.status === 'completed' && (
                    <button
                      onClick={() => handleOrderAction(order.id, 'resend')}
                      className="text-blue-400 hover:text-blue-300 p-1"
                      title="Resend Download"
                      disabled={submitting}
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </button>
                  )}
                  {(order.payment_status === 'paid' && order.status !== 'refunded') && (
                    <button
                      onClick={() => handleOrderAction(order.id, 'refund')}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Refund Order"
                      disabled={submitting}
                    >
                      <BanknotesIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              No orders found
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
                    Order
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-800 transition-colors duration-300">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">{order.id}</div>
                          <div className="text-sm text-gray-400">{formatDate(order.order_date)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">{order.customer_name}</div>
                          <div className="text-sm text-gray-400">{order.customer_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">
                          {(order.items || []).map((item, index) => (
                            <div key={index}>
                              {item.title} (x{item.quantity})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(order.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        {order.failure_reason && (
                          <div className="text-xs text-red-400 mt-1 bg-red-900 bg-opacity-20 px-2 py-1 rounded">
                            {order.failure_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-white">{order.payment_method}</div>
                          <div className={`text-xs ${order.payment_status === 'paid' ? 'text-[#DAA425]' : 'text-red-400'}`}>
                            {order.payment_status}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        ${order.total?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2 justify-end">
                          <button
                            onClick={() => handleOrderAction(order.id, 'view')}
                            className="text-[#DAA425] hover:text-[#DAA740] transition-colors duration-300"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {order.status === 'completed' && (
                            <button
                              onClick={() => handleOrderAction(order.id, 'resend')}
                              className="text-blue-400 hover:text-blue-300 transition-colors duration-300"
                              title="Resend Download"
                              disabled={submitting}
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                            </button>
                          )}
                          {order.status === 'processing' && (
                            <button
                              onClick={() => handleOrderAction(order.id, 'complete')}
                              className="text-green-400 hover:text-green-300 transition-colors duration-300"
                              title="Mark as Completed"
                              disabled={submitting}
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                          {(order.payment_status === 'paid' && order.status !== 'refunded') && (
                            <button
                              onClick={() => handleOrderAction(order.id, 'refund')}
                              className="text-red-400 hover:text-red-300 transition-colors duration-300"
                              title="Refund Order"
                              disabled={submitting}
                            >
                              <BanknotesIcon className="h-4 w-4" />
                            </button>
                          )}
                          {(order.status === 'processing' || order.status === 'failed') && (
                            <button
                              onClick={() => handleOrderAction(order.id, 'cancel')}
                              className="text-gray-400 hover:text-gray-300 transition-colors duration-300"
                              title="Cancel Order"
                              disabled={submitting}
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
          <div className="text-sm text-gray-400">
            Showing <span className="text-white">{Math.min((currentPage - 1) * itemsPerPage + 1, totalOrders)}</span> to{' '}
            <span className="text-white">{Math.min(currentPage * itemsPerPage, totalOrders)}</span> of{' '}
            <span className="text-white">{totalOrders}</span> orders
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

        {/* Order Detail Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-gray-900 border border-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-[#DAA425]">Order Details</h3>
                  <button
                    onClick={() => setShowOrderModal(false)}
                    className="text-gray-400 hover:text-white transition-colors duration-300 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-[#DAA425] mb-3">Order Information</h5>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Order ID:</dt>
                          <dd className="text-white">{selectedOrder.id}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Date:</dt>
                          <dd className="text-white">{formatDateTime(selectedOrder.order_date)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Status:</dt>
                          <dd>
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedOrder.status)}`}>
                              {selectedOrder.status}
                            </span>
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Payment:</dt>
                          <dd className={`${selectedOrder.payment_status === 'paid' ? 'text-[#DAA425]' : 'text-red-400'}`}>
                            {selectedOrder.payment_status}
                          </dd>
                        </div>
                        {selectedOrder.completed_date && (
                          <div className="flex justify-between">
                            <dt className="text-gray-400">Completed:</dt>
                            <dd className="text-white">{formatDateTime(selectedOrder.completed_date)}</dd>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Downloads:</dt>
                          <dd className="text-white">{selectedOrder.download_count || 0}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-[#DAA425] mb-3">Customer</h5>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Name:</dt>
                          <dd className="text-white">{selectedOrder.customer_name}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Email:</dt>
                          <dd className="text-white">{selectedOrder.customer_email}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Payment Method:</dt>
                          <dd className="text-white">{selectedOrder.payment_method}</dd>
                        </div>
                        {selectedOrder.billing_address && (
                          <div>
                            <dt className="text-gray-400 mb-1">Billing Address:</dt>
                            <dd className="text-white text-xs">
                              {selectedOrder.billing_address.street}<br/>
                              {selectedOrder.billing_address.city}, {selectedOrder.billing_address.state} {selectedOrder.billing_address.zip}<br/>
                              {selectedOrder.billing_address.country}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <h5 className="font-medium text-[#DAA425] mb-3">Items</h5>
                    <div className="space-y-3">
                      {(selectedOrder.items || []).map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-700 rounded border border-gray-600">
                          <div>
                            <div className="font-medium text-white">{item.title}</div>
                            <div className="text-sm text-gray-400">
                              Quantity: {item.quantity} × ${item.price?.toFixed(2)}
                            </div>
                            {item.product_id && (
                              <div className="text-xs text-gray-500">Product ID: {item.product_id}</div>
                            )}
                          </div>
                          <div className="font-medium text-white">${(item.price * item.quantity)?.toFixed(2)}</div>
                        </div>
                      ))}
                      
                      {/* Order totals */}
                      <div className="space-y-2 pt-3 border-t border-gray-600">
                        {selectedOrder.subtotal && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Subtotal:</span>
                            <span className="text-white">${selectedOrder.subtotal.toFixed(2)}</span>
                          </div>
                        )}
                        {selectedOrder.tax && selectedOrder.tax > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Tax:</span>
                            <span className="text-white">${selectedOrder.tax.toFixed(2)}</span>
                          </div>
                        )}
                        {selectedOrder.discount && selectedOrder.discount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Discount:</span>
                            <span className="text-green-400">-${selectedOrder.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center p-3 bg-[#DAA425] bg-opacity-20 rounded border border-[#DAA425] font-medium">
                          <span className="text-[#DAA425]">Total</span>
                          <span className="text-[#DAA425]">${selectedOrder.total?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  {selectedOrder.transaction_details && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-[#DAA425] mb-3">Transaction Details</h5>
                      <dl className="space-y-2 text-sm">
                        {selectedOrder.transaction_details.transaction_id && (
                          <div className="flex justify-between">
                            <dt className="text-gray-400">Transaction ID:</dt>
                            <dd className="text-white">{selectedOrder.transaction_details.transaction_id}</dd>
                          </div>
                        )}
                        {selectedOrder.transaction_details.payment_processor && (
                          <div className="flex justify-between">
                            <dt className="text-gray-400">Processor:</dt>
                            <dd className="text-white">{selectedOrder.transaction_details.payment_processor}</dd>
                          </div>
                        )}
                        {selectedOrder.transaction_details.fees && (
                          <div className="flex justify-between">
                            <dt className="text-gray-400">Processing Fees:</dt>
                            <dd className="text-white">${selectedOrder.transaction_details.fees.toFixed(2)}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}

                  {/* Failure/Error Information */}
                  {(selectedOrder.failure_reason || selectedOrder.cancellation_reason) && (
                    <div className="bg-red-900 bg-opacity-20 border border-red-400 rounded-lg p-4">
                      <h5 className="font-medium text-red-400 mb-3">
                        {selectedOrder.failure_reason ? 'Failure Reason' : 'Cancellation Reason'}
                      </h5>
                      <p className="text-sm text-red-300">
                        {selectedOrder.failure_reason || selectedOrder.cancellation_reason}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedOrder.notes && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-[#DAA425] mb-3">Notes</h5>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{selectedOrder.notes}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => setShowOrderModal(false)}
                      className="w-full sm:w-auto px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 transition-all duration-300"
                    >
                      Close
                    </button>
                    
                    {selectedOrder.status === 'completed' && (
                      <button
                        onClick={() => {
                          handleOrderAction(selectedOrder.id, 'resend');
                          setShowOrderModal(false);
                        }}
                        disabled={submitting}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 disabled:opacity-50"
                      >
                        Resend Download
                      </button>
                    )}
                    
                    {selectedOrder.status === 'processing' && (
                      <button
                        onClick={() => {
                          handleOrderAction(selectedOrder.id, 'complete');
                          setShowOrderModal(false);
                        }}
                        disabled={submitting}
                        className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-300 disabled:opacity-50"
                      >
                        Mark Complete
                      </button>
                    )}
                    
                    {(selectedOrder.payment_status === 'paid' && selectedOrder.status !== 'refunded') && (
                      <button
                        onClick={() => {
                          handleOrderAction(selectedOrder.id, 'refund');
                          setShowOrderModal(false);
                        }}
                        disabled={submitting}
                        className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 disabled:opacity-50"
                      >
                        Refund Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;