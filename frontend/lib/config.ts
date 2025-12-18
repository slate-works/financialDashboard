// API URL Configuration
// Local dev: Uses localhost:3001 (your backend dev server)
// Docker production: Uses server hostname with port 5000
export const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return '' // Server-side rendering
  }
  
  // If we're on localhost, use the local dev backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001'
  }
  
  // Otherwise, we're in production (Docker), use port 5000
  return `${window.location.protocol}//${window.location.hostname}:5000`
}

export const API_URL = getApiUrl()

