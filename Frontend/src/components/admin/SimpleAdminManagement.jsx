import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  UserPlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const SimpleAdminManagement = () => {
  const [simpleAdmins, setSimpleAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Form state for creating
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    is_active: true
  });

  // API base URL
  const API_BASE_URL = 'http://localhost:8000/api/v1';

  // Fetch Simple Admins - FIXED VERSION
  const fetchSimpleAdmins = async (showSuccessMessage = false) => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Fetching Simple Admins...');
      
      const response = await fetch(`${API_BASE_URL}/super-admin/simple-admins-no-auth`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Simple Admins fetched:', data);
      
      if (data.success) {
        setSimpleAdmins(data.admins || []);
        // Only show initial load message
        if (showSuccessMessage) {
          setSuccess(`Loaded ${data.admins?.length || 0} Simple Admins`);
        }
      } else {
        setError(data.error || 'Failed to fetch Simple Admins');
      }
      
    } catch (error) {
      console.error('❌ Error fetching Simple Admins:', error);
      setError(`Failed to load Simple Admins: ${error.message}`);
      setSimpleAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle create Simple Admin
  const handleCreateSimpleAdmin = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('All fields are required');
      return;
    }

    try {
      setActionLoading('create');
      setError('');
      
      console.log('➕ Creating Simple Admin:', formData.email);
      
      const response = await fetch(`${API_BASE_URL}/super-admin/simple-admins-no-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      console.log('📋 Create response:', data);
      
      if (response.ok && data.success) {
        setSuccess(`✅ Simple Admin "${formData.name}" created successfully!`);
        setShowCreateModal(false);
        setFormData({ name: '', email: '', password: '', is_active: true });
        fetchSimpleAdmins(false); // Refresh without success message
      } else {
        setError(data.error || `Failed to create Simple Admin: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Error creating Simple Admin:', error);
      setError(`Failed to create Simple Admin: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle toggle status - FIXED VERSION
  const handleToggleStatus = async (adminId, currentStatus, adminEmail) => {
    try {
      setActionLoading(`toggle-${adminId}`);
      setError('');
      
      const newStatus = !currentStatus;
      const action = newStatus ? 'activate' : 'deactivate';
      
      console.log(`🔄 ${action} Simple Admin ${adminEmail}: ${adminId}`);
      
      const response = await fetch(`${API_BASE_URL}/super-admin/simple-admins-no-auth/${adminId}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: newStatus })
      });
      
      const data = await response.json();
      console.log(`📋 Toggle response:`, data);
      
      if (response.ok && data.success) {
        setSuccess(`✅ Simple Admin "${adminEmail}" ${action}d successfully!`);
        fetchSimpleAdmins(false); // Refresh without success message
      } else {
        const errorMsg = data.error || `HTTP ${response.status}: Failed to ${action}`;
        throw new Error(errorMsg);
      }
      
    } catch (error) {
      console.error('❌ Error toggling status:', error);
      setError(`Failed to toggle status: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete Simple Admin - FIXED VERSION
  const handleDeleteAdmin = async (adminId, adminEmail) => {
    // Confirmation dialog
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to permanently delete Simple Admin "${adminEmail}"?\n\nThis action cannot be undone!`
    );
    
    if (!confirmed) {
      return;
    }
    
    try {
      setActionLoading(`delete-${adminId}`);
      setError('');
      
      console.log(`🗑️ Deleting Simple Admin: ${adminEmail} (${adminId})`);
      
      const response = await fetch(`${API_BASE_URL}/super-admin/simple-admins-no-auth/${adminId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      console.log(`📋 Delete response:`, data);
      
      if (response.ok && data.success) {
        setSuccess(`✅ Simple Admin "${adminEmail}" deleted successfully!`);
        fetchSimpleAdmins(false); // Refresh without success message
      } else {
        const errorMsg = data.error || `HTTP ${response.status}: Failed to delete`;
        throw new Error(errorMsg);
      }
      
    } catch (error) {
      console.error('❌ Error deleting Simple Admin:', error);
      setError(`Failed to delete Simple Admin: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Load data on component mount - ONLY ONCE
  useEffect(() => {
    fetchSimpleAdmins(true); // Show initial success message
  }, []); // Empty dependency array - only run once

  // Clear messages after timeout - FIXED VERSION
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Loading state
  if (loading && simpleAdmins.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DAA425] mx-auto mb-4"></div>
              <p className="text-gray-400">Loading Simple Admins...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#DAA425]">Simple Admin Management</h1>
            <p className="text-gray-300 mt-1">
              Manage Simple Admins who can create and manage their own products.
            </p>
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            disabled={actionLoading === 'create'}
            className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-6 py-3 rounded-lg transition-all duration-300 font-medium flex items-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'create' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
            ) : (
              <UserPlusIcon className="h-5 w-5 mr-2" />
            )}
            Add Simple Admin
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-900 bg-opacity-20 border border-green-400 rounded-lg p-4 animate-fade-in">
            <div className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-300">{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 bg-opacity-20 border border-red-400 rounded-lg p-4 animate-fade-in">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Simple Admins Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">
              Simple Admins ({simpleAdmins.length})
            </h2>
          </div>
          
          {simpleAdmins.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Admin Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {simpleAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{admin.name}</div>
                          <div className="text-sm text-gray-400">{admin.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          admin.is_active 
                            ? 'bg-green-900 bg-opacity-20 text-green-400 border border-green-400' 
                            : 'bg-red-900 bg-opacity-20 text-red-400 border border-red-400'
                        }`}>
                          {admin.is_active ? (
                            <>
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {admin.last_login ? new Date(admin.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {/* Toggle Status Button */}
                          <button
                            onClick={() => handleToggleStatus(admin.id, admin.is_active, admin.email)}
                            disabled={actionLoading === `toggle-${admin.id}` || actionLoading === `delete-${admin.id}`}
                            className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center min-w-[80px] justify-center ${
                              admin.is_active
                                ? 'bg-red-900 hover:bg-red-800 text-red-300 border border-red-700'
                                : 'bg-green-900 hover:bg-green-800 text-green-300 border border-green-700'
                            }`}
                            title={admin.is_active ? 'Deactivate Admin' : 'Activate Admin'}
                          >
                            {actionLoading === `toggle-${admin.id}` ? (
                              <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                            ) : (
                              admin.is_active ? 'Deactivate' : 'Activate'
                            )}
                          </button>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                            disabled={actionLoading === `delete-${admin.id}` || actionLoading === `toggle-${admin.id}`}
                            className="px-3 py-1 bg-red-900 hover:bg-red-800 text-red-300 border border-red-700 rounded text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center min-w-[60px] justify-center"
                            title={`Delete ${admin.email}`}
                          >
                            {actionLoading === `delete-${admin.id}` ? (
                              <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                            ) : (
                              'Delete'
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <UserIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No Simple Admins Yet</h3>
              <p className="text-gray-500 mb-4">Create your first Simple Admin to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-6 py-2 rounded-lg transition-all duration-300 font-medium"
              >
                Create First Simple Admin
              </button>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-gray-900 border border-gray-800 rounded-lg w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-[#DAA425]">Create Simple Admin</h3>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setError(''); // Clear any errors when closing
                    }}
                    disabled={actionLoading === 'create'}
                    className="text-gray-400 hover:text-white transition-colors duration-300 disabled:opacity-50"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#DAA425] mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] transition-colors"
                      placeholder="Enter full name"
                      required
                      disabled={actionLoading === 'create'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#DAA425] mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] transition-colors"
                      placeholder="Enter email address"
                      required
                      disabled={actionLoading === 'create'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#DAA425] mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] transition-colors"
                      placeholder="Enter password (min 6 characters)"
                      required
                      disabled={actionLoading === 'create'}
                      minLength={6}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="h-4 w-4 text-[#DAA425] bg-gray-800 border-gray-700 rounded focus:ring-[#DAA425] focus:ring-2"
                      disabled={actionLoading === 'create'}
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-300">
                      Active (can login and create products)
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setError(''); // Clear errors
                      }}
                      disabled={actionLoading === 'create'}
                      className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 transition-all duration-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateSimpleAdmin}
                      disabled={actionLoading === 'create' || !formData.name.trim() || !formData.email.trim() || !formData.password.trim() || formData.password.length < 6}
                      className="px-4 py-2 bg-[#DAA425] hover:bg-[#DAA740] text-black rounded-lg transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {actionLoading === 'create' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlusIcon className="h-4 w-4 mr-2" />
                          Create Simple Admin
                        </>
                      )}
                    </button>
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

export default SimpleAdminManagement;