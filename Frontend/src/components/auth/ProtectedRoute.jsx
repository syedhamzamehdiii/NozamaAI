import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
// In ProtectedRoute.jsx, add this check at the beginning:

const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  requiredPermission = null,
  redirectTo = '/login',
  fallback = null 
}) => {
  const { isAuthenticated, isLoading, user, hasRole, hasPermission } = useAuth();
  const location = useLocation();
   // TEMPORARY: Allow access to simple-admin pages for testing
  if (location.pathname.includes('/admin/simple-admins')) {
    console.log('🧪 Bypassing auth for simple admin testing');
    return children;
  }

  console.log('ProtectedRoute Debug:', {
    isAuthenticated,
    isLoading,
    user,
    requiredRole,
    userRole: user?.role,
    currentPath: location.pathname
  });

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    console.log('User not authenticated, redirecting to login');
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }}
        replace 
      />
    );
  }

  // Check role-based access
  if (requiredRole) {
    console.log('Checking role:', { required: requiredRole, userRole: user.role });
    
    // Simple role checking - make sure this matches your user role values
    const userRole = user.role?.toLowerCase();
    const requiredRoleNormalized = requiredRole.toLowerCase();
    
    if (userRole !== requiredRoleNormalized) {
      console.log('Role mismatch:', { userRole, requiredRoleNormalized });
      
      // Show fallback component or access denied page
      if (fallback) {
        return fallback;
      }
      
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">
              You don't have the required permissions to access this page.
              <br />Required role: <span className="font-semibold">{requiredRole}</span>
              <br />Your role: <span className="font-semibold">{user.role || 'None'}</span>
            </p>
            <div className="space-x-4">
              <button 
                onClick={() => window.history.back()}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go Back
              </button>
              <Navigate to="/dashboard" replace />
            </div>
          </div>
        </div>
      );
    }
  }

  // Check permission-based access
  if (requiredPermission && hasPermission && !hasPermission(requiredPermission)) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-yellow-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6V9m0 12a9 9 0 110-18 9 9 0 010 18z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Insufficient Permissions</h1>
          <p className="text-gray-600 mb-6">
            You don't have the required permissions to access this feature.
            {requiredPermission && ` Required permission: ${requiredPermission}`}
          </p>
          <div className="space-x-4">
            <button 
              onClick={() => window.history.back()}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
            <Navigate to="/dashboard" replace />
          </div>
        </div>
      </div>
    );
  }

  console.log('Access granted for user:', user);
  // User is authenticated and has required permissions
  return children;
};

export default ProtectedRoute;