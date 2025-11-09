import axios from "axios";

// Use relative URL to leverage React dev server proxy
const API_URL = "/api/";

// Function to get CSRF token from cookies
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Store CSRF token in memory as backup
let csrfTokenCache = null;

// Function to get CSRF token from cookie or cache
function getCsrfToken() {
  // Try cookie first
  const cookieToken = getCookie('csrftoken');
  if (cookieToken) {
    csrfTokenCache = cookieToken;
    return cookieToken;
  }
  // Fall back to cache
  if (csrfTokenCache) {
    return csrfTokenCache;
  }
  return null;
}

// Create a separate axios instance for CSRF token fetching
const csrfAxios = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken'
});

// Main API instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  },
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken'
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add CSRF token to headers
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    // Add JWT token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Function to fetch CSRF token
export const fetchCsrfToken = async () => {
  try {
    const response = await csrfAxios.get('auth/csrf/');
    const token = response.data.csrfToken;
    
    if (token) {
      csrfTokenCache = token;
      return token;
    }
    
    const cookieToken = getCsrfToken();
    if (cookieToken) {
      csrfTokenCache = cookieToken;
      return cookieToken;
    }
    
    return csrfTokenCache;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
};

// Auth functions
export const login = async (username, password) => {
  try {
    // First, ensure we have a CSRF token
    await fetchCsrfToken();
    
    const response = await api.post('auth/login/', { username, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      // Store user data in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const register = async (userData) => {
  try {
    // First, ensure we have a CSRF token
    await fetchCsrfToken();
    
    const response = await api.post('auth/register/', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      // Store user data in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    // First try to get from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      return { user: JSON.parse(storedUser) };
    }
    
    // If not in localStorage, fetch from server
    const response = await api.get('auth/user/');
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error) {
    // Clear stored data if there's an error
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    throw error;
  }
};

export const logout = async () => {
  try {
    await api.post('auth/logout/');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear all stored auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear CSRF token cache
    csrfTokenCache = null;
  }
};

// Transaction functions
export const getTransactions = async () => {
  try {
    const response = await api.get('transactions/');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addTransaction = async (transactionData) => {
  try {
    const response = await api.post('transactions/', transactionData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateTransaction = async (id, transactionData) => {
  try {
    const response = await api.put(`transactions/${id}/`, transactionData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteTransaction = async (id) => {
  try {
    await api.delete(`transactions/${id}/`);
    return true;
  } catch (error) {
    throw error;
  }
};

export default api;