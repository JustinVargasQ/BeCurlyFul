import { useState, useEffect } from 'react';
import api from '../../lib/api';

const USE_API = import.meta.env.VITE_API_URL;

export default function PromoBanner() {
  const [banner, setBanner] = useState(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!USE_API) return;
    api.get('/settings')
      .then(({ data }) => {
        if (data.promoBannerActive && data.promoBanner) {
          setBanner({ text: data.promoBanner, color: data.promoBannerColor || '#E879A0' });
        }
      })
      .catch(() => {});
  }, []);

  if (!banner || closed) return null;

  return (
    <div className="relative z-50 flex items-center justify-center gap-3 px-10 py-2.5 text-white text-sm font-medium text-center"
      style={{ background: banner.color }}>
      <span>{banner.text}</span>
      <button onClick={() => setClosed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Cerrar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}
