// Centralized API base URL for frontend
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// Helper to prepend base URL to endpoint
export function apiUrl(path) {
  // If path already starts with http(s), return as is
  if (/^https?:\/\//.test(path)) return path;
  // Ensure no double slashes
  return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
}
