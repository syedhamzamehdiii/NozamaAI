// =============== src/services/index.js ===============
export { authService } from './Auth';
export { apiService } from './Api';

// Re-export for convenience
export default {
  auth: authService,
  api: apiService
};