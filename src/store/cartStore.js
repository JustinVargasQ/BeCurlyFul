import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { trackAddToCart } from '../lib/analytics';

/* keyOf — identificador estable para un producto. Cae a `_id` y `slug` si
 * `id` no está definido (algunos endpoints pueden devolver solo `_id`). Sin
 * esto, dos productos cuyos `id` son ambos undefined se fusionan en un solo
 * line del carrito y los botones +/-/trash actúan sobre el item equivocado. */
const keyOf = (p) => {
  if (!p) return null;
  if (p.id != null) return String(p.id);
  if (p._id != null) return String(p._id);
  if (p.slug) return String(p.slug);
  return null;
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
          const existing = s.items.find((i) => keyOf(i) === key);
          if (existing) {
            return { items: s.items.map((i) => keyOf(i) === key ? { ...i, qty: i.qty + qty } : i) };
          }
          // Garantizar que el item guardado tenga `id` para futuras operaciones
          return { items: [...s.items, { ...product, id: key, qty }] };
        });
      },

      removeItem: (id) => {
        const target = id == null ? '' : String(id);
        set((s) => ({ items: s.items.filter((i) => keyOf(i) !== target) }));
      },

      updateQty(id, qty) {
        const target = id == null ? '' : String(id);
        if (qty < 1) return get().removeItem(target);
        set((s) => ({ items: s.items.map((i) => keyOf(i) === target ? { ...i, qty } : i) }));
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
      name: 'jd-cart-v2',
      version: 1, // forzar migrate en clientes existentes (cart roto sin `id`)
      // Migración: items viejos guardados sin `id` quedan corruptos.
      // Re-deriva la id desde `_id`/`slug` para que +/-/trash funcionen.
      migrate: (state) => {
        if (!state || !Array.isArray(state.items)) return state;
        return {
          ...state,
          items: state.items.map((i) => i.id ? i : { ...i, id: keyOf(i) }).filter((i) => i.id),
        };
      },
    }
  )
);

export default useCartStore;
