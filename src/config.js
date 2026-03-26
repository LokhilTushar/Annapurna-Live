// Configuration file for API endpoints
// For production, the backend URL is explicitly set to the external server
export const config = {
  // Use the backend server directly (no proxy needed in production)
  apiBaseUrl: process.env.VITE_API_BASE_URL || "http://134.209.157.119:8080"
};
