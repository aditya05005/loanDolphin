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

// Same key AuthContext uses for the logged-in session. Read directly here
// so every apiRequest call automatically identifies the current user —
// call sites no longer need to remember to pass currentUserId/customerUserId
// in the body under whatever key name, which is what caused requests to be
// treated as logged-out even when a user was signed in.
const SESSION_STORAGE_KEY = 'loanDolphinSession';

function getSessionUserId() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY));
    return session?.userid || null;
  } catch {
    return null;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const userid = getSessionUserId();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(userid ? { 'x-user-id': userid } : {}),
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
