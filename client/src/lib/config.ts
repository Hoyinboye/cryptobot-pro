// API Configuration for production deployment
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || (API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://'));

// Helper to get full API URL
export function getApiUrl(endpoint: string): string {
  // In development, use relative URLs (Vite proxy handles it)
  // In production, use full URL from environment variable
  if (import.meta.env.DEV) {
    return endpoint;
  }
  return `${API_BASE_URL}${endpoint}`;
}