import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon },
    { name: 'Users', href: '/admin/users', icon: UsersIcon },
    { name: 'Products', href: '/admin/products', icon: ShoppingBagIcon },
    { name: 'Orders', href: '/admin/orders', icon: ClipboardDocumentListIcon },
    { name: 'Statistics', href: '/admin/stats', icon: ChartBarIcon },
    { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-black">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-black bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-14 sm:h-16 px-4 lg:px-6 bg-gray-900 border-b border-gray-800">
          <Link to="/admin" className="text-[#DAA425] text-lg sm:text-xl font-bold hover:text-[#DAA740] transition-colors duration-300">
            Nozama.ai Admin
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white p-2 rounded-lg transition-colors duration-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto mt-4 lg:mt-6 px-2 lg:px-4 space-y-1 lg:space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center px-3 lg:px-4 py-2 lg:py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                  isActive
                    ? 'bg-[#DAA425] bg-opacity-20 text-[#DAA425] border-r-4 border-[#DAA425]'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-[#DAA425]'
                }`}
              >
                <item.icon
                  className={`mr-2 lg:mr-3 h-4 w-4 lg:h-5 lg:w-5 transition-colors duration-300 ${
                    isActive ? 'text-[#DAA425]' : 'text-gray-400 group-hover:text-[#DAA425]'
                  }`}
                />
                <span className="text-xs lg:text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-3 lg:p-4 border-t border-gray-800 bg-gray-900">
          <div className="flex items-center">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#DAA425] rounded-full flex items-center justify-center text-black text-xs lg:text-sm font-semibold">
              {user?.first_name?.[0] || user?.email?.[0] || 'A'}
              {user?.last_name?.[0] || ''}
            </div>
            <div className="ml-2 lg:ml-3 flex-1 min-w-0">
              <p className="text-xs lg:text-sm font-medium text-white truncate">
                {user?.first_name || 'Admin'} {user?.last_name || 'User'}
              </p>
              <p className="text-xs text-gray-400">Administrator</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 text-gray-400 hover:text-[#DAA425] p-1 lg:p-2 rounded-lg transition-colors duration-300"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 lg:h-5 lg:w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 lg:ml-0">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-gray-900 border-b border-gray-800 shadow-lg">
          <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6">
            <div className="flex items-center space-x-3 lg:space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-400 hover:text-[#DAA425] p-2 rounded-lg transition-colors duration-300"
              >
                <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-[#DAA425]">
                Admin Dashboard
              </h1>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              
              {/* View Site Link */}
              <Link
                to="/"
                className="hidden sm:inline-flex text-xs sm:text-sm text-[#DAA425] hover:text-[#DAA740] font-medium px-3 py-2 rounded-lg hover:bg-gray-800 transition-all duration-300"
              >
                View Site
              </Link>
              
              {/* Mobile View Site Button */}
              <Link
                to="/"
                className="sm:hidden text-gray-400 hover:text-[#DAA425] p-2 rounded-lg transition-colors duration-300"
                title="View Site"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>

              {/* Mobile User Menu */}
              <div className="lg:hidden flex items-center">
                <div className="w-8 h-8 bg-[#DAA425] rounded-full flex items-center justify-center text-black text-xs font-semibold">
                  {user?.first_name?.[0] || user?.email?.[0] || 'A'}
                </div>
              </div>
            </div>
          </div>
        </header>
        {/* Page Content */}
        <main className="flex-1 bg-black overflow-auto">
          {children}
        </main>

        {/* Quick Stats Footer - Only on larger screens */}
        <footer className="hidden lg:block bg-gray-900 border-t border-gray-800 px-6 py-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#DAA425] rounded-full"></div>
                <span>System Online</span>
              </div>
              <div>
                <span className="text-gray-500">Last Update:</span>
                <span className="ml-1 text-[#DAA425]">2 mins ago</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span>Uptime: <span className="text-[#DAA425]">99.9%</span></span>
              <span>Users Online: <span className="text-[#DAA425]">1,234</span></span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;