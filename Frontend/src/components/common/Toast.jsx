import React, { useEffect, useState } from 'react';
import { useNotification, NOTIFICATION_TYPES, NOTIFICATION_POSITIONS } from '../../context/NotificationContext';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

const Toast = () => {
  const { notifications, removeNotification, markAsRead, position } = useNotification();
  const [animatingOut, setAnimatingOut] = useState(new Set());

  // Get position classes
  const getPositionClasses = () => {
    switch (position) {
      case NOTIFICATION_POSITIONS.TOP_LEFT:
        return 'top-4 left-4';
      case NOTIFICATION_POSITIONS.TOP_CENTER:
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case NOTIFICATION_POSITIONS.TOP_RIGHT:
        return 'top-4 right-4';
      case NOTIFICATION_POSITIONS.BOTTOM_LEFT:
        return 'bottom-4 left-4';
      case NOTIFICATION_POSITIONS.BOTTOM_CENTER:
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case NOTIFICATION_POSITIONS.BOTTOM_RIGHT:
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  // Get animation classes based on position
  const getAnimationClasses = (isAnimatingOut = false) => {
    const isTop = position.includes('TOP');
    const isLeft = position.includes('LEFT');
    const isCenter = position.includes('CENTER');

    if (isAnimatingOut) {
      if (isCenter) {
        return isTop ? 'animate-slide-out-up' : 'animate-slide-out-down';
      }
      return isLeft ? 'animate-slide-out-left' : 'animate-slide-out-right';
    }

    if (isCenter) {
      return isTop ? 'animate-slide-in-down' : 'animate-slide-in-up';
    }
    return isLeft ? 'animate-slide-in-left' : 'animate-slide-in-right';
  };

  // Handle notification removal with animation
  const handleRemove = (id) => {
    setAnimatingOut(prev => new Set(prev).add(id));
    setTimeout(() => {
      removeNotification(id);
      setAnimatingOut(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }, 300);
  };

  // Mark as read when notification is displayed
  useEffect(() => {
    notifications.forEach(notification => {
      if (!notification.read) {
        setTimeout(() => markAsRead(notification.id), 1000);
      }
    });
  }, [notifications, markAsRead]);

  // Get icon and styles for notification type
  const getNotificationStyles = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS:
        return {
          icon: CheckCircleIcon,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          titleColor: 'text-green-800',
          textColor: 'text-green-700'
        };
      case NOTIFICATION_TYPES.ERROR:
        return {
          icon: XCircleIcon,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          titleColor: 'text-red-800',
          textColor: 'text-red-700'
        };
      case NOTIFICATION_TYPES.WARNING:
        return {
          icon: ExclamationTriangleIcon,
          iconColor: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          titleColor: 'text-yellow-800',
          textColor: 'text-yellow-700'
        };
      case NOTIFICATION_TYPES.INFO:
        return {
          icon: InformationCircleIcon,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          titleColor: 'text-blue-800',
          textColor: 'text-blue-700'
        };
      case NOTIFICATION_TYPES.LOADING:
        return {
          icon: null,
          iconColor: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          titleColor: 'text-gray-800',
          textColor: 'text-gray-700'
        };
      default:
        return {
          icon: InformationCircleIcon,
          iconColor: 'text-gray-500',
          bgColor: 'bg-white',
          borderColor: 'border-gray-200',
          titleColor: 'text-gray-800',
          textColor: 'text-gray-600'
        };
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={`fixed z-50 max-w-sm w-full space-y-4 pointer-events-none ${getPositionClasses()}`}
        aria-live="polite"
        aria-label="Notifications"
      >
        {notifications.map((notification) => {
          const styles = getNotificationStyles(notification.type);
          const Icon = styles.icon;
          const isAnimatingOut = animatingOut.has(notification.id);

          return (
            <div
              key={notification.id}
              className={`
                pointer-events-auto w-full max-w-sm bg-white rounded-lg shadow-lg border
                ${styles.borderColor} ${getAnimationClasses(isAnimatingOut)}
                transition-all duration-300 ease-in-out
              `}
              role="alert"
            >
              <div className="p-4">
                <div className="flex items-start">
                  {/* Icon or Loading Spinner */}
                  <div className="flex-shrink-0">
                    {notification.type === NOTIFICATION_TYPES.LOADING ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                    ) : Icon ? (
                      <Icon className={`h-5 w-5 ${styles.iconColor}`} />
                    ) : null}
                  </div>

                  {/* Content */}
                  <div className="ml-3 w-0 flex-1">
                    {notification.title && (
                      <p className={`text-sm font-medium ${styles.titleColor}`}>
                        {notification.title}
                      </p>
                    )}
                    {notification.message && (
                      <p className={`text-sm ${styles.textColor} ${notification.title ? 'mt-1' : ''}`}>
                        {notification.message}
                      </p>
                    )}

                    {/* Action Buttons */}
                    {notification.action && (
                      <div className="mt-3 flex space-x-3">
                        {/* Primary Action */}
                        {notification.action.primary && (
                          <button
                            onClick={() => {
                              notification.action.primary.handler();
                              handleRemove(notification.id);
                            }}
                            className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
                          >
                            {notification.action.primary.label}
                          </button>
                        )}

                        {/* Secondary Action */}
                        {notification.action.secondary && (
                          <button
                            onClick={() => {
                              notification.action.secondary.handler();
                              handleRemove(notification.id);
                            }}
                            className="text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none focus:underline"
                          >
                            {notification.action.secondary.label}
                          </button>
                        )}

                        {/* Single Action (for simple actions) */}
                        {notification.action.label && notification.action.handler && (
                          <button
                            onClick={() => {
                              notification.action.handler();
                              handleRemove(notification.id);
                            }}
                            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
                          >
                            {notification.action.label}
                            {notification.action.external && (
                              <ArrowTopRightOnSquareIcon className="ml-1 h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="mt-2 text-xs text-gray-500">
                      {formatTimestamp(notification.timestamp)}
                    </div>
                  </div>

                  {/* Close Button */}
                  {!notification.persistent && (
                    <div className="ml-4 flex-shrink-0 flex">
                      <button
                        onClick={() => handleRemove(notification.id)}
                        className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      >
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress Bar for timed notifications */}
                {notification.duration > 0 && !notification.persistent && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full transition-all ease-linear ${
                          notification.type === NOTIFICATION_TYPES.SUCCESS ? 'bg-green-500' :
                          notification.type === NOTIFICATION_TYPES.ERROR ? 'bg-red-500' :
                          notification.type === NOTIFICATION_TYPES.WARNING ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}
                        style={{
                          width: '100%',
                          animation: `shrink ${notification.duration}ms linear`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom CSS for animations */}
      <style jsx="true">{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }

        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slide-out-right {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        @keyframes slide-in-left {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slide-out-left {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(-100%);
            opacity: 0;
          }
        }

        @keyframes slide-in-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slide-out-up {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(-100%);
            opacity: 0;
          }
        }

        @keyframes slide-in-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slide-out-down {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(100%);
            opacity: 0;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }

        .animate-slide-out-right {
          animation: slide-out-right 0.3s ease-in;
        }

        .animate-slide-in-left {
          animation: slide-in-left 0.3s ease-out;
        }

        .animate-slide-out-left {
          animation: slide-out-left 0.3s ease-in;
        }

        .animate-slide-in-down {
          animation: slide-in-down 0.3s ease-out;
        }

        .animate-slide-out-up {
          animation: slide-out-up 0.3s ease-in;
        }

        .animate-slide-in-up {
          animation: slide-in-up 0.3s ease-out;
        }

        .animate-slide-out-down {
          animation: slide-out-down 0.3s ease-in;
        }
      `}</style>
    </>
  );
};

// Utility components for common toast patterns
export const SuccessToast = ({ title, message, onClose }) => {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
      <div className="flex items-start">
        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
        <div className="ml-3 flex-1">
          {title && <p className="text-sm font-medium text-green-800">{title}</p>}
          {message && <p className="text-sm text-green-700 mt-1">{message}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-4 text-green-400 hover:text-green-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const ErrorToast = ({ title, message, onClose }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
      <div className="flex items-start">
        <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
        <div className="ml-3 flex-1">
          {title && <p className="text-sm font-medium text-red-800">{title}</p>}
          {message && <p className="text-sm text-red-700 mt-1">{message}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-4 text-red-400 hover:text-red-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const WarningToast = ({ title, message, onClose }) => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
      <div className="flex items-start">
        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0" />
        <div className="ml-3 flex-1">
          {title && <p className="text-sm font-medium text-yellow-800">{title}</p>}
          {message && <p className="text-sm text-yellow-700 mt-1">{message}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-4 text-yellow-400 hover:text-yellow-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const InfoToast = ({ title, message, onClose }) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
      <div className="flex items-start">
        <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
        <div className="ml-3 flex-1">
          {title && <p className="text-sm font-medium text-blue-800">{title}</p>}
          {message && <p className="text-sm text-blue-700 mt-1">{message}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-4 text-blue-400 hover:text-blue-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

// Toast container for custom implementations
export const ToastContainer = ({ children, position = 'top-right' }) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <div className={`fixed z-50 max-w-sm w-full space-y-4 ${getPositionClasses()}`}>
      {children}
    </div>
  );
};

export default Toast;