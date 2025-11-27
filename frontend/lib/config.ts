// For Docker: use window.location.origin but with port 5000
// For local dev: use localhost:3001
export const API_URL = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

