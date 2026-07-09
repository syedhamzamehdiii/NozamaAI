// frontend/src/pages/SimpleAdminDashboard.jsx
// Complete dashboard component with API integration

import React, { useState, useEffect } from 'react';
import { simpleAdminApi } from '../services/SimpleAdminApi';
import {
  CubeIcon,
  PlusIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

const SimpleAdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await simpleAdminApi.getDashboard();
      setDashboardData(data);
      setError('');
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
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

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900 bg-opacity-20 border border-red-400 rounded-lg p-6">
            <h2 className="text-red-400 text-lg font-semibold mb-2">Error Loading Dashboard</h2>
            <p className="text-red-300">{error}</p>
            <button 
              onClick={fetchDashboard}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const recentProducts = dashboardData?.recent_products || [];

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#DAA425]">Product Dashboard</h1>
            <p className="text-gray-300 mt-1">Manage your product submissions</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => window.location.href = '/simple-admin/products/create'}
              className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-4 py-2 rounded-lg transition-all duration-300 font-medium flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Product
            </button>
            <button 
              onClick={() => window.location.href = '/simple-admin/products'}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-300 font-medium flex items-center border border-gray-700"
            >
              <CubeIcon className="h-4 w-4 mr-2" />
              View All
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-800 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-[#DAA425] bg-opacity-20 rounded-lg">
                <CubeIcon className="h-5 w-5 sm:h-8 sm:w-8 text-[#DAA425]" />
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400">Total Products</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.totalProducts || 0}</p>
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
            <h2 className="text-lg font-semibold text-[#DAA425]">Recent Products</h2>
          </div>
          
          {recentProducts.length > 0 ? (
            <div className="overflow-x-auto">
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
                  {recentProducts.map((product) => (
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
                            onClick={() => window.location.href = `/simple-admin/products/${product.id}`}
                            className="text-[#DAA425] hover:text-[#DAA740] transition-colors duration-300"
                            title="View Product"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {product.status === 'pending' && (
                            <button
                              onClick={() => window.location.href = `/simple-admin/products/${product.id}/edit`}
                              className="text-gray-400 hover:text-white transition-colors duration-300"
                              title="Edit Product"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CubeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No products yet</h3>
              <p className="text-gray-500 mb-4">Create your first product to get started</p>
              <button 
                onClick={() => window.location.href = '/simple-admin/products/create'}
                className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-4 py-2 rounded-lg transition-all duration-300 font-medium inline-flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Product
              </button>
            </div>
          )}
        </div>

        {/* Important Notice */}
        <div className="bg-yellow-900 bg-opacity-20 border border-yellow-400 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-400 mb-1">Product Guidelines</p>
              <ul className="text-xs text-yellow-300 space-y-1">
                <li>• All products require Super Admin approval before going live</li>
                <li>• You can only edit products with 'pending' status</li>
                <li>• Provide detailed descriptions and clear images for faster approval</li>
                <li>• Contact support if you have questions about rejections</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleAdminDashboard;