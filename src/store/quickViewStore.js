import { create } from 'zustand';

/* Quick-view: abre un bottom-sheet con el detalle rápido de un producto sin
 * salir del catálogo. Cualquier ProductCard llama open(product). */
const useQuickView = create((set) => ({
  product: null,
  open: (product) => set({ product }),
  close: () => set({ product: null }),
}));

export default useQuickView;
