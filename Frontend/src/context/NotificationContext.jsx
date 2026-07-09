import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading'
};

// Notification positions
export const NOTIFICATION_POSITIONS = {
  TOP_RIGHT: 'top-right',
  TOP_LEFT: 'top-left',
  TOP_CENTER: 'top-center',
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_CENTER: 'bottom-center'
};

// Initial state
const initialState = {
  notifications: [],
  position: NOTIFICATION_POSITIONS.TOP_RIGHT,
  maxNotifications: 3, // ✅ Reduced from 5 to 3
  defaultDuration: 4000, // ✅ Reduced from 5000 to 4000ms
  globalSettings: {
    enableSound: false,
    enableAnimation: true,
    enablePersistence: false // ✅ Changed to false to prevent stuck notifications
  }
};

// Action types
const NOTIFICATION_ACTIONS = {
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  UPDATE_NOTIFICATION: 'UPDATE_NOTIFICATION',
  CLEAR_ALL_NOTIFICATIONS: 'CLEAR_ALL_NOTIFICATIONS',
  SET_POSITION: 'SET_POSITION',
  SET_MAX_NOTIFICATIONS: 'SET_MAX_NOTIFICATIONS',
  SET_DEFAULT_DURATION: 'SET_DEFAULT_DURATION',
  UPDATE_GLOBAL_SETTINGS: 'UPDATE_GLOBAL_SETTINGS',
  MARK_AS_READ: 'MARK_AS_READ',
  MARK_ALL_AS_READ: 'MARK_ALL_AS_READ',
  CLEANUP_OLD_NOTIFICATIONS: 'CLEANUP_OLD_NOTIFICATIONS' // ✅ New action for cleanup
};

// Helper function to generate unique IDs
const generateId = () => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

// ✅ Helper function to check if notification is expired
const isNotificationExpired = (notification, maxAge = 30000) => { // 30 seconds max age
  return Date.now() - notification.timestamp > maxAge;
};

// Reducer
const notificationReducer = (state, action) => {
  switch (action.type) {
    case NOTIFICATION_ACTIONS.ADD_NOTIFICATION: {
      const newNotification = {
        id: generateId(),
        timestamp: Date.now(),
        read: false,
        ...action.payload
      };

      let notifications = [newNotification, ...state.notifications];

      // Limit the number of notifications
      if (notifications.length > state.maxNotifications) {
        notifications = notifications.slice(0, state.maxNotifications);
      }

      return {
        ...state,
        notifications
      };
    }

    case NOTIFICATION_ACTIONS.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload
        )
      };

    case NOTIFICATION_ACTIONS.UPDATE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload.id
            ? { ...notification, ...action.payload.updates }
            : notification
        )
      };

    case NOTIFICATION_ACTIONS.CLEAR_ALL_NOTIFICATIONS:
      return {
        ...state,
        notifications: []
      };

    // ✅ New cleanup action
    case NOTIFICATION_ACTIONS.CLEANUP_OLD_NOTIFICATIONS:
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => !isNotificationExpired(notification) || notification.persistent
        )
      };

    case NOTIFICATION_ACTIONS.SET_POSITION:
      return {
        ...state,
        position: action.payload
      };

    case NOTIFICATION_ACTIONS.SET_MAX_NOTIFICATIONS:
      return {
        ...state,
        maxNotifications: action.payload
      };

    case NOTIFICATION_ACTIONS.SET_DEFAULT_DURATION:
      return {
        ...state,
        defaultDuration: action.payload
      };

    case NOTIFICATION_ACTIONS.UPDATE_GLOBAL_SETTINGS:
      return {
        ...state,
        globalSettings: {
          ...state.globalSettings,
          ...action.payload
        }
      };

    case NOTIFICATION_ACTIONS.MARK_AS_READ:
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        )
      };

    case NOTIFICATION_ACTIONS.MARK_ALL_AS_READ:
      return {
        ...state,
        notifications: state.notifications.map(notification => ({
          ...notification,
          read: true
        }))
      };

    default:
      return state;
  }
};

// Create context
const NotificationContext = createContext();

// Notification Provider Component
export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  
  // ✅ Keep track of timeouts to clean them up properly
  const timeoutsRef = useRef(new Map());

  // ✅ Cleanup function to remove expired notifications
  const cleanupOldNotifications = useCallback(() => {
    dispatch({ type: NOTIFICATION_ACTIONS.CLEANUP_OLD_NOTIFICATIONS });
  }, []);

  // ✅ Auto-cleanup effect - runs every 10 seconds
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanupOldNotifications();
    }, 10000); // Clean up every 10 seconds

    return () => clearInterval(cleanupInterval);
  }, [cleanupOldNotifications]);

  // ✅ Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts when component unmounts
      timeoutsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      timeoutsRef.current.clear();
    };
  }, []);

  // Add notification
  const addNotification = useCallback((notification) => {
    const {
      type = NOTIFICATION_TYPES.INFO,
      title,
      message,
      duration = state.defaultDuration,
      persistent = false, // ✅ Default to false instead of checking type
      action = null,
      data = null
    } = notification;

    const notificationId = generateId();

    // ✅ Override persistent for certain types but with shorter durations
    let actualDuration = duration;
    let actualPersistent = persistent;

    if (type === NOTIFICATION_TYPES.ERROR) {
      actualDuration = 8000; // 8 seconds for errors instead of persistent
      actualPersistent = false;
    } else if (type === NOTIFICATION_TYPES.LOADING) {
      actualDuration = 15000; // 15 seconds max for loading
      actualPersistent = false;
    }

    dispatch({
      type: NOTIFICATION_ACTIONS.ADD_NOTIFICATION,
      payload: {
        id: notificationId,
        type,
        title,
        message,
        duration: actualDuration,
        persistent: actualPersistent,
        action,
        data
      }
    });

    // Auto-remove notification after duration (unless persistent)
    if (!actualPersistent && actualDuration > 0) {
      const timeoutId = setTimeout(() => {
        removeNotification(notificationId);
        timeoutsRef.current.delete(notificationId);
      }, actualDuration);

      // Store timeout reference for cleanup
      timeoutsRef.current.set(notificationId, timeoutId);
    }

    return notificationId;
  }, [state.defaultDuration]);

  // Remove notification
  const removeNotification = useCallback((id) => {
    // Clear timeout if it exists
    if (timeoutsRef.current.has(id)) {
      clearTimeout(timeoutsRef.current.get(id));
      timeoutsRef.current.delete(id);
    }

    dispatch({
      type: NOTIFICATION_ACTIONS.REMOVE_NOTIFICATION,
      payload: id
    });
  }, []);

  // Update notification
  const updateNotification = useCallback((id, updates) => {
    dispatch({
      type: NOTIFICATION_ACTIONS.UPDATE_NOTIFICATION,
      payload: { id, updates }
    });
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    timeoutsRef.current.clear();

    dispatch({ type: NOTIFICATION_ACTIONS.CLEAR_ALL_NOTIFICATIONS });
  }, []);

  // ✅ Emergency cleanup function - can be called manually
  const forceCleanup = useCallback(() => {
    console.log('🧹 Force cleaning notifications...');
    clearAllNotifications();
  }, [clearAllNotifications]);

  // Convenience methods for different notification types
  const showSuccess = useCallback((title, message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.SUCCESS,
      title,
      message,
      duration: 3000, // ✅ Shorter duration for success messages
      ...options
    });
  }, [addNotification]);

  const showError = useCallback((title, message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.ERROR,
      title,
      message,
      persistent: false, // ✅ Changed to false - errors will auto-dismiss after 8 seconds
      ...options
    });
  }, [addNotification]);

  const showWarning = useCallback((title, message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.WARNING,
      title,
      message,
      duration: 5000, // ✅ 5 seconds for warnings
      ...options
    });
  }, [addNotification]);

  const showInfo = useCallback((title, message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.INFO,
      title,
      message,
      duration: 3000, // ✅ 3 seconds for info messages
      ...options
    });
  }, [addNotification]);

  const showLoading = useCallback((title, message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.LOADING,
      title,
      message,
      persistent: false, // ✅ Changed to false - loading will auto-dismiss after 15 seconds
      ...options
    });
  }, [addNotification]);

  // Mark notification as read
  const markAsRead = useCallback((id) => {
    dispatch({
      type: NOTIFICATION_ACTIONS.MARK_AS_READ,
      payload: id
    });
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    dispatch({ type: NOTIFICATION_ACTIONS.MARK_ALL_AS_READ });
  }, []);

  // Set notification position
  const setPosition = useCallback((position) => {
    if (Object.values(NOTIFICATION_POSITIONS).includes(position)) {
      dispatch({
        type: NOTIFICATION_ACTIONS.SET_POSITION,
        payload: position
      });
    }
  }, []);

  // Set max notifications
  const setMaxNotifications = useCallback((max) => {
    if (max > 0) {
      dispatch({
        type: NOTIFICATION_ACTIONS.SET_MAX_NOTIFICATIONS,
        payload: max
      });
    }
  }, []);

  // Set default duration
  const setDefaultDuration = useCallback((duration) => {
    if (duration >= 0) {
      dispatch({
        type: NOTIFICATION_ACTIONS.SET_DEFAULT_DURATION,
        payload: duration
      });
    }
  }, []);

  // Update global settings
  const updateGlobalSettings = useCallback((settings) => {
    dispatch({
      type: NOTIFICATION_ACTIONS.UPDATE_GLOBAL_SETTINGS,
      payload: settings
    });
  }, []);

  // Get unread count
  const getUnreadCount = useCallback(() => {
    return state.notifications.filter(notification => !notification.read).length;
  }, [state.notifications]);

  // Get notifications by type
  const getNotificationsByType = useCallback((type) => {
    return state.notifications.filter(notification => notification.type === type);
  }, [state.notifications]);

  // Check if there are any notifications of a specific type
  const hasNotificationType = useCallback((type) => {
    return state.notifications.some(notification => notification.type === type);
  }, [state.notifications]);

  // Batch operations
  const batchOperations = {
    addMultiple: useCallback((notifications) => {
      notifications.forEach(notification => addNotification(notification));
    }, [addNotification]),

    removeMultiple: useCallback((ids) => {
      ids.forEach(id => removeNotification(id));
    }, [removeNotification]),

    removeByType: useCallback((type) => {
      const notificationsToRemove = state.notifications
        .filter(notification => notification.type === type)
        .map(notification => notification.id);
      
      notificationsToRemove.forEach(id => removeNotification(id));
    }, [state.notifications, removeNotification])
  };

  // Advanced notification patterns
  const patterns = {
    // Show a loading notification and update it when done
    showLoadingWithUpdate: useCallback(async (loadingTitle, loadingMessage, asyncOperation) => {
      const loadingId = showLoading(loadingTitle, loadingMessage);
      
      try {
        const result = await asyncOperation();
        removeNotification(loadingId);
        showSuccess('Success', 'Operation completed successfully');
        return { success: true, result };
      } catch (error) {
        removeNotification(loadingId);
        showError('Error', error.message || 'Operation failed');
        return { success: false, error };
      }
    }, [showLoading, removeNotification, showSuccess, showError]),

    // Show a notification with undo functionality
    showWithUndo: useCallback((title, message, undoAction, options = {}) => {
      return addNotification({
        title,
        message,
        action: {
          label: 'Undo',
          handler: undoAction
        },
        duration: 8000, // ✅ Reduced from 10000 to 8000ms
        ...options
      });
    }, [addNotification]),

    // Show a notification that requires user confirmation
    showConfirmation: useCallback((title, message, onConfirm, onCancel) => {
      return addNotification({
        type: NOTIFICATION_TYPES.WARNING,
        title,
        message,
        persistent: false, // ✅ Changed to false with longer duration
        duration: 15000, // ✅ 15 seconds for confirmation
        action: {
          primary: {
            label: 'Confirm',
            handler: onConfirm
          },
          secondary: {
            label: 'Cancel',
            handler: onCancel
          }
        }
      });
    }, [addNotification])
  };

  // ✅ Debug function to check notification state
  const debugNotifications = useCallback(() => {
    console.log('🔍 Current notifications:', state.notifications);
    console.log('🔍 Active timeouts:', Array.from(timeoutsRef.current.keys()));
    return {
      notifications: state.notifications,
      activeTimeouts: Array.from(timeoutsRef.current.keys()),
      expiredNotifications: state.notifications.filter(n => isNotificationExpired(n))
    };
  }, [state.notifications]);

  const value = {
    // State
    notifications: state.notifications,
    position: state.position,
    maxNotifications: state.maxNotifications,
    defaultDuration: state.defaultDuration,
    globalSettings: state.globalSettings,

    // Basic actions
    addNotification,
    removeNotification,
    updateNotification,
    clearAllNotifications,

    // Convenience methods
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,

    // Read status
    markAsRead,
    markAllAsRead,
    getUnreadCount,

    // Settings
    setPosition,
    setMaxNotifications,
    setDefaultDuration,
    updateGlobalSettings,

    // Utility methods
    getNotificationsByType,
    hasNotificationType,

    // Batch operations
    batchOperations,

    // Advanced patterns
    patterns,

    // ✅ Cleanup functions
    forceCleanup,
    cleanupOldNotifications,
    debugNotifications,

    // Constants
    NOTIFICATION_TYPES,
    NOTIFICATION_POSITIONS
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;