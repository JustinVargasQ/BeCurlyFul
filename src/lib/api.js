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

/* Normaliza las opciones de variantes: pueden venir como strings (formato
 * legacy) u objetos { value, image }. Devuelve siempre el formato objeto. */
export function normalizeVariantOption(opt) {
  if (opt == null) return null;
  if (typeof opt === 'string') return { value: opt, image: '' };
  if (typeof opt === 'object') {
    return { value: opt.value || '', image: opt.image || '' };
  }
  return null;
}

export function normalizeVariants(variants) {
  if (!Array.isArray(variants)) return [];
  return variants
    .filter((v) => v?.name)
    .map((v) => ({
      name: v.name,
      options: (v.options || []).map(normalizeVariantOption).filter((o) => o && o.value),
    }));
}

/* Inject Cloudinary transformations for automatic format (WebP/AVIF when
 * supported), automatic quality, and a width cap. Cuts image weight ~70%
 * without visible quality loss.
 *
 *   optimizedImage(url, 400)  → 400px wide, f_auto, q_auto
 *   optimizedImage(url, 800)  → 800px wide
 *   optimizedImage(url)        → 800px default
 *
 * No-op for non-Cloudinary URLs (returns input unchanged), so it's safe to
 * call on any image URL across the app. */
export function optimizedImage(url, width = 800) {
  if (!url || typeof url !== 'string') return url;
  // Match Cloudinary URLs of the form:
  //   https://res.cloudinary.com/<cloud>/image/upload/<rest>
  // We insert transformations between /upload/ and the public_id, replacing
  // any existing trailing slash transformations to avoid double-stacking.
  const match = url.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i);
  if (!match) return url;
  const [, prefix, rest] = match;
  // If the URL already has transformations (something_,something_/...), keep them
  // and just prepend our own — Cloudinary chains transformations with /.
  const transforms = `f_auto,q_auto,w_${Math.round(width)},c_limit`;
  return `${prefix}${transforms}/${rest}`;
}

export default api;
