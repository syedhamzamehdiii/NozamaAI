import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import AutocompleteSearch from '../AutocompleteSearch';
import PropTypes from 'prop-types';
import {
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  ShoppingBagIcon,
  HeartIcon,
  BuildingStorefrontIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const { totalItems } = useCart();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  // Helper function to get user display name
  const getUserDisplayName = () => {
    if (!user) return 'User';
    
    // For Google users, use first_name and last_name
    if (user.auth_provider === 'google') {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email?.split('@')[0] || 'User';
    }
    
    // For local users, use firstName and lastName (legacy) or first_name and last_name
    const firstName = user.firstName || user.first_name || '';
    const lastName = user.lastName || user.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    return fullName || user.email?.split('@')[0] || 'User';
  };

  // Helper function to get user initials
  const getUserInitials = () => {
    if (!user) return 'U';
    
    const displayName = getUserDisplayName();
    const names = displayName.split(' ');
    
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    
    return displayName.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U';
  };

  const navigationItems = [
    { name: 'Products', href: '/products', current: location.pathname === '/products' },
    { name: 'Community', href: '/community', current: location.pathname === '/community' },
    { name: 'About', href: '/about', current: location.pathname === '/about' },
    { name: 'Contact', href: '/contact', current: location.pathname === '/contact' }
  ];

  const userMenuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: UserCircleIcon },
    { name: 'My Orders', href: '/orders', icon: ShoppingBagIcon },
    { name: 'Wishlist', href: '/wishlist', icon: HeartIcon },
    { name: 'Sell Products', href: '/seller', icon: BuildingStorefrontIcon },
    { name: 'Profile Settings', href: '/profile', icon: Cog6ToothIcon }
  ];

  return (
    <header className="bg-black border-gray-800 shadow-lg border-b sticky top-0 z-50">
      <div className="max-w-full mx-auto">
        {/* Main Header Container - Responsive Padding */}
        <div className="flex items-center justify-between h-20 px-3 sm:h-16 sm:px-4 md:h-18 md:px-6 lg:h-20 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20">
          
          {/* Logo Section - Now with Image and Text */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2 lg:space-x-3">
              {/* Logo Image */}
              <img 
                src="/logo.png" 
                alt="Nozama AI Logo" 
                className="h-8 w-auto sm:h-10 md:h-12 lg:h-14 xl:h-16 2xl:h-18 transition-transform duration-300 hover:scale-105"
              />
            </Link>
          </div>

          {/* Welcome Message - Responsive Display */}
          {isAuthenticated && user && (
            <div className="hidden sm:flex items-center bg-gray-900 rounded-lg px-2 py-1 ml-2 md:ml-4 lg:px-3 lg:py-1.5 xl:px-4 xl:py-2">
              <span className="text-xs text-gray-300 md:text-sm lg:text-base">Welcome back,</span>
              <span className="text-xs font-semibold text-[#DAA425] ml-1 md:text-sm lg:text-base truncate max-w-20 sm:max-w-24 md:max-w-32 lg:max-w-40">
                {getUserDisplayName()}
              </span>
            </div>
          )}

          {/* Admin Access - Responsive Display */}
          {hasRole('admin') && (
            <div className="hidden xl:flex">
              <Link 
                to="/admin" 
                className="flex items-center px-2 py-1.5 text-xs font-medium text-white hover:text-[#DAA425] hover:bg-gray-900 rounded-md transition-all duration-300
                         lg:px-3 lg:py-2 lg:text-sm xl:text-base 2xl:px-4 2xl:py-2.5"
              >
                <ShieldCheckIcon className="h-3 w-3 mr-1 lg:h-4 lg:w-4 xl:h-5 xl:w-5" />
                Admin Panel
              </Link>
            </div>
          )}

          {/* Search Bar - Desktop Only, Responsive Width */}
          <div className="hidden md:block flex-1 max-w-xs mx-3 lg:max-w-sm lg:mx-4 xl:max-w-md xl:mx-6 2xl:max-w-lg 2xl:mx-8 3xl:max-w-xl">
            <AutocompleteSearch
              className="block w-full pr-3 py-1.5 border transition-all duration-300 text-xs rounded-lg leading-5 focus:outline-none focus:placeholder-gray-500 focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] lg:py-2 lg:text-sm xl:text-base border-gray-600 bg-black text-white placeholder-gray-400"
              placeholder="Search AI tools, datasets, APIs..."
            />
          </div>

          {/* Desktop Navigation - Responsive Spacing */}
          <nav className="hidden lg:flex space-x-2 xl:space-x-4 2xl:space-x-6 3xl:space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  item.current
                    ? 'border-[#DAA425] text-[#DAA425]'
                    : 'border-transparent text-white hover:border-[#DAA425] hover:text-[#DAA425]'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-300
                xl:text-base 2xl:text-lg`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right Side Actions - Responsive Spacing */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 lg:space-x-4">

            {/* Cart - Responsive Size */}
            <Link
              to="/cart"
              className="p-1.5 rounded-lg relative transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#DAA425]
                       lg:p-2 xl:p-2.5 text-white hover:text-[#DAA425] hover:bg-gray-900"
            >
              <ShoppingCartIcon className="h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#DAA425] text-black text-xs rounded-full h-4 w-4 flex items-center justify-center font-semibold
                               lg:h-5 lg:w-5 xl:h-6 xl:w-6 xl:text-sm">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>

            {/* User Menu - Responsive Size */}
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-1 p-1.5 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#DAA425]
                           lg:p-2 lg:space-x-2 xl:p-2.5 text-white hover:text-[#DAA425] hover:bg-gray-900"
                >
                  <div className="h-6 w-6 bg-[#DAA425] rounded-full flex items-center justify-center
                                lg:h-8 lg:w-8 xl:h-10 xl:w-10">
                    <span className="text-xs font-medium text-black lg:text-sm xl:text-base">
                      {getUserInitials()}
                    </span>
                  </div>
                  <ChevronDownIcon className="h-3 w-3 hidden sm:block lg:h-4 lg:w-4 xl:h-5 xl:w-5" />
                </button>

                {/* User Dropdown - Responsive Size */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 border rounded-lg shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50
                                 sm:w-56 lg:w-64 xl:w-72 bg-black border-gray-700">
                    <div className="py-1">
                      {/* User Info */}
                      <div className="px-3 py-2 border-b lg:px-4 lg:py-3 border-gray-700">
                        <p className="text-sm font-medium truncate lg:text-base text-white">
                          {getUserDisplayName()}
                        </p>
                        <p className="text-xs truncate lg:text-sm text-gray-400">
                          {user?.email}
                        </p>
                      </div>

                      {/* Menu Items */}
                      {userMenuItems.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className="flex items-center px-3 py-2 text-sm transition-colors duration-300
                                   lg:px-4 lg:text-base text-white hover:bg-gray-900 hover:text-[#DAA425]"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <item.icon className="h-4 w-4 mr-2 text-gray-400 lg:h-5 lg:w-5 lg:mr-3" />
                          {item.name}
                        </Link>
                      ))}

                      {/* Admin Panel for mobile/tablet */}
                      {hasRole('admin') && (
                        <Link
                          to="/admin"
                          className="flex items-center px-3 py-2 text-sm transition-colors duration-300 xl:hidden
                                   lg:px-4 lg:text-base text-white hover:bg-gray-900 hover:text-[#DAA425]"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <ShieldCheckIcon className="h-4 w-4 mr-2 text-gray-400 lg:h-5 lg:w-5 lg:mr-3" />
                          Admin Panel
                        </Link>
                      )}

                      {/* Divider */}
                      <div className="border-t border-gray-700"></div>

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-3 py-2 text-sm transition-colors duration-300
                                 lg:px-4 lg:text-base text-white hover:bg-gray-900 hover:text-[#DAA425]"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2 text-gray-400 lg:h-5 lg:w-5 lg:mr-3" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Login/Register Buttons - Responsive */
              <div className="flex items-center space-x-1.5 sm:space-x-2 lg:space-x-3">
                <Link
                  to="/login"
                  className="px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-300
                           sm:px-3 lg:px-4 lg:py-2 lg:text-sm xl:text-base text-white hover:text-[#DAA425] hover:bg-gray-900"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 shadow-lg hover:shadow-[#DAA425]/20
                           sm:px-3 lg:px-4 lg:py-2 lg:text-sm xl:text-base"
                >
                  Get started
                </Link>
              </div>
            )}

            {/* Mobile menu button - Responsive Size */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#DAA425]
                       md:p-2 text-white hover:text-[#DAA425] hover:bg-gray-900"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-5 w-5 md:h-6 md:w-6" />
              ) : (
                <Bars3Icon className="h-5 w-5 md:h-6 md:w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar - Responsive */}
        <div className="md:hidden px-3 pb-2 sm:px-4 sm:pb-3">
          <AutocompleteSearch
            className="block w-full pr-3 py-1.5 border rounded-lg leading-5 transition-all duration-300 text-sm focus:outline-none focus:placeholder-gray-500 focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] sm:py-2 border-gray-600 bg-black text-white placeholder-gray-400"
            placeholder="Search AI tools..."
            isMobile={true}
          />
        </div>
      </div>

      {/* Mobile Menu - Responsive */}
      {isMobileMenuOpen && (
        <div className="lg:hidden" ref={mobileMenuRef}>
          <div className="px-2 pt-2 pb-3 space-y-1 border-t sm:px-3 bg-black border-gray-700">
            {/* Mobile welcome message */}
            {isAuthenticated && user && (
              <div className="px-2 py-2 border-b border-gray-700 sm:px-3">
                <div className="bg-gray-900 rounded-lg px-3 py-2">
                  <p className="text-sm text-gray-300">
                    Welcome back, <span className="text-[#DAA425] font-semibold">{getUserDisplayName()}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Items */}
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  item.current
                    ? 'bg-gray-900 border-[#DAA425] text-[#DAA425]'
                    : 'border-transparent text-white hover:bg-gray-900 hover:border-[#DAA425] hover:text-[#DAA425]'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-all duration-300 sm:py-3 sm:text-lg`}
              >
                {item.name}
              </Link>
            ))}

            {/* Mobile User Menu */}
            {isAuthenticated ? (
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center px-2 mb-3 sm:px-3">
                  <div className="h-8 w-8 bg-[#DAA425] rounded-full flex items-center justify-center sm:h-10 sm:w-10">
                    <span className="text-sm font-medium text-black sm:text-base">
                      {getUserInitials()}
                    </span>
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-white sm:text-base">
                      {getUserDisplayName()}
                    </div>
                    <div className="text-xs text-gray-400 sm:text-sm truncate max-w-40 sm:max-w-48">
                      {user?.email}
                    </div>
                  </div>
                </div>

                {userMenuItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center px-2 py-2 text-sm font-medium text-white hover:text-[#DAA425] hover:bg-gray-900 transition-all duration-300
                             sm:px-3 sm:py-3 sm:text-base"
                  >
                    <item.icon className="h-4 w-4 mr-3 text-gray-400 sm:h-5 sm:w-5" />
                    {item.name}
                  </Link>
                ))}

                {/* Admin Panel for mobile */}
                {hasRole('admin') && (
                  <Link
                    to="/admin"
                    className="flex items-center px-2 py-2 text-sm font-medium text-white hover:text-[#DAA425] hover:bg-gray-900 transition-all duration-300
                             sm:px-3 sm:py-3 sm:text-base"
                  >
                    <ShieldCheckIcon className="h-4 w-4 mr-3 text-gray-400 sm:h-5 sm:w-5" />
                    Admin Panel
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-2 py-2 text-sm font-medium text-white hover:text-[#DAA425] hover:bg-gray-900 transition-all duration-300
                           sm:px-3 sm:py-3 sm:text-base"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3 text-gray-400 sm:h-5 sm:w-5" />
                  Sign out
                </button>
              </div>
            ) : (
              <div className="border-t border-gray-700 pt-4 space-y-1">
                <Link
                  to="/login"
                  className="block px-2 py-2 text-sm font-medium text-white hover:text-[#DAA425] hover:bg-gray-900 transition-all duration-300
                           sm:px-3 sm:py-3 sm:text-base"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="block px-2 py-2 text-sm font-medium text-[#DAA425] hover:text-[#DAA740] hover:bg-gray-900 transition-all duration-300
                           sm:px-3 sm:py-3 sm:text-base"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

Header.propTypes = {};

export default Header;