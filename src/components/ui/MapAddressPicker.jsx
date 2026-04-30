import { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMaps, hasGoogleMapsKey } from '../../lib/loadGoogleMaps';

const CR_CENTER = { lat: 9.9281, lng: -84.0907 };
const MAP_SEPARATOR = '\n📍 Ref. mapa: ';

/* Extract user's description (strips any previous "Ref. mapa:" suffix) */
const getUserDescription = (text) => {
  if (!text) return '';
  return text.split(MAP_SEPARATOR)[0].trim();
};

export default function MapAddressPicker({
  value,
  onChange,
  onPick,
  placeholder = 'Escribí o elegí en el mapa',
  className = '',
  required = false,
}) {
  const [showPreStep, setShowPreStep] = useState(false);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(null);
  const [userDescription, setUserDescription] = useState('');

  const handleMapButtonClick = () => {
    setUserDescription(getUserDescription(value));
    setShowPreStep(true);
  };

  const handlePreStepContinue = (text) => {
    setUserDescription(text);
    if (text.trim()) onChange?.(text);
    setShowPreStep(false);
    setOpen(true);
  };

  const handleMapConfirm = (result) => {
    /* Combine user description + map's geocoded address */
    const combined = userDescription
      ? `${userDescription}${MAP_SEPARATOR}${result.address}`
      : result.address;
    setPicked({ ...result, combined });
    onChange?.(combined);
    onPick?.({ address: combined, lat: result.lat, lng: result.lng });
    setOpen(false);
  };

  const hasMapMarked = picked && picked.combined === value;

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          required={required}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 ${className}`}
          autoComplete="off"
        />
        {hasGoogleMapsKey && (
          <button
            type="button"
            onClick={handleMapButtonClick}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors shadow-btn"
            title="Elegir ubicación en el mapa">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="hidden sm:inline">Mapa</span>
          </button>
        )}
      </div>

      {hasMapMarked && (
        <div className="mt-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2 space-y-1">
          <p className="text-[11px] text-green-700 font-semibold flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Ubicación marcada en el mapa
          </p>
          {picked.address && (
            <p className="text-[10px] text-green-600 leading-snug pl-4">
              📍 {picked.address}
            </p>
          )}
        </div>
      )}

      {showPreStep && (
        <AddressPreStepModal
          initialText={userDescription}
          onContinue={handlePreStepContinue}
          onClose={() => setShowPreStep(false)}
        />
      )}

      {open && (
        <MapPickerModal
          userDescription={userDescription}
          onClose={() => setOpen(false)}
          onConfirm={handleMapConfirm}
        />
      )}
    </div>
  );
}

/* ── Pre-step modal: ask for exact address before opening the map ── */
function AddressPreStepModal({ initialText, onContinue, onClose }) {
  const [text, setText] = useState(initialText || '');
  const inputRef = useRef(null);

  /* Auto-resize textarea to fit content */
  const autoSize = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  };

  useEffect(() => {
    inputRef.current?.focus();
    autoSize(inputRef.current);
    const onEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-cream-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,rgba(184,95,114,.15),rgba(201,168,117,.1))', border: '1px solid rgba(184,95,114,.2)' }}>
                📍
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-ink-900 leading-tight">
                  Ingresá tu dirección exacta
                </h3>
                <p className="text-[11px] text-ink-400 mt-0.5">Paso 1 de 2 — texto de la dirección</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 hover:bg-cream-50 rounded-lg transition-colors flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3.5">
          {/* Address input */}
          <div>
            <label className="block text-xs font-bold text-ink-600 uppercase tracking-wide mb-1.5">
              Dirección completa con señas <span className="text-rose-400">*</span>
            </label>
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => { setText(e.target.value); autoSize(e.target); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && text.trim()) { e.preventDefault(); onContinue(text); } }}
              placeholder="Ej: Barrio Los Ángeles, 200m norte del parque, casa verde con portón negro"
              rows={2}
              className="w-full border border-cream-200 rounded-xl px-4 py-2.5 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all resize-none overflow-hidden leading-relaxed"
              style={{ minHeight: '52px' }}
            />
            <p className="text-[10px] text-ink-400 mt-1">
              Barrio, calle, número de casa y señas (color, referencias, etc.)
            </p>
          </div>

          {/* Map explanation tip — más compacto */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2.5">
            <span className="text-base flex-shrink-0 mt-0.5">🗺️</span>
            <div>
              <p className="text-[11px] font-bold text-blue-800 mb-0.5 leading-snug">
                En el siguiente paso vas a marcar el punto exacto en el mapa
              </p>
              <p className="text-[10px] text-blue-700 leading-relaxed">
                Vamos a guardar <strong>las dos cosas</strong>: tu descripción con señas + la ubicación del mapa,
                para que el repartidor llegue sin problemas.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-cream-200 text-ink-700 hover:bg-cream-50 text-sm font-semibold transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onContinue(text)}
              disabled={!text.trim()}
              className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors shadow-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Continuar al mapa →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapPickerModal({ userDescription, onClose, onConfirm }) {
  const mapRef        = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef     = useRef(null);
  const geocoderRef   = useRef(null);

  const [mapLoading, setMapLoading]   = useState(true);
  const [mapError, setMapError]       = useState('');
  const [address, setAddress]         = useState('');
  const [coords, setCoords]           = useState(CR_CENTER);
  const [geocoding, setGeocoding]     = useState(false);
  const [locating, setLocating]       = useState(false);
  const [locError, setLocError]       = useState('');
  const [hasMarked, setHasMarked]     = useState(false);

  const reverseGeocode = useCallback((pos) => {
    if (!geocoderRef.current) return;
    setGeocoding(true);
    geocoderRef.current.geocode({ location: pos, language: 'es', region: 'CR' }, (results, status) => {
      setGeocoding(false);
      if (status === 'OK' && results[0]) {
        setAddress(results[0].formatted_address);
      } else {
        setAddress(`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: CR_CENTER,
          zoom: 8,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: 'greedy',
        });

        const marker = new google.maps.Marker({
          position: CR_CENTER,
          map,
          draggable: true,
          animation: google.maps.Animation.DROP,
          visible: false,
        });

        mapInstanceRef.current = map;
        markerRef.current      = marker;
        geocoderRef.current    = new google.maps.Geocoder();

        const updateFromPos = (pos) => {
          setCoords({ lat: pos.lat(), lng: pos.lng() });
          setHasMarked(true);
          reverseGeocode({ lat: pos.lat(), lng: pos.lng() });
        };

        marker.addListener('dragend', () => updateFromPos(marker.getPosition()));
        map.addListener('click', (e) => {
          marker.setPosition(e.latLng);
          marker.setVisible(true);
          updateFromPos(e.latLng);
        });

        setMapLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setMapError(err.message || 'No se pudo cargar el mapa');
          setMapLoading(false);
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Tu dispositivo no soporta geolocalización.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.panTo(p);
          mapInstanceRef.current.setZoom(18);
          markerRef.current.setPosition(p);
          markerRef.current.setVisible(true);
          setCoords(p);
          setHasMarked(true);
          reverseGeocode(p);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocError('Permiso denegado. En tu navegador, permitís el acceso a la ubicación y volvés a intentar.');
        } else if (err.code === 2) {
          setLocError('No se pudo obtener tu posición. Verificá que el GPS esté activo.');
        } else {
          setLocError('Se agotó el tiempo. Intentá de nuevo o ubicáte en el mapa manualmente.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleConfirm = () => {
    onConfirm({ address, lat: coords.lat, lng: coords.lng });
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between px-4 sm:px-5 py-3.5 border-b border-cream-100 gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold text-ink-900">Marcá tu ubicación exacta</h3>
            <p className="text-[11px] text-ink-400">Paso 2 de 2 — tocá el mapa o usá tu GPS</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-cream-50 rounded-lg transition-colors flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* User's typed description — recordatorio */}
        {userDescription && (
          <div className="px-4 sm:px-5 pt-3 pb-1">
            <div className="bg-cream-50 border border-cream-200 rounded-xl px-3 py-2 flex items-start gap-2">
              <span className="text-xs flex-shrink-0 mt-0.5">📝</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest">Tu descripción</p>
                <p className="text-xs text-ink-700 leading-snug mt-0.5 break-words">{userDescription}</p>
              </div>
            </div>
          </div>
        )}

        {/* GPS button */}
        <div className="px-4 sm:px-5 pt-3 pb-2">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating || mapLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 disabled:opacity-60"
            style={{
              background: locating
                ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
                : 'linear-gradient(135deg,#B85F72,#93485A)',
              color: '#fff',
              boxShadow: '0 4px 18px rgba(184,95,114,0.35)',
            }}>
            {locating ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Obteniendo tu ubicación...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <line x1="12" y1="2" x2="12" y2="5"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                  <line x1="2" y1="12" x2="5" y2="12"/>
                  <line x1="19" y1="12" x2="22" y2="12"/>
                </svg>
                📍 Localizarme automáticamente
              </>
            )}
          </button>

          {locError && (
            <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-xs text-amber-700 leading-relaxed">{locError}</p>
            </div>
          )}

          <p className="text-center text-[11px] text-ink-400 mt-2">— o tocá el mapa para marcar tu punto exacto —</p>
        </div>

        {/* Map */}
        <div className="relative bg-cream-50" style={{ height: '45vh', minHeight: 320 }}>
          {mapLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-cream-50">
              <div className="flex flex-col items-center gap-3">
                <div className="w-7 h-7 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
                <p className="text-ink-400 text-sm">Cargando mapa...</p>
              </div>
            </div>
          )}
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-cream-50 p-6 text-center">
              <div>
                <p className="text-2xl mb-2">🗺️</p>
                <p className="text-red-500 text-sm">{mapError}</p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Address preview + actions */}
        <div className="px-4 sm:px-5 py-3.5 space-y-3 bg-cream-50 border-t border-cream-100">
          <div>
            <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-1">Ubicación marcada en el mapa</p>
            <p className="text-sm text-ink-800 leading-snug min-h-[2.5em]">
              {geocoding
                ? <span className="text-ink-300 italic">Obteniendo dirección...</span>
                : hasMarked && address
                  ? <>📍 {address}</>
                  : <span className="text-ink-300 italic">Usá el GPS o tocá el mapa para marcar tu ubicación exacta</span>
              }
            </p>
            {hasMarked && userDescription && (
              <p className="text-[10px] text-green-700 mt-1.5 font-medium">
                ✓ Se guardarán las dos: tu descripción + esta ubicación del mapa
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-cream-200 text-ink-700 hover:bg-white text-sm font-semibold transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={mapLoading || !!mapError || !hasMarked || geocoding}
              className="flex-[2] px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors shadow-btn">
              Confirmar ubicación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
