/**
 * API Configuration
 * Automatically detects the correct backend URL based on current environment
 */

const getBackendURL = () => {
  // Always use REACT_APP_BACKEND_URL if it's set
  const envURL = process.env.REACT_APP_BACKEND_URL;
  
  if (envURL) {
    return envURL;
  }
  
  // Fallback to current origin if no env variable is set
  return window.location.origin;
};

export const API_URL = getBackendURL();

console.log('[API Config] Using backend URL:', API_URL);

export default API_URL;
