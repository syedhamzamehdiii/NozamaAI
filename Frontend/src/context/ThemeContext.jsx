import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Theme configurations
const themes = {
  light: {
    name: 'light',
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#ffffff',
      surface: '#f8fafc',
      text: {
        primary: '#1f2937',
        secondary: '#6b7280',
        disabled: '#9ca3af'
      },
      border: '#e5e7eb'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem'
    },
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      xxl: '1536px'
    }
  },
  dark: {
    name: 'dark',
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#111827',
      surface: '#1f2937',
      text: {
        primary: '#f9fafb',
        secondary: '#d1d5db',
        disabled: '#6b7280'
      },
      border: '#374151'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem'
    },
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      xxl: '1536px'
    }
  }
};

// Initial state
const initialState = {
  currentTheme: 'light',
  theme: themes.light,
  fontSize: 'medium',
  language: 'en',
  animations: true,
  reducedMotion: false,
  highContrast: false,
  sidebarCollapsed: false,
  compactMode: false,
  preferences: {
    showTutorials: true,
    autoSave: true,
    notifications: true,
    soundEffects: false
  }
};

// Action types
const THEME_ACTIONS = {
  SET_THEME: 'SET_THEME',
  SET_FONT_SIZE: 'SET_FONT_SIZE',
  SET_LANGUAGE: 'SET_LANGUAGE',
  TOGGLE_ANIMATIONS: 'TOGGLE_ANIMATIONS',
  TOGGLE_REDUCED_MOTION: 'TOGGLE_REDUCED_MOTION',
  TOGGLE_HIGH_CONTRAST: 'TOGGLE_HIGH_CONTRAST',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  TOGGLE_COMPACT_MODE: 'TOGGLE_COMPACT_MODE',
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  LOAD_PREFERENCES: 'LOAD_PREFERENCES',
  RESET_PREFERENCES: 'RESET_PREFERENCES'
};

// Reducer
const themeReducer = (state, action) => {
  switch (action.type) {
    case THEME_ACTIONS.SET_THEME:
      return {
        ...state,
        currentTheme: action.payload,
        theme: themes[action.payload] || themes.light
      };

    case THEME_ACTIONS.SET_FONT_SIZE:
      return {
        ...state,
        fontSize: action.payload
      };

    case THEME_ACTIONS.SET_LANGUAGE:
      return {
        ...state,
        language: action.payload
      };

    case THEME_ACTIONS.TOGGLE_ANIMATIONS:
      return {
        ...state,
        animations: !state.animations
      };

    case THEME_ACTIONS.TOGGLE_REDUCED_MOTION:
      return {
        ...state,
        reducedMotion: !state.reducedMotion
      };

    case THEME_ACTIONS.TOGGLE_HIGH_CONTRAST:
      return {
        ...state,
        highContrast: !state.highContrast
      };

    case THEME_ACTIONS.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed
      };

    case THEME_ACTIONS.TOGGLE_COMPACT_MODE:
      return {
        ...state,
        compactMode: !state.compactMode
      };

    case THEME_ACTIONS.UPDATE_PREFERENCES:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload
        }
      };

    case THEME_ACTIONS.LOAD_PREFERENCES:
      return {
        ...state,
        ...action.payload
      };

    case THEME_ACTIONS.RESET_PREFERENCES:
      return {
        ...initialState
      };

    default:
      return state;
  }
};

// Create context
const ThemeContext = createContext();

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  // Load preferences from localStorage on app start
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem('themePreferences');
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        dispatch({
          type: THEME_ACTIONS.LOAD_PREFERENCES,
          payload: {
            ...preferences,
            theme: themes[preferences.currentTheme] || themes.light
          }
        });
      }
    } catch (error) {
      console.error('Error loading theme preferences:', error);
    }
  }, []);

  // Save preferences to localStorage whenever state changes
  useEffect(() => {
    try {
      const preferencesToSave = {
        currentTheme: state.currentTheme,
        fontSize: state.fontSize,
        language: state.language,
        animations: state.animations,
        reducedMotion: state.reducedMotion,
        highContrast: state.highContrast,
        sidebarCollapsed: state.sidebarCollapsed,
        compactMode: state.compactMode,
        preferences: state.preferences
      };
      localStorage.setItem('themePreferences', JSON.stringify(preferencesToSave));
    } catch (error) {
      console.error('Error saving theme preferences:', error);
    }
  }, [state]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    Object.entries(state.theme.colors).forEach(([key, value]) => {
      if (typeof value === 'object') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          root.style.setProperty(`--color-${key}-${subKey}`, subValue);
        });
      } else {
        root.style.setProperty(`--color-${key}`, value);
      }
    });

    // Apply theme class to body
    document.body.className = document.body.className
      .replace(/theme-\w+/g, '')
      .trim();
    document.body.classList.add(`theme-${state.currentTheme}`);

    // Apply font size
    root.style.setProperty('--font-size-base', getFontSizeValue(state.fontSize));

    // Apply accessibility preferences
    if (state.reducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms');
      root.style.setProperty('--transition-duration', '0.01ms');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }

    if (state.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }

    if (state.compactMode) {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
  }, [state.currentTheme, state.theme, state.fontSize, state.reducedMotion, state.highContrast, state.compactMode]);

  // Helper function to get font size value
  const getFontSizeValue = (size) => {
    switch (size) {
      case 'small': return '14px';
      case 'medium': return '16px';
      case 'large': return '18px';
      case 'extra-large': return '20px';
      default: return '16px';
    }
  };

  // Set theme
  const setTheme = (themeName) => {
    if (themes[themeName]) {
      dispatch({
        type: THEME_ACTIONS.SET_THEME,
        payload: themeName
      });
    }
  };

  // Toggle theme between light and dark
  const toggleTheme = () => {
    const newTheme = state.currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // Set font size
  const setFontSize = (size) => {
    const validSizes = ['small', 'medium', 'large', 'extra-large'];
    if (validSizes.includes(size)) {
      dispatch({
        type: THEME_ACTIONS.SET_FONT_SIZE,
        payload: size
      });
    }
  };

  // Set language
  const setLanguage = (language) => {
    dispatch({
      type: THEME_ACTIONS.SET_LANGUAGE,
      payload: language
    });
  };

  // Toggle animations
  const toggleAnimations = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_ANIMATIONS });
  };

  // Toggle reduced motion
  const toggleReducedMotion = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_REDUCED_MOTION });
  };

  // Toggle high contrast
  const toggleHighContrast = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_HIGH_CONTRAST });
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_SIDEBAR });
  };

  // Toggle compact mode
  const toggleCompactMode = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_COMPACT_MODE });
  };

  // Update preferences
  const updatePreferences = (newPreferences) => {
    dispatch({
      type: THEME_ACTIONS.UPDATE_PREFERENCES,
      payload: newPreferences
    });
  };

  // Reset to default preferences
  const resetPreferences = () => {
    dispatch({ type: THEME_ACTIONS.RESET_PREFERENCES });
  };

  // Get CSS custom property value
  const getCSSVariable = (property) => {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${property}`);
  };

  // Check if dark mode is active
  const isDarkMode = () => {
    return state.currentTheme === 'dark';
  };

  // Get responsive breakpoint
  const getBreakpoint = (size) => {
    return state.theme.breakpoints[size];
  };

  // Get color value
  const getColor = (colorPath) => {
    const keys = colorPath.split('.');
    let color = state.theme.colors;
    
    for (const key of keys) {
      color = color[key];
      if (color === undefined) return null;
    }
    
    return color;
  };

  // Get spacing value
  const getSpacing = (size) => {
    return state.theme.spacing[size];
  };

  // Media query helpers
  const mediaQueries = {
    sm: `(min-width: ${state.theme.breakpoints.sm})`,
    md: `(min-width: ${state.theme.breakpoints.md})`,
    lg: `(min-width: ${state.theme.breakpoints.lg})`,
    xl: `(min-width: ${state.theme.breakpoints.xl})`,
    xxl: `(min-width: ${state.theme.breakpoints.xxl})`,
    mobile: `(max-width: ${parseInt(state.theme.breakpoints.md) - 1}px)`,
    tablet: `(min-width: ${state.theme.breakpoints.md}) and (max-width: ${parseInt(state.theme.breakpoints.lg) - 1}px)`,
    desktop: `(min-width: ${state.theme.breakpoints.lg})`
  };

  const value = {
    // State
    currentTheme: state.currentTheme,
    theme: state.theme,
    fontSize: state.fontSize,
    language: state.language,
    animations: state.animations,
    reducedMotion: state.reducedMotion,
    highContrast: state.highContrast,
    sidebarCollapsed: state.sidebarCollapsed,
    compactMode: state.compactMode,
    preferences: state.preferences,

    // Actions
    setTheme,
    toggleTheme,
    setFontSize,
    setLanguage,
    toggleAnimations,
    toggleReducedMotion,
    toggleHighContrast,
    toggleSidebar,
    toggleCompactMode,
    updatePreferences,
    resetPreferences,

    // Utilities
    getCSSVariable,
    isDarkMode,
    getBreakpoint,
    getColor,
    getSpacing,
    mediaQueries,

    // Available themes and options
    availableThemes: Object.keys(themes),
    availableFontSizes: ['small', 'medium', 'large', 'extra-large'],
    availableLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja'] // Add more as needed
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;