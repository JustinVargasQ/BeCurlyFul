import { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMaps, hasGoogleMapsKey } from '../../lib/loadGoogleMaps';

const CR_CENTER = { lat: 9.9281, lng: -84.0907 };
const MAP_SEPARATOR = '\n📍 Ref. mapa: ';

/* Extract user's description (strips any "Ref. mapa:" suffix) */
const getUserDescription = (text) => {
  if (!text) return '';
  return text.split(MAP_SEPARATOR)[0].trim();
};

/* Extract the map reference part if present */
const getMapReference = (text) => {
  if (!text || !text.includes(MAP_SEPARATOR)) return '';
  return text.split(MAP_SEPARATOR)[1].trim();
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

  /* What the user sees in the input — only their description (clean) */
  const userDescription = getUserDescription(value);
  const mapReference    = getMapReference(value);
  const hasMapMarked    = !!mapReference;

  /* When user types in the input, preserve the map ref if it exists */
  const handleInputChange = (newDesc) => {
    if (hasMapMarked) {
      onChange?.(newDesc ? `${newDesc}${MAP_SEPARATOR}${mapReference}` : '');
    } else {
      onChange?.(newDesc);
    }
  };

  const handleMapButtonClick = () => setShowPreStep(true);

  const handlePreStepContinue = (text) => {
    /* Save user description (preserving any existing map ref) */
    if (text.trim()) {
      const combined = hasMapMarked ? `${text}${MAP_SEPARATOR}${mapReference}` : text;
      onChange?.(combined);
    }
    setShowPreStep(false);
    setOpen(true);
  };

  const handleMapConfirm = (result) => {
    const desc = getUserDescription(value);
    const combined = desc
      ? `${desc}${MAP_SEPARATOR}${result.address}`
      : result.address;
    onChange?.(combined);
    onPick?.({ address: combined, lat: result.lat, lng: result.lng });
    setOpen(false);
  };

  const handleClearMap = () => {
    const desc = getUserDescription(value);
    onChange?.(desc);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          required={required}
          value={userDescription}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 ${className}`}
          autoComplete="off"
        />
        {hasGoogleMapsKey && (
          <button
            type="button"
            onClick={handleMapButtonClick}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors shadow-btn ${
              hasMapMarked
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-rose-500 hover:bg-rose-600 text-white'
            }`}
            title={hasMapMarked ? 'Cambiar ubicación' : 'Elegir ubicación en el mapa'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="hidden sm:inline">{hasMapMarked ? 'Cambiar' : 'Mapa'}</span>
          </button>
        )}
      </div>

      {hasMapMarked && (
        <div className="mt-2 rounded-xl overflow-hidden border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <div className="px-3.5 py-2.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Ubicación marcada en el mapa</p>
              </div>
              <p className="text-xs text-emerald-700 leading-snug break-words">
                <span className="text-emerald-500">📍</span> {mapReference}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearMap}
              className="flex-shrink-0 text-emerald-400 hover:text-red-500 transition-colors p-0.5"
              title="Quitar ubicación del mapa">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
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
          userDescription={getUserDescription(value)}
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

  /* Auto-resize textarea: starts at single-line height, grows up to ~5 rows */
  const autoSize = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(Math.max(el.scrollHeight, 44), 140) + 'px';
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
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Compact header with close button */}
        <div className="relative px-5 pt-5 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 hover:bg-cream-50 rounded-lg transition-colors text-ink-400 hover:text-ink-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold tracking-wide">PASO 1 DE 2</span>
            <span className="text-[10px] text-ink-400 font-medium">Dirección + mapa</span>
          </div>

          <h3 className="font-display text-lg font-bold text-ink-900 leading-tight">
            ¿Dónde te entregamos? 📍
          </h3>
          <p className="text-xs text-ink-500 mt-1 leading-relaxed">
            Escribí tu dirección con señas. En el siguiente paso marcás el punto exacto en el mapa —
            <strong className="text-ink-700"> guardamos las dos</strong> para que el repartidor te encuentre fácil.
          </p>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Address input — clean, single-line that grows */}
          <div>
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => { setText(e.target.value); autoSize(e.target); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && text.trim()) { e.preventDefault(); onContinue(text); } }}
              placeholder="Ej: Barrio Los Ángeles, 200m norte del parque, casa verde con portón negro"
              rows={1}
              className="w-full border-2 border-cream-200 rounded-xl px-4 py-3 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-rose-400 transition-all resize-none overflow-hidden leading-relaxed"
              style={{ height: '44px' }}
            />
            <p className="text-[10px] text-ink-400 mt-1.5 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Incluí barrio, calle, número de casa, color y señas
            </p>
          </div>

          {/* Two-step flow visual indicator */}
          <div className="flex items-stretch gap-2 bg-cream-50 rounded-xl p-2.5 border border-cream-200">
            <div className="flex-1 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-ink-900 leading-tight">Texto con señas</p>
                <p className="text-[10px] text-ink-400">Lo que escribís acá</p>
              </div>
            </div>
            <div className="flex items-center text-ink-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cream-200 text-ink-500 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-ink-700 leading-tight">Mapa exacto</p>
                <p className="text-[10px] text-ink-400">Punto GPS</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-ink-500 hover:bg-cream-50 text-sm font-semibold transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onContinue(text)}
              disabled={!text.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors shadow-btn">
              Continuar al mapa
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
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
