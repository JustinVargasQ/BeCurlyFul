import { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMaps, hasGoogleMapsKey } from '../../lib/loadGoogleMaps';

const CR_CENTER = { lat: 9.9281, lng: -84.0907 };
const MAP_SEPARATOR = '\nRef. mapa: ';
/* Tolerate old data that used 📍 as the marker */
const MAP_SEPARATOR_RX = /\n(?:📍\s*)?Ref\. mapa:\s*/;

const getUserDescription = (text) => {
  if (!text) return '';
  return text.split(MAP_SEPARATOR_RX)[0].trim();
};

const getMapReference = (text) => {
  if (!text) return '';
  const parts = text.split(MAP_SEPARATOR_RX);
  return parts.length > 1 ? parts[1].trim() : '';
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
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none z-10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </span>
          <input
            type="text"
            required={required}
            value={userDescription}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full pl-10 ${className}`}
            autoComplete="off"
          />
        </div>
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
        <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <p className="text-[11px] text-emerald-800 leading-snug min-w-0 flex-1 break-words">
            <span className="font-bold">Marcado en mapa:</span>{' '}
            <span className="text-emerald-700">{mapReference}</span>
          </p>
          <button
            type="button"
            onClick={handleClearMap}
            className="flex-shrink-0 text-emerald-400 hover:text-red-500 transition-colors p-0.5"
            title="Quitar ubicación del mapa">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
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

  const charCount = text.trim().length;
  const isValid = charCount >= 8;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-ink-900/60 backdrop-blur-md p-0 sm:p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Header con gradiente sutil rose-gold */}
        <div
          className="relative px-6 pt-6 pb-5 border-b border-cream-100"
          style={{ background: 'linear-gradient(180deg, #FDF7F4 0%, #FFFFFF 100%)' }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white border border-cream-200 hover:border-rose-200 transition-colors text-ink-500 hover:text-rose-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* Step pill con gradiente */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg,#E879A0,#C9547E)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
            PASO 1 DE 2
          </span>

          <h3 className="font-display text-2xl font-bold text-ink-900 leading-tight mt-3">
            ¿A dónde lo mandamos?
          </h3>
          <p className="text-[13px] text-ink-500 mt-1.5 leading-relaxed">
            Contanos cómo llegar con señas claras. En el próximo paso marcás el punto exacto en el mapa.
          </p>
        </div>

        <div className="px-6 pt-5 pb-6 space-y-5">
          {/* Textarea con label flotante e icono de ubicacion */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-2 flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              Dirección con señas
            </label>
            <div className="relative">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => { setText(e.target.value); autoSize(e.target); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && isValid) { e.preventDefault(); onContinue(text); } }}
                placeholder="Ej: Barrio Los Ángeles, 200m norte del parque, casa verde con portón negro"
                rows={3}
                maxLength={400}
                className="w-full border-2 border-cream-200 rounded-2xl px-4 py-3 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all resize-none overflow-hidden leading-relaxed bg-white"
                style={{ minHeight: '88px' }}
              />
              <span className="absolute bottom-2 right-3 text-[10px] font-medium text-ink-300 select-none">
                {charCount}/400
              </span>
            </div>

            {/* Tips inline */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {['Barrio', 'Calle / Avenida', 'Nº de casa', 'Color', 'Señas cercanas'].map((tip) => (
                <span key={tip} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-semibold border border-rose-100">
                  {tip}
                </span>
              ))}
            </div>
          </div>

          {/* Two-step flow visual indicator — mas elegante */}
          <div className="flex items-stretch gap-1 bg-cream-50 rounded-2xl p-2 border border-cream-100">
            <div className="flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white shadow-sm border border-rose-100">
              <div
                className="w-8 h-8 rounded-xl text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm"
                style={{ background: 'linear-gradient(135deg,#E879A0,#C9547E)' }}>
                1
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-ink-900 leading-tight">Texto con señas</p>
                <p className="text-[10px] text-ink-400 leading-tight mt-0.5">Lo de aquí arriba</p>
              </div>
            </div>
            <div className="flex items-center text-ink-300 px-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div className="flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-xl">
              <div className="w-8 h-8 rounded-xl bg-cream-200 text-ink-500 flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-ink-700 leading-tight">Punto en el mapa</p>
                <p className="text-[10px] text-ink-400 leading-tight mt-0.5">GPS exacto</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl text-ink-600 hover:bg-cream-50 text-sm font-semibold transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onContinue(text)}
              disabled={!isValid}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-bold transition-all shadow-btn hover:shadow-btn-hover disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              style={isValid
                ? { background: 'linear-gradient(135deg,#E879A0,#C9547E)' }
                : { background: '#E5C8CF' }}>
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
          icon: {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z',
            fillColor: '#E879A0',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2.5,
            scale: 2.2,
            anchor: new google.maps.Point(12, 22),
          },
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
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-ink-900/60 backdrop-blur-md p-0 sm:p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Header con paso + titulo */}
        <div
          className="relative px-5 sm:px-6 pt-5 pb-4 border-b border-cream-100"
          style={{ background: 'linear-gradient(180deg, #FDF7F4 0%, #FFFFFF 100%)' }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white border border-cream-200 hover:border-rose-200 transition-colors text-ink-500 hover:text-rose-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg,#E879A0,#C9547E)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
            PASO 2 DE 2
          </span>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-ink-900 leading-tight mt-2.5">
            Marcá el punto exacto
          </h3>
          <p className="text-[13px] text-ink-500 mt-1 leading-relaxed pr-10">
            Tocá tu casa en el mapa o pediles a tu GPS que te ubique en segundos.
          </p>
        </div>

        {/* Scrollable inner content */}
        <div className="flex-1 overflow-y-auto">
          {/* Recordatorio de la descripcion */}
          {userDescription && (
            <div className="px-5 sm:px-6 pt-4">
              <div className="rounded-2xl border border-rose-100 bg-rose-50/40 px-3.5 py-2.5 flex items-start gap-2.5">
                <span className="w-7 h-7 rounded-full bg-white border border-rose-100 flex items-center justify-center text-rose-500 flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Tus señas</p>
                  <p className="text-xs text-ink-700 leading-snug mt-0.5 break-words">{userDescription}</p>
                </div>
              </div>
            </div>
          )}

          {/* GPS hero button */}
          <div className="px-5 sm:px-6 pt-4">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating || mapLoading}
              className="relative w-full overflow-hidden flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm transition-all duration-300 disabled:opacity-60 group"
              style={{
                background: locating
                  ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
                  : 'linear-gradient(135deg,#E879A0,#F472B6 60%,#F472B6)',
                color: '#fff',
                boxShadow: '0 6px 22px rgba(232,121,160,0.32)',
              }}>
              {/* Shimmer al hover */}
              {!locating && (
                <span aria-hidden className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[300%]" />
              )}
              {locating ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Buscando tu ubicación…
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
                  Usar mi ubicación actual
                </>
              )}
            </button>

            {locError && (
              <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <span className="text-amber-500 flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </span>
                <p className="text-xs text-amber-700 leading-relaxed">{locError}</p>
              </div>
            )}

            {/* Divisor "o" */}
            <div className="flex items-center gap-3 mt-3 mb-3">
              <span className="flex-1 h-px bg-cream-200" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400">o tocá el mapa</span>
              <span className="flex-1 h-px bg-cream-200" />
            </div>
          </div>

          {/* Map */}
          <div className="px-5 sm:px-6 pb-4">
            <div className="relative rounded-2xl overflow-hidden border border-cream-200 shadow-sm bg-cream-50" style={{ height: '42vh', minHeight: 280 }}>
              {mapLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-cream-50">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
                    <p className="text-ink-400 text-sm">Cargando mapa…</p>
                  </div>
                </div>
              )}
              {mapError && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-cream-50 p-6 text-center">
                  <div>
                    <span className="inline-flex w-10 h-10 rounded-full bg-red-50 items-center justify-center text-red-500 mb-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                    </span>
                    <p className="text-red-500 text-sm">{mapError}</p>
                  </div>
                </div>
              )}
              <div ref={mapRef} className="w-full h-full" />

              {/* Hint flotante cuando aun no se marca nada */}
              {!hasMarked && !mapLoading && !mapError && (
                <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm border border-cream-200 shadow-md text-[11px] font-semibold text-ink-700 flex items-center gap-1.5 animate-pulse">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  Tocá donde quedás
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer fijo: preview + actions */}
        <div className="px-5 sm:px-6 py-4 bg-white border-t border-cream-100 space-y-3">
          <div className="rounded-2xl bg-cream-50 border border-cream-100 px-3.5 py-2.5">
            <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest mb-0.5">Punto marcado</p>
            <div className="text-sm text-ink-800 leading-snug min-h-[2.2em]">
              {geocoding ? (
                <span className="text-ink-400 italic">Buscando dirección…</span>
              ) : hasMarked && address ? (
                <span className="inline-flex items-start gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 mt-0.5 flex-shrink-0">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>{address}</span>
                </span>
              ) : (
                <span className="text-ink-400 italic">Sin marcar todavía — usá el GPS o tocá el mapa</span>
              )}
            </div>
            {hasMarked && userDescription && (
              <p className="text-[10px] text-emerald-700 mt-1.5 font-semibold flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Guardamos las dos: tus señas + el punto GPS
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl border border-cream-200 text-ink-700 hover:bg-cream-50 text-sm font-semibold transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={mapLoading || !!mapError || !hasMarked || geocoding}
              className="flex-1 px-4 py-3 rounded-2xl text-white text-sm font-bold transition-all shadow-btn hover:shadow-btn-hover disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              style={{ background: (mapLoading || !!mapError || !hasMarked || geocoding)
                ? '#E5C8CF'
                : 'linear-gradient(135deg,#E879A0,#C9547E)' }}>
              Confirmar ubicación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
