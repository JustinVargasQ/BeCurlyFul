const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

let loadPromise = null;

export function loadGoogleMaps() {
  if (!KEY) return Promise.reject(new Error('VITE_GOOGLE_MAPS_KEY no configurada'));
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&language=es&region=CR`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps) resolve(window.google);
      else reject(new Error('Google Maps no cargó correctamente'));
    };
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export const hasGoogleMapsKey = Boolean(KEY);
