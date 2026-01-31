/**
 * API Configuration
 * Automatically detects the correct backend URL based on current environment
 */

const getBackendURL = () => {
  // If REACT_APP_BACKEND_URL is set and not the preview URL, use it (production)
  const envURL = process.env.REACT_APP_BACKEND_URL;
  
  if (envURL && !envURL.includes('.preview.emergentagent.com')) {
    return envURL;
  }
  
  // Otherwise, use current origin (same domain as frontend)
  // This ensures preview and production both work correctly
  return window.location.origin;
};

export const API_URL = getBackendURL();

console.log('[API Config] Using backend URL:', API_URL);

export default API_URL;
