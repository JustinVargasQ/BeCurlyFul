import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { trackAddToCart } from '../lib/analytics';

/* baseIdOf — identificador del PRODUCTO (sin considerar variante). Cae a
 * `_id` y `slug` si `id` no está definido. */
const baseIdOf = (p) => {
  if (!p) return null;
  if (p.id != null) return String(p.id);
  if (p._id != null) return String(p._id);
  if (p.slug) return String(p.slug);
  return null;
};

/* Serializa selectedVariants en un string estable (claves ordenadas) para
 * formar parte de la key. Asi "Tono:Rosado" y "Tono:Verde" son lineas
 * distintas, pero "Tono:Rosado, Color:Medio" no depende del orden de keys. */
const variantSuffix = (v) => {
  if (!v || typeof v !== 'object') return '';
  const entries = Object.entries(v)
    .filter(([k, val]) => typeof k === 'string' && val != null && val !== '')
    .map(([k, val]) => [String(k), String(val)])
    .sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return '';
  return '::' + entries.map(([k, val]) => `${k}=${val}`).join('|');
};

/* keyOf — identificador de LINEA del carrito (producto + variantes). Dos
 * "Base BB Cream Amoraz" con tono distinto son 2 lineas separadas. Sin esto,
 * el segundo addItem solo incrementa qty y la info del tono nuevo se pierde. */
const keyOf = (p) => {
  const base = baseIdOf(p);
  if (!base) return null;
  return base + variantSuffix(p?.selectedVariants);
};

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openCart:  () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      addItem(product, qty = 1) {
        const key = keyOf(product);
        if (!key) return;
        trackAddToCart(product, qty);
        set((s) => {
          const existing = s.items.find((i) => i.id === key);
          if (existing) {
            return { items: s.items.map((i) => i.id === key ? { ...i, qty: i.qty + qty } : i) };
          }
          // Garantizar que la linea guardada tenga `id` = key (incluye
          // variantes) y conserve `productId` con el id real del producto
          // para que el backend pueda revalidar precio/stock.
          const productId = baseIdOf(product);
          return { items: [...s.items, { ...product, id: key, productId, qty }] };
        });
      },

      removeItem: (id) => {
        const target = id == null ? '' : String(id);
        set((s) => ({ items: s.items.filter((i) => i.id !== target) }));
      },

      updateQty(id, qty) {
        const target = id == null ? '' : String(id);
        if (qty < 1) return get().removeItem(target);
        set((s) => ({ items: s.items.map((i) => i.id === target ? { ...i, qty } : i) }));
      },

      couponCode:     '',
      couponDiscount: 0,
      couponDesc:     '',
      couponType:     '',
      setCoupon: (code, discount = 0, desc = '', type = '') =>
        set({ couponCode: code, couponDiscount: discount, couponDesc: desc, couponType: type }),
      clearCoupon: () =>
        set({ couponCode: '', couponDiscount: 0, couponDesc: '', couponType: '' }),

      clearCart: () => set({ items: [], couponCode: '', couponDiscount: 0, couponDesc: '', couponType: '' }),

      get total() {
        return get().items.reduce((s, i) => s + i.price * i.qty, 0);
      },
      get count() {
        return get().items.reduce((s, i) => s + i.qty, 0);
      },
    }),
    {
      name: 'bcf-cart-v1',
      // Bump a v2: items guardados con id = solo productId pero ahora la key
      // incluye variantes. Recomputamos la id desde producto+variantes para
      // que +/-/trash sigan funcionando despues del cambio.
      version: 2,
      migrate: (state, fromVersion) => {
        if (!state || !Array.isArray(state.items)) return state;
        const items = state.items
          .map((i) => {
            const productId = baseIdOf(i) || i.productId || null;
            const id = keyOf(i);
            return id ? { ...i, id, productId } : null;
          })
          .filter(Boolean);
        return { ...state, items };
      },
    }
  )
);

export default useCartStore;
