// frontend/src/components/common/MaintenanceCheck.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const MaintenanceCheck = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const { user } = useAuth();
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

  // Check if user is admin
  const isAdmin = () => {
    return user && (user.role === 'admin' || user.role === 'administrator');
  };

  useEffect(() => {
    checkMaintenanceMode();
    
    // Check maintenance mode every 10 seconds
    const interval = setInterval(checkMaintenanceMode, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const checkMaintenanceMode = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings/maintenance`);
      
      if (response.status === 503) {
        // Server is in maintenance mode and blocking regular users
        setMaintenanceMode(true);
      } else if (response.ok) {
        const data = await response.json();
        setMaintenanceMode(data.maintenance_mode || false);
      } else {
        setMaintenanceMode(false);
      }
    } catch (error) {
      console.error('Failed to check maintenance mode:', error);
      // If we can't reach the server, assume maintenance
      setMaintenanceMode(true);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DAA425] mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // If maintenance mode is detected and user is NOT admin, show maintenance page
  if (maintenanceMode && !isAdmin()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-2xl mx-auto">
          <div className="bg-gray-900 bg-opacity-50 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 md:p-12">
            <div className="text-6xl mb-6 animate-pulse">🔧</div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#DAA425] mb-6">
              Under Maintenance
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
              We're currently performing scheduled maintenance to improve your experience. 
              Our AI marketplace will be back online shortly.
            </p>
            <div className="bg-[#DAA425] bg-opacity-10 border border-[#DAA425] border-opacity-30 rounded-lg p-4 inline-block">
              <p className="text-[#DAA425] font-semibold">
                Expected completion: Soon
              </p>
            </div>
            <div className="mt-8">
              <p className="text-sm text-gray-400">
                Thank you for your patience
              </p>
            </div>
            
            {/* Admin access link */}
            <div className="mt-8">
              <a
                href="/admin"
                className="inline-block bg-[#DAA425] hover:bg-[#DAA740] text-black px-4 py-2 rounded-lg font-medium transition-colors duration-300"
              >
                Admin Access
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If maintenance mode is on and user IS admin, show the app with maintenance banner
  if (maintenanceMode && isAdmin()) {
    return (
      <div className="min-h-screen bg-black">
        {/* Maintenance Mode Banner for Admins */}
        <div className="bg-orange-600 text-white px-4 py-3 text-center relative">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-lg">🔧</span>
            <span className="font-medium">
              MAINTENANCE MODE ACTIVE - Only administrators can access the website
            </span>
            <span className="text-lg animate-pulse">🔧</span>
          </div>
          <div className="text-sm mt-1 opacity-90">
            Regular users will see a maintenance page. Disable maintenance mode in System Settings.
          </div>
        </div>
        
        {/* Admin can access the full app */}
        <div className="relative">
          {children}
        </div>
      </div>
    );
  }

  // Normal app rendering (maintenance mode off)
  return children;
};

export default MaintenanceCheck;