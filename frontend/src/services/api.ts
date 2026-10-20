import axios from 'axios';

// Automatically use the device's hostname (e.g. 192.168.1.147 or localhost)
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:5000/api`;
};

export const getBackendHost = () => {
  if (import.meta.env.VITE_API_URL) {
    try {
      const url = new URL(import.meta.env.VITE_API_URL);
      return `${url.protocol}//${url.host}`;
    } catch {
      // fallback
    }
  }
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:5000`;
};

export const getMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const base = getBackendHost();
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${base}${cleanPath}`;
};

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach Owner Brand short-lived verification token if present
  const ownerToken = sessionStorage.getItem('ownerToken');
  if (ownerToken) {
    config.headers['x-owner-token'] = ownerToken;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized, only kick to login if inside protected POS routes
    if (error.response?.status === 401) {
      const isPublicPath =
        window.location.pathname === '/' ||
        window.location.pathname.startsWith('/website');
      const isOwnerBrandVerification = error.config?.url?.includes('/owner-brand');

      if (!isPublicPath && !isOwnerBrandVerification) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
