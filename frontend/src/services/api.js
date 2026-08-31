// Central API helper for the frontend so login, branches, customers, and loans all use the same backend endpoint pattern.
// In Codespaces, dynamically construct the backend URL based on the current origin.
const getAPIBase = () => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.dev')) {
    // Codespaces: replace the port in the current URL with 5000
    return `${window.location.protocol}//${window.location.hostname.split('-').slice(0, -1).join('-')}-5000.${window.location.hostname.split('.').slice(1).join('.')}/api`;
  }
  // Local development: use localhost
  return 'http://localhost:5000/api';
};

const API_BASE = getAPIBase();

export async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}
