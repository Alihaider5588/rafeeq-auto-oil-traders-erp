import axios from 'axios';

const LIVE_BACKEND_HOST = 'https://rafeeq-auto-oil-traders-erp.vercel.app';
const LIVE_BACKEND_URL = `${LIVE_BACKEND_HOST}/api`;

// Automatically use the device's hostname (e.g. 192.168.1.147 or localhost) or cloud backend
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '') {
    return import.meta.env.VITE_API_URL.trim();
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // When running in production on Vercel or custom domain or any HTTPS cloud domain
    if (
      host.includes('rafiquautoandoiltraders.com') ||
      host.includes('rafiqautoandoiltraders.com') ||
      host.includes('rafeeqautoandoiltraders.com') ||
      host.includes('vercel.app') ||
      window.location.protocol === 'https:'
    ) {
      return LIVE_BACKEND_URL;
    }
    return `http://${host}:5000/api`;
  }
  return LIVE_BACKEND_URL;
};

export const getBackendHost = () => {
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '') {
    try {
      const url = new URL(import.meta.env.VITE_API_URL);
      return `${url.protocol}//${url.host}`;
    } catch {
      // fallback
    }
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (
      host.includes('rafiquautoandoiltraders.com') ||
      host.includes('rafiqautoandoiltraders.com') ||
      host.includes('rafeeqautoandoiltraders.com') ||
      host.includes('vercel.app') ||
      window.location.protocol === 'https:'
    ) {
      return LIVE_BACKEND_HOST;
    }
    return `http://${host}:5000`;
  }
  return LIVE_BACKEND_HOST;
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
