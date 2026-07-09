// frontend/src/components/common/MaintenanceBanner.jsx
import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const MaintenanceBanner = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    checkMaintenanceMode();
    
    // Check maintenance mode every 15 seconds
    const interval = setInterval(checkMaintenanceMode, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const checkMaintenanceMode = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings/maintenance`);
      if (response.ok) {
        const data = await response.json();
        setMaintenanceMode(data.maintenance_mode || false);
      } else {
        setMaintenanceMode(false);
      }
    } catch (error) {
      console.error('Failed to check maintenance mode:', error);
      setMaintenanceMode(false);
    } finally {
      setLoading(false);
    }
  };

  // Don't show banner if maintenance mode is off, loading, or user dismissed it
  if (!maintenanceMode || loading || !isVisible) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-300 animate-pulse" />
            <div>
              <p className="font-semibold text-sm sm:text-base">
                🔧 MAINTENANCE MODE ACTIVE
              </p>
              <p className="text-xs sm:text-sm opacity-90">
                Only administrators can access the website. Regular users see a maintenance page.
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <a
              href="/admin/settings"
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Settings
            </a>
            <button
              onClick={() => setIsVisible(false)}
              className="text-white hover:text-gray-200 p-1 rounded-md hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceBanner;