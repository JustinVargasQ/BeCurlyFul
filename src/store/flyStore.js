import { create } from 'zustand';

/* Animación "fly to cart" — cuando se agrega un producto, una miniatura vuela
 * desde el card hacia el ícono del carrito. El componente <FlyToCart/> lee esta
 * cola y anima cada vuelo; al terminar se quita con done(). */
const useFlyStore = create((set) => ({
  flights: [],
  fly: (imageUrl, from) =>
    set((s) => ({
      flights: [...s.flights, { id: Date.now() + Math.random(), imageUrl, from }],
    })),
  done: (id) => set((s) => ({ flights: s.flights.filter((f) => f.id !== id) })),
}));

export default useFlyStore;
