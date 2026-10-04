/**
 * P_Dot Client-side API Service Wrapper
 * Manages Fetch API requests, JWT headers, response validation, and error messaging
 */
const API_BASE = '/api';

const API = {
  getToken() {
    return localStorage.getItem('pdot_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('pdot_token', token);
    } else {
      localStorage.removeItem('pdot_token');
    }
  },

  getUser() {
    try {
      const u = localStorage.getItem('pdot_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('pdot_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('pdot_user');
    }
  },

  clearAuth() {
    localStorage.removeItem('pdot_token');
    localStorage.removeItem('pdot_user');
  },

  async request(endpoint, options = {}) {
    const headers = {
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // If body is NOT FormData, default to JSON
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await response.json().catch(() => ({
        success: false,
        message: 'Invalid response from server'
      }));

      if (!response.ok) {
        // If 401 Unauthorized, redirect to login unless on public page
        if (response.status === 401 && !window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
          this.clearAuth();
          window.location.href = '/login.html?expired=1';
        }
        throw new Error(data.message || data.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error.message);
      throw error;
    }
  },

  // Helper methods
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  },

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};
