// src/components/admin/SimpleAdminLayout.jsx
import React from 'react';
import { 
  CubeIcon, 
  PlusIcon, 
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const SimpleAdminLayout = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('simpleAdminUser') || '{}');
  
  const handleLogout = () => {
    localStorage.removeItem('simpleAdminToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('simpleAdminUser');
    window.location.href = '/simple-admin/login';
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <CubeIcon className="h-8 w-8 text-[#DAA425] mr-3" />
              <h1 className="text-xl font-bold text-white">Product Admin</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {user.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <a 
              href="/simple-admin" 
              className="flex items-center px-1 py-4 text-sm font-medium text-[#DAA425] border-b-2 border-[#DAA425]"
            >
              <CubeIcon className="h-4 w-4 mr-2" />
              Dashboard
            </a>
            <a 
              href="/simple-admin/products" 
              className="flex items-center px-1 py-4 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              All Products
            </a>
            <a 
              href="/simple-admin/products/create" 
              className="flex items-center px-1 py-4 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
                {/* // In your AdminLayout.jsx, add this menu item: */}
<a 
  href="/admin/simple-admins" 
  className="text-gray-300 hover:text-[#DAA425] px-3 py-2 rounded-md text-sm font-medium transition-colors duration-300"
>
  Simple Admins
</a>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Product
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
};

export default SimpleAdminLayout;