import React, { useState, useEffect } from 'react';
import {
  CubeIcon,
  PlusIcon,
  DocumentTextIcon,
  CheckIcon,
  ClockIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const SimpleAdminDashboard = () => {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingProducts: 0,
    approvedProducts: 0,
    rejectedProducts: 0,
    myProducts: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_BASE_URL = 'http://localhost:8000/api/v1';

  // Get stored token - FIXED
  const getAuthToken = () => {
    return localStorage.getItem('simpleAdminToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
  };

  // Get current user info
  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem('simpleAdminUser') || localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  // Fetch dashboard data - FIXED VERSION
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = getAuthToken();
      const currentUser = getCurrentUser();
      
      console.log('📊 Fetching dashboard data...', { 
        hasToken: !!token, 
        userEmail: currentUser?.email 
      });

      if (!token) {
        setError('❌ Not authenticated. Please login again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/simple-admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      console.log('📊 Dashboard response status:', response.status);

      if (response.status === 401) {
        setError('❌ Session expired. Please login again.');
        // Clear invalid token
        localStorage.removeItem('simpleAdminToken');
        localStorage.removeItem('simpleAdminUser');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch dashboard data`);
      }

      const data = await response.json();
      console.log('✅ Dashboard data:', data);

      if (data.success) {
        setStats(data.stats || {});
        setProducts(data.recent_products || []);
        setSuccess('✅ Dashboard loaded successfully');
      } else {
        setError(data.error || 'Failed to load dashboard data');
      }

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setError(`Failed to load dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load dashboard data ONCE on mount - FIXED
  useEffect(() => {
    fetchDashboardData();
  }, []); // Empty dependency array - only run once

  // Clear messages after timeout - FIXED to prevent loops
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-[#DAA425] bg-opacity-20 text-[#DAA425] border border-[#DAA425]';
      case 'pending':
        return 'bg-yellow-900 bg-opacity-20 text-yellow-400 border border-yellow-400';
      case 'rejected':
        return 'bg-red-900 bg-opacity-20 text-red-400 border border-red-400';
      default:
        return 'bg-gray-800 bg-opacity-20 text-gray-400 border border-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckIcon className="h-4 w-4 text-[#DAA425]" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-400" />;
      case 'rejected':
        return <XMarkIcon className="h-4 w-4 text-red-400" />;
      default:
        return null;
    }
  };

  // Handle navigation
  const handleNavigation = (path) => {
    console.log('🔗 Navigating to:', path);
    window.location.href = path;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DAA425] mx-auto mb-4"></div>
              <p className="text-gray-400">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#DAA425]">Product Management Dashboard</h1>
            <p className="text-gray-300 mt-1">Manage and track your product submissions</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => handleNavigation('/simple-admin/products/create')}
              className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-4 py-2 rounded-lg transition-all duration-300 font-medium flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Product
            </button>
            <button 
              onClick={() => handleNavigation('/simple-admin/products')}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-300 font-medium flex items-center border border-gray-700"
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              View All Products
            </button>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-900 bg-opacity-20 border border-green-400 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-300">{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 bg-opacity-20 border border-red-400 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-300">{error}</p>
                {error.includes('authentication') || error.includes('login') ? (
                  <button
                    onClick={() => handleNavigation('/simple-admin/login')}
                    className="mt-2 text-xs text-[#DAA425] hover:text-[#DAA740] underline"
                  >
                    Go to Login →
                  </button>
                ) : (
                  <button
                    onClick={fetchDashboardData}
                    className="mt-2 text-xs text-[#DAA425] hover:text-[#DAA740] underline"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-[#DAA425] bg-opacity-20 rounded-lg">
                <CubeIcon className="h-5 w-5 sm:h-8 sm:w-8 text-[#DAA425]" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">My Products</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.myProducts || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-yellow-900 bg-opacity-20 rounded-lg">
                <ClockIcon className="h-5 w-5 sm:h-8 sm:w-8 text-yellow-400" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Pending Review</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.pendingProducts || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-[#DAA425] bg-opacity-20 rounded-lg">
                <CheckIcon className="h-5 w-5 sm:h-8 sm:w-8 text-[#DAA425]" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Approved</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.approvedProducts || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-red-900 bg-opacity-20 rounded-lg">
                <XMarkIcon className="h-5 w-5 sm:h-8 sm:w-8 text-red-400" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Rejected</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.rejectedProducts || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Products */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#DAA425]">Recent Products</h2>
              <button 
                onClick={() => handleNavigation('/simple-admin/products')}
                className="text-[#DAA425] hover:text-[#DAA740] text-sm font-medium transition-colors"
              >
                View All →
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {products.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#DAA425] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-800 transition-colors duration-300">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0">
                            <CubeIcon className="h-5 w-5 text-[#DAA425]" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{product.title}</div>
                            <div className="text-sm text-gray-400">{product.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(product.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                            {product.status}
                          </span>
                        </div>
                        {product.status === 'rejected' && product.rejection_reason && (
                          <div className="text-xs text-red-400 mt-1 bg-red-900 bg-opacity-20 p-2 rounded">
                            {product.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">${product.price}</div>
                        {product.original_price && product.original_price > product.price && (
                          <div className="text-xs text-gray-500 line-through">${product.original_price}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(product.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2 justify-end">
                          <button
                            onClick={() => handleNavigation(`/simple-admin/products/${product.id}`)}
                            className="text-[#DAA425] hover:text-[#DAA740] transition-colors duration-300"
                            title="View Product"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleNavigation(`/simple-admin/products/${product.id}/edit`)}
                            className="text-gray-400 hover:text-white transition-colors duration-300"
                            title="Edit Product"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <CubeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No products yet</h3>
                <p className="text-gray-500 mb-4">Create your first product to get started</p>
                <button 
                  onClick={() => handleNavigation('/simple-admin/products/create')}
                  className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-4 py-2 rounded-lg transition-all duration-300 font-medium inline-flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Product
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#DAA425] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button 
              onClick={() => handleNavigation('/simple-admin/products/create')}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 text-left transition-all duration-300 group"
            >
              <div className="flex items-center mb-2">
                <PlusIcon className="h-5 w-5 text-[#DAA425] mr-2" />
                <span className="font-medium text-white group-hover:text-[#DAA425] transition-colors">Add New Product</span>
              </div>
              <p className="text-sm text-gray-400">Create and submit a new product for review</p>
            </button>

            <button 
              onClick={() => handleNavigation('/simple-admin/products?status=pending')}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 text-left transition-all duration-300 group"
            >
              <div className="flex items-center mb-2">
                <ClockIcon className="h-5 w-5 text-yellow-400 mr-2" />
                <span className="font-medium text-white group-hover:text-[#DAA425] transition-colors">Pending Reviews</span>
              </div>
              <p className="text-sm text-gray-400">Check products awaiting approval</p>
            </button>

            <button 
              onClick={() => handleNavigation('/simple-admin/products?status=rejected')}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 text-left transition-all duration-300 group"
            >
              <div className="flex items-center mb-2">
                <XMarkIcon className="h-5 w-5 text-red-400 mr-2" />
                <span className="font-medium text-white group-hover:text-[#DAA425] transition-colors">Review Rejections</span>
              </div>
              <p className="text-sm text-gray-400">Address rejected products and resubmit</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleAdminDashboard;