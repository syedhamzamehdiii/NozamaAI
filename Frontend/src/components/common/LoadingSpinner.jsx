import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'blue', 
  className = '',
  message = '',
  overlay = false,
  variant = 'spinner'
}) => {
  // Size configurations
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    'extra-large': 'w-16 h-16'
  };

  // Color configurations
  const colorClasses = {
    blue: 'text-blue-600',
    gray: 'text-gray-600',
    white: 'text-white',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600',
    indigo: 'text-indigo-600'
  };

  // Message size based on spinner size
  const messageSize = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
    'extra-large': 'text-lg'
  };

  // Spinner variants
  const renderSpinner = () => {
    const baseClasses = `${sizeClasses[size]} ${colorClasses[color]} ${className}`;

    switch (variant) {
      case 'dots':
        return (
          <div className={`flex space-x-1 ${className}`}>
            <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
            <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
            <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
          </div>
        );

      case 'pulse':
        return (
          <div className={`${baseClasses} rounded-full bg-current animate-pulse`}></div>
        );

      case 'ping':
        return (
          <div className="relative">
            <div className={`${baseClasses} rounded-full bg-current`}></div>
            <div className={`${baseClasses} rounded-full bg-current absolute top-0 left-0 animate-ping`}></div>
          </div>
        );

      case 'bars':
        return (
          <div className={`flex space-x-1 ${className}`}>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`w-1 bg-current ${colorClasses[color]} animate-pulse`}
                style={{
                  height: sizeClasses[size].includes('w-4') ? '16px' : 
                          sizeClasses[size].includes('w-8') ? '32px' :
                          sizeClasses[size].includes('w-12') ? '48px' : '64px',
                  animationDelay: `${i * 150}ms`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        );

      case 'ring':
        return (
          <div className={`${baseClasses} border-4 border-gray-200 border-t-current rounded-full animate-spin`}></div>
        );

      case 'dual-ring':
        return (
          <div className={`${baseClasses} relative`}>
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-current border-r-current rounded-full animate-spin"></div>
          </div>
        );

      case 'wandering-cubes':
        return (
          <div className={`${baseClasses} relative`}>
            <div className="absolute w-2 h-2 bg-current rounded animate-bounce" style={{ top: '0%', left: '0%', animationDelay: '0s' }}></div>
            <div className="absolute w-2 h-2 bg-current rounded animate-bounce" style={{ top: '0%', right: '0%', animationDelay: '0.1s' }}></div>
            <div className="absolute w-2 h-2 bg-current rounded animate-bounce" style={{ bottom: '0%', right: '0%', animationDelay: '0.2s' }}></div>
            <div className="absolute w-2 h-2 bg-current rounded animate-bounce" style={{ bottom: '0%', left: '0%', animationDelay: '0.3s' }}></div>
          </div>
        );

      case 'square-grid':
        return (
          <div className={`grid grid-cols-3 gap-1 ${className}`}>
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className={`${colorClasses[color]} bg-current opacity-50 animate-pulse`}
                style={{
                  width: sizeClasses[size].includes('w-4') ? '4px' : 
                        sizeClasses[size].includes('w-8') ? '8px' :
                        sizeClasses[size].includes('w-12') ? '12px' : '16px',
                  height: sizeClasses[size].includes('w-4') ? '4px' : 
                         sizeClasses[size].includes('w-8') ? '8px' :
                         sizeClasses[size].includes('w-12') ? '12px' : '16px',
                  animationDelay: `${i * 100}ms`,
                  animationDuration: '1.2s'
                }}
              />
            ))}
          </div>
        );

      case 'wave':
        return (
          <div className={`flex items-end space-x-1 ${className}`}>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1 bg-current ${colorClasses[color]} animate-pulse`}
                style={{
                  height: sizeClasses[size].includes('w-4') ? '16px' : 
                          sizeClasses[size].includes('w-8') ? '32px' :
                          sizeClasses[size].includes('w-12') ? '48px' : '64px',
                  animationDelay: `${i * 100}ms`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        );

      case 'spinner':
      default:
        return (
          <svg
            className={`${baseClasses} animate-spin`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
    }
  };

  // If overlay is true, render as a full-screen overlay
  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 flex flex-col items-center space-y-4">
          {renderSpinner()}
          {message && (
            <p className={`text-gray-700 ${messageSize[size]} font-medium text-center`}>
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Regular inline spinner
  return (
    <div className="flex flex-col items-center space-y-2">
      {renderSpinner()}
      {message && (
        <p className={`text-gray-600 ${messageSize[size]} text-center`}>
          {message}
        </p>
      )}
    </div>
  );
};

// Predefined spinner configurations for common use cases
export const PageLoader = ({ message = "Loading..." }) => (
  <LoadingSpinner 
    size="large" 
    color="blue" 
    message={message}
    className="mx-auto"
  />
);

export const ButtonSpinner = ({ color = "white" }) => (
  <LoadingSpinner 
    size="small" 
    color={color}
    className="mr-2"
  />
);

export const InlineSpinner = ({ size = "small", color = "gray" }) => (
  <LoadingSpinner 
    size={size} 
    color={color}
    className="inline-block"
  />
);

export const OverlayLoader = ({ message = "Please wait..." }) => (
  <LoadingSpinner 
    size="large" 
    color="blue" 
    message={message}
    overlay={true}
  />
);

export const CardLoader = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4">
    <LoadingSpinner size="medium" color="gray" variant="dots" />
    {message && (
      <p className="text-gray-500 text-sm">{message}</p>
    )}
  </div>
);

export const TableLoader = () => (
  <div className="flex items-center justify-center py-8">
    <LoadingSpinner size="medium" color="blue" variant="bars" />
  </div>
);

export const ImageLoader = () => (
  <div className="flex items-center justify-center bg-gray-100 rounded">
    <LoadingSpinner size="medium" color="gray" variant="pulse" />
  </div>
);

// Loading skeleton components
export const SkeletonLoader = ({ lines = 3, className = "" }) => (
  <div className={`animate-pulse ${className}`}>
    {[...Array(lines)].map((_, i) => (
      <div
        key={i}
        className={`bg-gray-200 rounded h-4 mb-2 ${
          i === lines - 1 ? 'w-3/4' : 'w-full'
        }`}
      />
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="bg-gray-200 rounded h-48 mb-4" />
    <div className="bg-gray-200 rounded h-4 mb-2" />
    <div className="bg-gray-200 rounded h-4 w-3/4 mb-4" />
    <div className="flex justify-between items-center">
      <div className="bg-gray-200 rounded h-6 w-1/4" />
      <div className="bg-gray-200 rounded h-8 w-1/3" />
    </div>
  </div>
);

export default LoadingSpinner;