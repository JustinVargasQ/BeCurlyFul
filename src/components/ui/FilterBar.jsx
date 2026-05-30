import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBrands } from '../../hooks/useProducts';
import { formatCRC } from '../../lib/currency';

/* ── Icons ── */
const ChevronDown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const TagIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const SortIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="21" y1="10" x2="3" y2="10"/>
    <line x1="21" y1="6" x2="3" y2="6"/>
    <line x1="21" y1="14" x2="10" y2="14"/>
    <line x1="21" y1="18" x2="10" y2="18"/>
  </svg>
);

const PriceIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

export const SORT_OPTIONS = [
  { value: 'relevancia', label: 'Relevancia',            icon: '✨' },
  { value: 'precio-asc', label: 'Precio: menor a mayor', icon: '↑' },
  { value: 'precio-desc',label: 'Precio: mayor a menor', icon: '↓' },
  { value: 'rating',     label: 'Mejor valorados',       icon: '⭐' },
  { value: 'nombre',     label: 'A → Z',                 icon: '🔤' },
];

/* ── Shared pill trigger button ── */
function Pill({ label, active, open, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full border transition-all duration-200 whitespace-nowrap select-none ${
        active
          ? 'bg-rose-500 text-white border-rose-500 shadow-md'
          : 'bg-white text-ink-700 border-cream-200 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50/60'
      }`}
    >
      {icon}
      <span>{label}</span>
      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        className={active ? 'text-white/80' : 'text-ink-300 group-hover:text-rose-400'}
      >
        <ChevronDown />
      </motion.span>
    </button>
  );
}

/* ── Reusable dropdown shell ── */
function Dropdown({ open, className = '', children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
          className={`absolute top-full left-0 mt-2 bg-white rounded-2xl z-40 overflow-hidden
            border border-cream-200
            shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]
            ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Dropdown option row ── */
function Option({ label, selected, onClick, prefix }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-3 ${
        selected ? 'text-rose-500 font-semibold bg-rose-50/70' : 'text-ink-700 hover:bg-cream-50'
      }`}
    >
      <span className="flex items-center gap-2.5">
        {prefix && <span className="text-base leading-none w-5 text-center flex-shrink-0">{prefix}</span>}
        {label}
      </span>
      {selected && <CheckIcon />}
    </button>
  );
}

/* ── Mobile: botón "Filtros" + bottom-sheet ── */
const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/>
  </svg>
);
const sheetChip = (active) =>
  `px-3.5 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
    active ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-cream-200 bg-white text-ink-700'
  }`;

function MobileFilters({ brand, sort, minPrice, maxPrice, brands, activeCount, onBrand, onPrice, onSort }) {
  const [open, setOpen] = useState(false);
  const [lMin, setLMin] = useState(minPrice || '');
  const [lMax, setLMax] = useState(maxPrice || '');

  useEffect(() => { setLMin(minPrice || ''); setLMax(maxPrice || ''); }, [minPrice, maxPrice]);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const applyAndClose = () => {
    onPrice({ minPrice: lMin ? Number(lMin) : '', maxPrice: lMax ? Number(lMax) : '' });
    setOpen(false);
  };
  const clearAll = () => {
    onBrand(''); onSort('relevancia'); onPrice({ minPrice: '', maxPrice: '' });
    setLMin(''); setLMax('');
  };
  const activeSort = SORT_OPTIONS.find((o) => o.value === (sort || 'relevancia')) || SORT_OPTIONS[0];

  return (
    <div className="sm:hidden">
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-2 bg-white border border-cream-200 rounded-2xl px-4 py-3 shadow-soft">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-800">
          <FilterIcon /> Filtros y orden
        </span>
        <span className="flex items-center gap-2">
          {activeCount > 0 && <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">{activeCount}</span>}
          <span className="text-xs text-ink-400 truncate max-w-[120px]">{activeSort.label}</span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80]" style={{ background: 'rgba(35,26,27,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => setOpen(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="fixed bottom-0 inset-x-0 z-[80] bg-cream-50 rounded-t-[2rem] max-h-[85dvh] flex flex-col shadow-modal">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className="font-display font-semibold text-ink-900 text-xl">Filtrar y ordenar</h3>
                <button onClick={() => setOpen(false)} aria-label="Cerrar"
                  className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center text-ink-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="overflow-y-auto px-5 pb-4 space-y-6 flex-1">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400 mb-2.5">Ordenar por</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SORT_OPTIONS.map((o) => (
                      <button key={o.value} onClick={() => onSort(o.value)}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium text-left border-2 transition-all ${
                          (sort || 'relevancia') === o.value ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-cream-200 bg-white text-ink-700'
                        }`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {brands.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400 mb-2.5">Marca</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => onBrand('')} className={sheetChip(!brand)}>Todas</button>
                      {brands.map((b) => <button key={b} onClick={() => onBrand(b)} className={sheetChip(brand === b)}>{b}</button>)}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400 mb-2.5">Rango de precio</p>
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 flex items-center gap-1.5 bg-white border border-cream-200 rounded-xl px-3 py-2.5 focus-within:border-rose-400">
                      <span className="text-ink-400 text-xs font-semibold">₡</span>
                      <input type="number" min="0" placeholder="Mínimo" value={lMin} onChange={(e) => setLMin(e.target.value)}
                        className="w-full text-sm bg-transparent outline-none placeholder-ink-300" />
                    </div>
                    <span className="text-ink-300">—</span>
                    <div className="flex-1 flex items-center gap-1.5 bg-white border border-cream-200 rounded-xl px-3 py-2.5 focus-within:border-rose-400">
                      <span className="text-ink-400 text-xs font-semibold">₡</span>
                      <input type="number" min="0" placeholder="Máximo" value={lMax} onChange={(e) => setLMax(e.target.value)}
                        className="w-full text-sm bg-transparent outline-none placeholder-ink-300" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-cream-200 flex gap-3"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <button onClick={clearAll} className="px-5 py-3 rounded-full text-sm font-semibold text-ink-600 bg-cream-100 hover:bg-cream-200 transition-colors">Limpiar</button>
                <button onClick={applyAndClose} className="btn-primary flex-1 py-3">Ver resultados</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FilterBar({ brand, minPrice, maxPrice, sort, onBrand, onPrice, onSort }) {
  const brands = useBrands();
  const [localMin, setLocalMin] = useState(minPrice || '');
  const [localMax, setLocalMax] = useState(maxPrice || '');
  const [open, setOpen]         = useState(null); // 'brand' | 'sort' | 'price' | null

  const containerRef = useRef(null);

  /* Sync price inputs with external state */
  useEffect(() => {
    setLocalMin(minPrice || '');
    setLocalMax(maxPrice || '');
  }, [minPrice, maxPrice]);

  /* Close on outside click */
  useEffect(() => {
    const fn = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(null);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const toggle = (key) => setOpen((o) => (o === key ? null : key));

  const applyPrice = () => {
    onPrice({ minPrice: localMin ? Number(localMin) : '', maxPrice: localMax ? Number(localMax) : '' });
    setOpen(null);
  };

  const clearPrice = () => {
    setLocalMin(''); setLocalMax('');
    onPrice({ minPrice: '', maxPrice: '' });
  };

  const hasPriceFilter = minPrice || maxPrice;
  const activeSort     = SORT_OPTIONS.find((o) => o.value === (sort || 'relevancia')) || SORT_OPTIONS[0];

  /* Active filter count badge */
  const activeCount = [brand, hasPriceFilter, sort && sort !== 'relevancia'].filter(Boolean).length;

  return (
    <>
      {/* Mobile: botón + bottom-sheet */}
      <MobileFilters
        brand={brand} sort={sort} minPrice={minPrice} maxPrice={maxPrice}
        brands={brands} activeCount={activeCount}
        onBrand={onBrand} onPrice={onPrice} onSort={onSort}
      />

      {/* Desktop: pills con dropdowns */}
      <div ref={containerRef} className="hidden sm:flex flex-wrap gap-2.5 items-center mb-7">

      {/* ── Brand ── */}
      <div className="relative">
        <Pill
          label={brand || 'Marca'}
          active={!!brand}
          open={open === 'brand'}
          onClick={() => toggle('brand')}
          icon={<TagIcon />}
        />
        <Dropdown open={open === 'brand'} className="min-w-[210px] py-1.5">
          <Option
            label="Todas las marcas"
            selected={!brand}
            onClick={() => { onBrand(''); setOpen(null); }}
          />
          <div className="h-px bg-cream-100 mx-3 my-1" />
          <div className="max-h-60 overflow-y-auto py-1">
            {brands.map((b) => (
              <Option
                key={b}
                label={b}
                selected={brand === b}
                onClick={() => { onBrand(b); setOpen(null); }}
              />
            ))}
          </div>
        </Dropdown>
      </div>

      {/* ── Sort ── */}
      <div className="relative">
        <Pill
          label={activeSort.label}
          active={!!sort && sort !== 'relevancia'}
          open={open === 'sort'}
          onClick={() => toggle('sort')}
          icon={<SortIcon />}
        />
        <Dropdown open={open === 'sort'} className="min-w-[230px] py-1.5">
          {SORT_OPTIONS.map((opt) => (
            <Option
              key={opt.value}
              label={opt.label}
              prefix={opt.icon}
              selected={(sort || 'relevancia') === opt.value}
              onClick={() => { onSort(opt.value); setOpen(null); }}
            />
          ))}
        </Dropdown>
      </div>

      {/* ── Price ── */}
      <div className="relative">
        <Pill
          label={
            hasPriceFilter
              ? `${minPrice ? formatCRC(minPrice) : '—'} – ${maxPrice ? formatCRC(maxPrice) : '—'}`
              : 'Precio'
          }
          active={!!hasPriceFilter}
          open={open === 'price'}
          onClick={() => toggle('price')}
          icon={<PriceIcon />}
        />
        <Dropdown open={open === 'price'} className="w-72 p-5">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-ink-400 mb-3.5">Rango de precio</p>

          <div className="flex items-center gap-2.5 mb-4">
            {/* Min */}
            <div className="flex-1 flex items-center gap-1.5 bg-cream-50 border border-cream-200 rounded-xl px-3 py-2.5 focus-within:border-rose-400 focus-within:bg-white transition-all duration-200">
              <span className="text-ink-400 text-xs font-semibold flex-shrink-0">₡</span>
              <input
                type="number" min="0" placeholder="Mínimo"
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
                className="w-full text-sm text-ink-800 bg-transparent placeholder-ink-300 outline-none"
              />
            </div>
            <span className="text-ink-300 font-medium text-sm flex-shrink-0">—</span>
            {/* Max */}
            <div className="flex-1 flex items-center gap-1.5 bg-cream-50 border border-cream-200 rounded-xl px-3 py-2.5 focus-within:border-rose-400 focus-within:bg-white transition-all duration-200">
              <span className="text-ink-400 text-xs font-semibold flex-shrink-0">₡</span>
              <input
                type="number" min="0" placeholder="Máximo"
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
                className="w-full text-sm text-ink-800 bg-transparent placeholder-ink-300 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={applyPrice}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-ink-900 hover:bg-rose-500 text-white transition-colors duration-200 shadow-sm"
            >
              Aplicar
            </motion.button>
            {hasPriceFilter && (
              <button
                onClick={clearPrice}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-cream-100 hover:bg-cream-200 text-ink-600 transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </Dropdown>
      </div>

      {/* ── Clear all active filters ── */}
      <AnimatePresence>
        {activeCount > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, x: -6 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -6 }}
            transition={{ duration: 0.18 }}
            onClick={() => {
              onBrand('');
              clearPrice();
              onSort('relevancia');
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink-400 hover:text-rose-500 px-3 py-2 rounded-full hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
            Limpiar filtros
            {activeCount > 1 && (
              <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}
