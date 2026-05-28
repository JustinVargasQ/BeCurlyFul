import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const keyOf = (p) => p?.id ?? p?._id ?? p?.slug;

const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],

      has: (product) => {
        const k = keyOf(product);
        if (k == null) return false;
        return get().items.some((i) => keyOf(i) === k);
      },

      toggle(product) {
        const k = keyOf(product);
        if (k == null) return;
        set((s) => {
          const exists = s.items.some((i) => keyOf(i) === k);
          if (exists) return { items: s.items.filter((i) => keyOf(i) !== k) };
          return { items: [{ ...product, addedAt: Date.now() }, ...s.items] };
        });
      },

      remove(product) {
        const k = keyOf(product);
        if (k == null) return;
        set((s) => ({ items: s.items.filter((i) => keyOf(i) !== k) }));
      },

      clear: () => set({ items: [] }),

      get count() {
        return get().items.length;
      },
    }),
    { name: 'bcf-wishlist-v1' }
  )
);

export default useWishlistStore;
