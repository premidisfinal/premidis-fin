/**
 * Utility function to extract error message from API responses
 * Handles both string errors and Pydantic validation error objects
 */
export const getErrorMessage = (error, defaultMessage = 'Une erreur est survenue') => {
  if (!error) return defaultMessage;
  
  const detail = error.response?.data?.detail;
  
  // If detail is a string, return it
  if (typeof detail === 'string') {
    return detail;
  }
  
  // If detail is an array of validation errors (Pydantic)
  if (Array.isArray(detail) && detail.length > 0) {
    // Return the first error message
    return detail[0]?.msg || defaultMessage;
  }
  
  // If detail is an object with a msg field
  if (detail && typeof detail === 'object' && detail.msg) {
    return detail.msg;
  }
  
  // Fallback to error.message or default
  return error.message || defaultMessage;
};

export default getErrorMessage;
