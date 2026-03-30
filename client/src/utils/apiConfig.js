// Centralized API base URL for frontend
// If VITE_API_BASE_URL is not set, it defaults to an empty string, triggering the Vite proxy
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// Helper to determine the socket URL
// In development with Vite proxy, we should use the current origin
// In production, we should use the same base URL as the API
export const SOCKET_URL = API_BASE_URL || window.location.origin;

// Helper to prepend base URL to endpoint
export function apiUrl(path) {
	// If path already starts with http(s), return as is
	if (/^https?:\/\//.test(path)) return path;
	// Ensure no double slashes and correct prefixing
	const cleanBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
	const cleanPath = path.startsWith('/') ? path : '/' + path;
	return `${cleanBase}${cleanPath}`;
}
