import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const SystemSettings = () => {
  const [settings, setSettings] = useState({
    siteName: 'Nozama.ai',
    adminEmail: 'admin@nozama.ai',
    maintenanceMode: false,
    maintenanceMessage: 'We are currently performing scheduled maintenance to improve your experience. Please check back shortly.'
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // In real app, this would be: const response = await fetch('/api/admin/settings');
      const savedSettings = localStorage.getItem('systemSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      showNotification('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);

    // Auto-save maintenance mode when toggled
    if (key === 'maintenanceMode') {
      handleMaintenanceModeToggle(value);
    }
  };

  const handleMaintenanceModeToggle = async (enabled) => {
    try {
      setSaving(true);
      
      const updatedSettings = { ...settings, maintenanceMode: enabled };
      
      // In real app, this would be: 
      // await fetch('/api/admin/settings/maintenance', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ maintenance_mode: enabled })
      // });
      
      localStorage.setItem('systemSettings', JSON.stringify(updatedSettings));
      
      if (enabled) {
        showMaintenanceModal();
      } else {
        showNotification('Maintenance mode disabled - Website is now accessible to all users', 'success');
      }
      
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error);
      // Revert the toggle
      setSettings(prev => ({
        ...prev,
        maintenanceMode: !enabled
      }));
      showNotification('Failed to update maintenance mode', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showMaintenanceModal = () => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-black border-2 border-[#DAA425] rounded-lg p-6 max-w-md w-full shadow-xl">
        <div class="flex items-center mb-4">
          <div class="p-2 bg-[#DAA425] bg-opacity-20 rounded-full mr-3">
            <svg class="h-6 w-6 text-[#DAA425]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-[#DAA425]">⚠️ Maintenance Mode Active</h3>
        </div>
        <div class="text-white mb-6">
          <p class="font-semibold mb-2">Website is now OFFLINE for regular users!</p>
          <ul class="text-sm space-y-1 list-disc list-inside">
            <li>Only admins can access the site</li>
            <li>All users will see the maintenance page</li>
            <li>No regular functionality is available</li>
          </ul>
        </div>
        <div class="flex justify-end space-x-3">
          <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-[#DAA425] hover:bg-[#c4961f] text-black rounded-lg transition-colors font-medium">
            Understood
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    }, 8000);
  };

  const showNotification = (message, type = 'success') => {
    const bgColor = type === 'success' ? 'bg-[#DAA425]' : 'bg-red-600';
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 ${bgColor} text-black px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm border border-[#DAA425]`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 4000);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // In real app, this would be: 
      // await fetch('/api/admin/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings)
      // });
      
      localStorage.setItem('systemSettings', JSON.stringify(settings));
      
      showNotification('Settings saved successfully!', 'success');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      showNotification('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DAA425] mx-auto mb-4"></div>
          <p className="text-white">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#DAA425] flex items-center">
              <Cog6ToothIcon className="h-8 w-8 mr-3 text-[#DAA425]" />
              System Settings
            </h1>
            <p className="text-white mt-1">Configure maintenance mode and site settings</p>
          </div>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-[#DAA425] hover:bg-[#c4961f] text-black rounded-lg transition-all duration-300 font-medium disabled:opacity-50 flex items-center border border-[#DAA425]"
            >
              {saving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>

        {/* Website Status Alert */}
        <div className={`border-2 rounded-lg p-6 ${
          settings.maintenanceMode 
            ? 'bg-black border-red-600' 
            : 'bg-black border-[#DAA425]'
        }`}>
          <div className="flex items-center">
            <div className={`p-3 rounded-full mr-4 ${
              settings.maintenanceMode 
                ? 'bg-red-600 bg-opacity-20' 
                : 'bg-[#DAA425] bg-opacity-20'
            }`}>
              {settings.maintenanceMode ? (
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              ) : (
                <CheckCircleIcon className="h-8 w-8 text-[#DAA425]" />
              )}
            </div>
            <div>
              <h3 className={`text-xl font-bold ${
                settings.maintenanceMode ? 'text-red-600' : 'text-[#DAA425]'
              }`}>
                {settings.maintenanceMode ? '🚫 WEBSITE OFFLINE' : '✅ WEBSITE ONLINE'}
              </h3>
              <p className="text-white text-lg">
                {settings.maintenanceMode 
                  ? 'Only admins can access the site. Users see maintenance page.' 
                  : 'Website is fully accessible to all users and customers.'
                }
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Status updated: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Maintenance Mode Control */}
        <div className="bg-black rounded-lg shadow-sm border-2 border-[#DAA425] p-6">
          <h2 className="text-xl font-semibold text-[#DAA425] mb-6">🔧 Maintenance Mode Control</h2>
          
          <div className="bg-gray-900 border border-[#DAA425] rounded-lg p-6 mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                className="rounded border-[#DAA425] text-[#DAA425] focus:ring-[#DAA425] focus:ring-2 h-5 w-5 bg-black"
                disabled={saving}
              />
              <span className="ml-4 text-lg font-medium text-white">
                Enable Maintenance Mode
              </span>
              {saving && (
                <div className="ml-4 animate-spin rounded-full h-5 w-5 border-b-2 border-[#DAA425]"></div>
              )}
            </label>
            
            <div className="mt-4 ml-9 space-y-2">
              <p className="text-sm text-white">
                <strong className="text-[#DAA425]">When enabled:</strong> Website becomes completely inaccessible to regular users
              </p>
              <p className="text-sm text-white">
                <strong className="text-[#DAA425]">When disabled:</strong> Website returns to normal operation for all users
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#DAA425] mb-2">
                Maintenance Message (What users will see)
              </label>
              <textarea
                value={settings.maintenanceMessage}
                onChange={(e) => handleSettingChange('maintenanceMessage', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-black border-2 border-[#DAA425] text-white rounded-lg focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] transition-all duration-300"
                placeholder="Enter the message users will see when trying to access the website..."
              />
            </div>
          </div>
        </div>

        {/* Site Information */}
        <div className="bg-black rounded-lg shadow-sm border-2 border-[#DAA425] p-6">
          <h2 className="text-xl font-semibold text-[#DAA425] mb-6">📝 Site Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#DAA425] mb-2">Site Name</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => handleSettingChange('siteName', e.target.value)}
                className="w-full px-4 py-3 bg-black border-2 border-[#DAA425] text-white rounded-lg focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] transition-all duration-300"
                placeholder="Your website name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#DAA425] mb-2">Admin Email</label>
              <input
                type="email"
                value={settings.adminEmail}
                onChange={(e) => handleSettingChange('adminEmail', e.target.value)}
                className="w-full px-4 py-3 bg-black border-2 border-[#DAA425] text-white rounded-lg focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] transition-all duration-300"
                placeholder="admin@yoursite.com"
              />
            </div>
          </div>
        </div>

        {/* Maintenance Preview */}
        {settings.maintenanceMode && (
          <div className="bg-black rounded-lg shadow-sm border-2 border-[#DAA425] p-6">
            <h2 className="text-xl font-semibold text-[#DAA425] mb-4">👀 Maintenance Page Preview</h2>
            <p className="text-white mb-4">This is how the maintenance page will appear to regular users:</p>
            
            <div className="bg-gray-900 border-2 border-[#DAA425] rounded-lg p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#DAA425] bg-opacity-20 rounded-full mb-4">
                <svg className="h-8 w-8 text-[#DAA425]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.586V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-[#DAA425] mb-2">{settings.siteName}</h3>
              <h4 className="text-xl font-semibold text-[#DAA425] mb-4">Under Maintenance</h4>
              <div className="bg-black border-2 border-[#DAA425] rounded-lg p-3 mb-4">
                <p className="text-sm text-white">
                  <h1>{settings.maintenanceMessage}</h1>
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#DAA425]"></div>
                <span className="text-sm">Maintenance in progress...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettings;