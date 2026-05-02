import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const SERVER_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 45000, // Render free tier cold starts can take 30-50s
});

api.interceptors.request.use((config) => {
  /* Admin routes use the admin token */
  const adminToken = localStorage.getItem('jd-admin-token');
  if (adminToken && config.url?.includes('/admin')) {
    config.headers.Authorization = `Bearer ${adminToken}`;
    return config;
  }
  /* Otherwise prefer user token if exists, fallback to admin */
  try {
    const userPersist = JSON.parse(localStorage.getItem('jd-user') || 'null');
    const userToken = userPersist?.state?.token;
    if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
      return config;
    }
  } catch {}
  if (adminToken) config.headers.Authorization = `Bearer ${adminToken}`;
  return config;
});

export function assetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  // /uploads/ paths are gone after every Render redeploy (ephemeral filesystem)
  if (path.startsWith('/uploads/')) return '';
  return `${SERVER_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

export default api;
