// =============== src/services/googleAuth.js (React 18 Compatible) ===============
import { authService } from './Auth';

class GoogleAuthService {
  constructor() {
    this.googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    this.isInitialized = false;
  }

  // Initialize Google Identity Services (GSI)
  async initialize() {
    if (this.isInitialized) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // Load Google Identity Services script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        try {
          // Initialize Google Identity Services
          window.google.accounts.id.initialize({
            client_id: this.googleClientId,
            callback: this.handleCredentialResponse.bind(this),
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          this.isInitialized = true;
          resolve();
        } catch (error) {
          console.error('Error initializing Google Identity Services:', error);
          reject(error);
        }
      };
      script.onerror = () => {
        const error = new Error('Failed to load Google Identity Services script');
        console.error(error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }

  // Handle the credential response from Google
  async handleCredentialResponse(response) {
    try {
      const credential = response.credential;
      
      // Send credential to backend
      const result = await authService.googleAuth(credential);
      
      if (result.success) {
        // Store user data and token
        localStorage.setItem('token', result.data.access_token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        
        // Dispatch custom event for auth context to pick up
        window.dispatchEvent(new CustomEvent('googleLoginSuccess', {
          detail: {
            user: result.data.user,
            token: result.data.access_token
          }
        }));
        
        return {
          success: true,
          user: result.data.user,
          token: result.data.access_token
        };
      } else {
        throw new Error(result.error || 'Google authentication failed');
      }
    } catch (error) {
      console.error('Google credential response error:', error);
      
      // Dispatch error event
      window.dispatchEvent(new CustomEvent('googleLoginError', {
        detail: { error: error.message }
      }));
      
      return {
        success: false,
        error: error.message || 'Google authentication failed'
      };
    }
  }

  // Prompt for Google sign-in
  async signIn() {
    try {
      await this.initialize();
      
      return new Promise((resolve, reject) => {
        // Set up event listeners
        const handleSuccess = (event) => {
          window.removeEventListener('googleLoginSuccess', handleSuccess);
          window.removeEventListener('googleLoginError', handleError);
          resolve(event.detail);
        };
        
        const handleError = (event) => {
          window.removeEventListener('googleLoginSuccess', handleSuccess);
          window.removeEventListener('googleLoginError', handleError);
          reject(new Error(event.detail.error));
        };
        
        window.addEventListener('googleLoginSuccess', handleSuccess);
        window.addEventListener('googleLoginError', handleError);
        
        // Prompt for sign-in
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // If prompt is not displayed, show popup
            this.showPopup().then(resolve).catch(reject);
          }
        });
      });
    } catch (error) {
      console.error('Google sign in error:', error);
      return {
        success: false,
        error: error.message || 'Google authentication failed'
      };
    }
  }

  // Show Google One Tap popup
  async showPopup() {
    try {
      await this.initialize();
      
      return new Promise((resolve, reject) => {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            reject(new Error('Google sign-in prompt was not displayed'));
          } else if (notification.isSkippedMoment()) {
            reject(new Error('Google sign-in was skipped'));
          }
        });
        
        // Set a timeout in case the prompt doesn't work
        setTimeout(() => {
          reject(new Error('Google sign-in timeout'));
        }, 10000);
      });
    } catch (error) {
      console.error('Google popup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Render Google Sign-In button
  renderButton(elementId, options = {}) {
    const defaultOptions = {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: '100%'
    };

    const buttonOptions = { ...defaultOptions, ...options };

    this.initialize().then(() => {
      window.google.accounts.id.renderButton(
        document.getElementById(elementId),
        buttonOptions
      );
    }).catch(error => {
      console.error('Error rendering Google button:', error);
    });
  }

  // Sign out
  async signOut() {
    try {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Google Identity Services doesn't have a traditional sign-out
      // The sign-out is handled by clearing local data
      
      return { success: true };
    } catch (error) {
      console.error('Google sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if Google services are available
  isAvailable() {
    return typeof window !== 'undefined' && 
           window.google && 
           window.google.accounts && 
           window.google.accounts.id;
  }

  // Disable auto-select for the session
  disableAutoSelect() {
    if (this.isAvailable()) {
      window.google.accounts.id.disableAutoSelect();
    }
  }
}

// Create and export singleton instance
export const googleAuthService = new GoogleAuthService();
export default googleAuthService;