import ImageTest from './components/ImageTest';
import ScrollToTop from './components/ScrollToTop';
import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import NozamaChatbot from './components/Chatbot/NozamaChatbot';
// Context Providers
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
// Import useAuth hook - MOVED TO TOP
import { useAuth } from './context/AuthContext';
// Layout Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import LoadingSpinner from './components/common/LoadingSpinner';
import Toast from './components/common/Toast';

// Auth Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ForgotPassword from './components/auth/ForgotPassword';
import CheckoutSuccess from './Pages/CheckoutSuccess';

// Import admin components
import AdminLayout from './components/common/AdminLayout';
import AdminLogin from './components/admin/AdminLogin';

// Lazy load pages for better performance
const Home = lazy(() => import('./Pages/Home'));
const Dashboard = lazy(() => import('./Pages/Dashboard'));
const Products = lazy(() => import('./Pages/Products'));
const ProductDetail = lazy(() => import('./Pages/ProductDetail'));
const Cart = lazy(() => import('./Pages/Cart'));
const Checkout = lazy(() => import('./Pages/Checkout'));
const Orders = lazy(() => import('./Pages/Orders'));
const Profile = lazy(() => import('./Pages/Profile'));
const Wishlist = lazy(() => import('./Pages/Wishlist'));
import Privacy from './Pages/Privacy';
import Terms from './pages/Terms';
// Business Pages
const Seller = lazy(() => import('./Pages/Seller'));
const Admin = lazy(() => import('./Pages/Admin'));
const Affiliate = lazy(() => import('./Pages/Affiliate'));
const Community = lazy(() => import('./Pages/Community'));

// Static Pages
const About = lazy(() => import('./Pages/About'));
const Contact = lazy(() => import('./Pages/Contact'));
const PrivacyPolicy = lazy(() => import('./Pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./Pages/TermsOfService'));
const NotFound = lazy(() => import('./Pages/NotFound'));

// Admin Components (lazy loaded)
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./components/admin/UserManagement'));
const ProductManagement = lazy(() => import('./components/admin/ProductManagement'));
const OrderManagement = lazy(() => import('./components/admin/OrderManagement'));
const NotificationLog = lazy(() => import('./components/admin/NotificationLog'));
const AdminStats = lazy(() => import('./components/admin/AdminStats'));
const SystemSettings = lazy(() => import('./components/admin/SystemSettings'));

// MAINTENANCE MODE COMPONENTS
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import SimpleAdminProductFormModal from './components/admin/SimpleAdminProductFormModal';






// Add these imports at the top
const SimpleAdminLogin = lazy(() => import('./components/admin/SimpleAdminLogin'));
const SimpleAdminDashboard = lazy(() => import('./components/admin/SimpleAdminDashboard'));
const SimpleAdminLayout = lazy(() => import('./components/admin/SimpleAdminLayout'));
const SimpleAdminProtectedRoute = lazy(() => import('./components/auth/SimpleAdminProtectedRoute'));
const SimpleAdminManagement = lazy(() => import('./components/admin/SimpleAdminManagement'));

// Update your App.jsx imports:
const SimpleAdminProductManagement = lazy(() => import('./components/admin/SimpleAdminProductManagement')); // ✅ For Simple Admin's own products  
const SimpleAdminProductCreate = lazy(() => import('./components/admin/SimpleAdminProductCreate')); // ✅ For creating products

// Update 
const SimpleAdminTest = lazy(() => import('./components/admin/SimpleAdminTest'));














// Maintenance Page Component - What users see when maintenance is enabled
const MaintenancePage = ({ settings }) => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-900 bg-opacity-20 rounded-full mb-6">
            <WrenchScrewdriverIcon className="h-10 w-10 text-yellow-400" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4">
            {settings.siteName}
          </h1>
          
          <h2 className="text-xl font-semibold text-yellow-400 mb-4">
            Under Maintenance
          </h2>
          
          <p className="text-gray-300 text-lg mb-6 leading-relaxed">
            {settings.maintenanceMessage}
          </p>
          
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400">
              We apologize for any inconvenience. Our team is working hard to improve your experience.
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
            <span className="text-sm">Maintenance in progress...</span>
          </div>
          
          <div className="mt-8 text-xs text-gray-500">
            Expected completion: Please check back shortly
          </div>
        </div>
      </div>
    </div>
  );
};

// Maintenance Mode Hook
const useMaintenanceMode = () => {
  const [maintenanceSettings, setMaintenanceSettings] = useState({
    siteName: 'Nozama.ai',
    adminEmail: 'admin@nozama.ai',
    maintenanceMode: false,
    maintenanceMessage: 'We are currently performing scheduled maintenance to improve your experience. Please check back shortly.'
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load maintenance settings
    const loadSettings = async () => {
      try {
        // In real app, this would be: const response = await fetch('/api/maintenance-status');
        const savedSettings = localStorage.getItem('systemSettings');
        if (savedSettings) {
          setMaintenanceSettings(JSON.parse(savedSettings));
        }
      } catch (error) {
        console.error('Failed to load maintenance settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    // Optional: Poll for maintenance status changes every 30 seconds
    const interval = setInterval(loadSettings, 30000);
    return () => clearInterval(interval);
  }, []);

  return { maintenanceSettings, loading };
};

// Error Fallback Component
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <h2 className="font-bold text-lg mb-2">Something went wrong!</h2>
          <p className="text-sm">{error.message}</p>
        </div>
        <button
          onClick={resetErrorBoundary}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

// Loading Component
const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <LoadingSpinner size="large" />
  </div>
);

// Main Layout Component
const Layout = ({ children, hideHeader = false, hideFooter = false }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!hideHeader && <Header />}
      <main className="flex-1">
        {children}
      </main>
      {!hideFooter && <Footer />}
      <Toast />
    </div>
  );
};

// Auth Layout (for login/register pages)
const AuthLayout = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-md w-full space-y-8">
      {children}
    </div>
  </div>
);

// Component to redirect users to appropriate dashboard
const DashboardRedirect = () => {
  const { user } = useAuth();
  
  // Redirect based on user role
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  } else if (user?.role === 'seller') {
    return <Navigate to="/seller" replace />;
  } else {
    // Default to user dashboard for buyers and other roles
    return (
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Dashboard />
        </Suspense>
      </Layout>
    );
  }
};

// Dashboard Router Component - Routes users to correct dashboard based on role
const DashboardRouter = () => {
  return (
    <ProtectedRoute>
      <DashboardRedirect />
    </ProtectedRoute>
  );
};

// Main App Routes Component
const AppRoutes = () => {
  return (
    <Routes>
      {/* Admin Login Route - Always accessible even during maintenance */}
      <Route 
        path="/admin/login" 
        element={
          <Suspense fallback={<PageLoader />}>
            <AdminLogin />
          </Suspense>
        } 
      />
 {/* Add this route temporarily: */}
 <Route path="/debug-images" element={<ImageTest />} />



// Inside your Routes section:
<Route
  path="/terms"
  element={
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Terms />
      </Suspense>
    </Layout>
  }
/>

<Route
  path="/privacy"
  element={
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Privacy />
      </Suspense>
    </Layout>
  }
/>









{/* // Add these routes in your Routes section: */}

{/* Simple Admin Login Route */}
<Route 
  path="/simple-admin/login" 
  element={
    <Suspense fallback={<PageLoader />}>
      <SimpleAdminLogin />
    </Suspense>
  } 
/>

{/* Simple Admin Dashboard */}
<Route 
  path="/simple-admin" 
  element={
    <SimpleAdminProtectedRoute>
      <SimpleAdminLayout>
        <Suspense fallback={<PageLoader />}>
          <SimpleAdminDashboard />
        </Suspense>
      </SimpleAdminLayout>
    </SimpleAdminProtectedRoute>
  } 
/>

{/* Simple Admin Product Management - Use existing ProductManagement component */}
<Route 
  path="/simple-admin/products" 
  element={
    <SimpleAdminProtectedRoute>
      <SimpleAdminLayout>
        <Suspense fallback={<PageLoader />}>
          <SimpleAdminProductManagement />
        </Suspense>
      </SimpleAdminLayout>
    </SimpleAdminProtectedRoute>
  } 
/>

{/* Add this route for the create page if it doesn't exist */}
<Route 
  path="/simple-admin/products/create" 
  element={
    <SimpleAdminProtectedRoute>
      <SimpleAdminLayout>
        <Suspense fallback={<PageLoader />}>
          <SimpleAdminProductCreate />
        </Suspense>
      </SimpleAdminLayout>
    </SimpleAdminProtectedRoute>
  } 
/>

{/* Super Admin - Simple Admin Management */}
<Route 
  path="/admin/simple-admins" 
  element={
    <ProtectedRoute requiredRole="admin">
      <AdminLayout>
        <Suspense fallback={<PageLoader />}>
          <SimpleAdminManagement />
        </Suspense>
      </AdminLayout>
    </ProtectedRoute>
  } 
/>



<Route 
  path="/admin/simple-admins-test" 
  element={
    <ProtectedRoute requiredRole="admin">
      <AdminLayout>
        <Suspense fallback={<PageLoader />}>
          <SimpleAdminTest />
        </Suspense>
      </AdminLayout>
    </ProtectedRoute>
  } 
/>

// Add this route BEFORE your protected route in App.jsx
<Route 
  path="/admin/simple-admins-test-no-auth" 
  element={
    <AdminLayout>
      <Suspense fallback={<PageLoader />}>
        <SimpleAdminManagement />
      </Suspense>
    </AdminLayout>
  } 
/>

// Keep your existing protected route as well
<Route 
  path="/admin/simple-admins" 
  element={
    <ProtectedRoute requiredRole="admin">
      <AdminLayout>
        <Suspense fallback={<PageLoader />}>
          <SimpleAdminManagement />
        </Suspense>
      </AdminLayout>
    </ProtectedRoute>
  } 
/>























{/* // Add this route in your Routes section (around line 400-500) */}
<Route 
  path="/wishlist" 
  element={
    <ProtectedRoute>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Wishlist />
        </Suspense>
      </Layout>
    </ProtectedRoute>
  } 
/>





      {/* Auth Routes */}
      <Route 
        path="/login" 
        element={
          <AuthLayout>
            <Suspense fallback={<PageLoader />}>
              <LoginForm />
            </Suspense>
          </AuthLayout>
        } 
      />
      
      <Route 
        path="/register" 
        element={
          <AuthLayout>
            <Suspense fallback={<PageLoader />}>
              <RegisterForm />
            </Suspense>
          </AuthLayout>
        } 
      />
      
      <Route 
        path="/forgot-password" 
        element={
          <AuthLayout>
            <Suspense fallback={<PageLoader />}>
              <ForgotPassword />
            </Suspense>
          </AuthLayout>
        } 
      />

      {/* Public Routes */}
      <Route 
        path="/" 
        element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Home />
            </Suspense>
            <NozamaChatbot /> {/* Chatbot component */}
          </Layout>
        } 
      />

      <Route 
        path="/products" 
        element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Products />
            </Suspense>
          </Layout>
        } 
      />

      <Route 
        path="/products/:id" 
        element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ProductDetail />
            </Suspense>
          </Layout>
        } 
      />

      <Route 
        path="/cart" 
        element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Cart />
            </Suspense>
          </Layout>
        } 
      />

      <Route 
        path="/about" 
        element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <About />
            </Suspense>
          </Layout>
        } 
      />

      <Route 
        path="/contact" 
        element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Contact />
            </Suspense>
          </Layout>
        } 
      />

      <Route 
        path="/privacy" 
        element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <PrivacyPolicy />
            </Suspense>
          </Layout>
        } 
      />

      <Route 
        path="/terms" 
        element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <TermsOfService />
            </Suspense>
          </Layout>
        } 
      />

      <Route 
        path="/community" 
        element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Community />
            </Suspense>
          </Layout>
        } 
      />
{/* <Route path="/seller" element={<Seller />} /> */}
<Route path="/checkout/success" element={<CheckoutSuccess />} />
      {/* Dashboard Route - Redirects based on user role */}
      <Route 
        path="/dashboard" 
        element={<DashboardRouter />}
      />

      {/* Protected Routes - Require Authentication */}
      <Route 
        path="/checkout" 
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Checkout />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/orders" 
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Orders />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Profile />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        } 
      />

      {/* Seller Routes */}
      <Route 
        path="/seller" 
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Seller />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        } 
      />

      {/* ADMIN ROUTES */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard />
              </Suspense>
            </AdminLayout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/admin/users" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <Suspense fallback={<PageLoader />}>
                <UserManagement/>
              </Suspense>
            </AdminLayout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/admin/products" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <Suspense fallback={<PageLoader />}>
                <ProductManagement/>
              </Suspense>
            </AdminLayout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/admin/orders" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <Suspense fallback={<PageLoader />}>
                <OrderManagement  />
              </Suspense>
            </AdminLayout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/admin/notifications" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <Suspense fallback={<PageLoader />}>
                <NotificationLog />
              </Suspense>
            </AdminLayout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/admin/stats" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <Suspense fallback={<PageLoader />}>
                <AdminStats />
              </Suspense>
            </AdminLayout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/admin/settings" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <Suspense fallback={<PageLoader />}>
                <SystemSettings/>
              </Suspense>
            </AdminLayout>
          </ProtectedRoute>
        } 
      />

      {/* Affiliate Routes */}
      <Route 
        path="/affiliate" 
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Affiliate />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        } 
      />

      {/* 404 Route */}
      <Route 
        path="*" 
        element={
          <Layout hideHeader hideFooter>
            <Suspense fallback={<PageLoader />}>
              <NotFound />
            </Suspense>
          </Layout>
        } 
      />
    </Routes>
  );
};

// Main App Component with Maintenance Mode Logic
const App = () => {
  const { maintenanceSettings, loading } = useMaintenanceMode();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Router>
        <ScrollToTop />
        <ThemeProvider>
          <NotificationProvider>
            <AuthProvider>
              <CartProvider>
                <div className="App">
                  <MaintenanceModeWrapper maintenanceSettings={maintenanceSettings}>
                    <AppRoutes />
                  </MaintenanceModeWrapper>
                </div>
              </CartProvider>
            </AuthProvider>
          </NotificationProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
};

// Maintenance Mode Wrapper Component
const MaintenanceModeWrapper = ({ maintenanceSettings, children }) => {
  const { user } = useAuth();
  const currentPath = window.location.pathname;
  
  // Always allow access to admin login page
  if (currentPath === '/admin/login') {
    return children;
  }
  
  // Check if maintenance mode is enabled and user is not an admin
  const isMaintenanceMode = maintenanceSettings.maintenanceMode;
  const isAdmin = user?.role === 'admin';
  
  // If maintenance mode is ON and user is NOT admin, show maintenance page
  if (isMaintenanceMode && !isAdmin) {
    return (
      <div>
        <MaintenancePage settings={maintenanceSettings} />
        {/* Admin Access Button */}
        <div className="fixed bottom-4 right-4">
          <a
            href="/admin/login"
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg border border-gray-600"
          >
            Admin Access
          </a>
        </div>
      </div>
    );
  }
  
  // Otherwise, show normal app
  return children;
};

export default App;