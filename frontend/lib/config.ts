// API URL Configuration
// Local dev: Uses localhost:3001 (your backend dev server)
// Local network dev: Uses <local-ip>:3001 (for mobile testing)
// Docker production: Uses server hostname with port 5000
export const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return '' // Server-side rendering
  }
  
  const hostname = window.location.hostname
  
  // If we're on localhost, use the local dev backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001'
  }
  
  // If we're on a local network IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x), use dev port 3001
  if (
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    return `http://${hostname}:3001`
  }
  
  // Otherwise, we're in production (Docker), use port 5000
  return `${window.location.protocol}//${window.location.hostname}:5000`
}

export const API_URL = getApiUrl()

