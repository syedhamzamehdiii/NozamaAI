



















import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { googleAuthService } from '../../services/googleAuth';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError, user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const googleButtonRef = useRef(null);
  const containerRef = useRef(null);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Animate container on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Initialize Google Sign-In button
  useEffect(() => {
    const initializeGoogleButton = async () => {
      try {
        await googleAuthService.initialize();
        
        // Render Google button
        if (googleButtonRef.current) {
          googleAuthService.renderButton('google-signin-button', {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: '100%'
          });
        }
      } catch (error) {
        console.error('Failed to initialize Google button:', error);
      }
    };

    initializeGoogleButton();

    // Set up event listeners for Google auth
    const handleGoogleSuccess = (event) => {
      const { user: googleUser } = event.detail;
      showSuccess('Welcome!', 'You have been successfully logged in with Google.');
      const redirectPath = getRedirectPath(googleUser?.role || 'buyer');
      navigate(redirectPath, { replace: true });
    };

    const handleGoogleError = (event) => {
      setIsGoogleLoading(false);
      showError('Google Login Failed', event.detail.error || 'Google authentication failed');
    };

    window.addEventListener('googleLoginSuccess', handleGoogleSuccess);
    window.addEventListener('googleLoginError', handleGoogleError);

    return () => {
      window.removeEventListener('googleLoginSuccess', handleGoogleSuccess);
      window.removeEventListener('googleLoginError', handleGoogleError);
    };
  }, [navigate, showSuccess, showError]);

  // Function to get redirect path based on user role
  const getRedirectPath = useCallback((userRole) => {
    const from = location.state?.from || '/dashboard';
    
    if (from !== '/dashboard') {
      return from;
    }
    
    switch (userRole) {
      case 'admin':
        return '/admin';
      case 'seller':
        return '/seller';
      case 'buyer':
      default:
        return '/dashboard';
    }
  }, [location.state?.from]);

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      await googleAuthService.signIn();
      // Success handling is done by event listeners
    } catch (error) {
      setIsGoogleLoading(false);
      showError('Google Login Failed', error.message || 'Google authentication failed');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-100 rounded-full filter blur-3xl opacity-60 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gray-50 rounded-full filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/3 w-60 h-60 bg-gray-100 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card */}
      <div 
        ref={containerRef}
        className={`w-full max-w-md transition-all duration-1000 transform ${
          isVisible 
            ? 'translate-y-0 opacity-100 scale-100' 
            : 'translate-y-8 opacity-0 scale-95'
        }`}
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 space-y-8 relative overflow-hidden">
          {/* Subtle Border Animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-white to-gray-100 rounded-3xl opacity-50 animate-gradient-x"></div>
          
          {/* Header */}
          <div className="text-center relative z-10">
            <Link to="/" className="inline-block group">
              <h1 className="text-4xl font-bold text-black hover:scale-105 transition-transform duration-300">
                Nozama.ai
              </h1>
              <div className="h-1 w-0 bg-black group-hover:w-full transition-all duration-500 mx-auto mt-2"></div>
            </Link>
            
            <div className="mt-8 space-y-2">
              <h2 className="text-3xl font-bold text-black animate-fade-in-up">
                Welcome Back
              </h2>
              <p className="text-gray-600 animate-fade-in-up animation-delay-200">
                Sign in to continue your journey
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 animate-shake">
              <div className="flex items-start">
                <ExclamationCircleIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Authentication Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Google Login Section */}
          <div className="space-y-6 relative z-10">
            {/* Primary Google Button (Google's official button) */}
            <div className="w-full">
              <div 
                id="google-signin-button" 
                ref={googleButtonRef}
                className="w-full transform hover:scale-105 transition-all duration-300"
                style={{ minHeight: '56px' }}
              />
            </div>

            {/* Custom Fallback Google Button */}
            <div className="relative">
    
               

                {/* Hover Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute top-2 left-8 w-1 h-1 bg-gray-400 rounded-full animate-ping"></div>
                  <div className="absolute bottom-3 right-12 w-1 h-1 bg-gray-500 rounded-full animate-ping animation-delay-300"></div>
                  <div className="absolute top-4 right-6 w-1 h-1 bg-gray-600 rounded-full animate-ping animation-delay-600"></div>
                </div>
            </div>
          </div>

          {/* Features Highlight */}
          <div className="relative z-10 text-center space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center group cursor-pointer">
                <div className="w-12 h-12 mx-auto bg-black rounded-2xl flex items-center justify-center mb-2 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600 group-hover:text-black transition-colors font-medium">Fast & Secure</p>
              </div>
              
              <div className="text-center group cursor-pointer">
                <div className="w-12 h-12 mx-auto bg-gray-800 rounded-2xl flex items-center justify-center mb-2 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg animation-delay-200">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600 group-hover:text-black transition-colors font-medium">Privacy First</p>
              </div>
              
              <div className="text-center group cursor-pointer">
                <div className="w-12 h-12 mx-auto bg-gray-700 rounded-2xl flex items-center justify-center mb-2 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg animation-delay-400">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600 group-hover:text-black transition-colors font-medium">User Friendly</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 relative z-10 space-y-4">
            <p className="leading-relaxed">
              By signing in, you agree to our{' '}
              <Link 
                to="/terms" 
                className="text-black hover:text-gray-700 font-medium hover:underline transition-all duration-200"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link 
                to="/privacy" 
                className="text-black hover:text-gray-700 font-medium hover:underline transition-all duration-200"
              >
                Privacy Policy
              </Link>
            </p>
            
          </div>
        </div>

        {/* Subtle Floating Elements */}
        <div className="absolute -z-10 top-10 -left-4 w-20 h-20 bg-gray-100 rounded-full filter blur-xl opacity-30 animate-float"></div>
        <div className="absolute -z-10 -bottom-6 -right-4 w-16 h-16 bg-gray-50 rounded-full filter blur-xl opacity-20 animate-float animation-delay-1000"></div>
      </div>

      {/* Full Screen Background */}
      <div className="fixed inset-0 bg-white -z-20"></div>
    </div>
  );
};

export default LoginForm;

/* Custom CSS Classes to add to your global styles */
/*
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

@keyframes gradient-x {
  0%, 100% {
    transform: translateX(0%);
  }
  50% {
    transform: translateX(100%);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animate-gradient-x {
  animation: gradient-x 15s ease infinite;
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-fade-in-up {
  animation: fade-in-up 0.6s ease-out forwards;
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

.animation-delay-75 {
  animation-delay: 75ms;
}

.animation-delay-200 {
  animation-delay: 200ms;
}

.animation-delay-300 {
  animation-delay: 300ms;
}

.animation-delay-400 {
  animation-delay: 400ms;
}

.animation-delay-600 {
  animation-delay: 600ms;
}

.animation-delay-1000 {
  animation-delay: 1000ms;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}
*/







