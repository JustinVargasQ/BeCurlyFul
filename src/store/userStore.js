import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

const useUserStore = create(
  persist(
    (set, get) => ({
      token: null,
      user:  null,   // { id, email, name, picture }
      loading: false,
      error: null,

      isLoggedIn: () => !!get().token && !!get().user,

      /* Sign in with Google credential (ID token) */
      loginWithGoogle: async (credential) => {
        set({ loading: true, error: null });
        try {
          const { data } = await api.post('/users/auth/google', { credential });
          set({ token: data.token, user: data.user, loading: false });
          return { ok: true, user: data.user };
        } catch (err) {
          const msg = err.response?.data?.error || 'No se pudo iniciar sesión';
          set({ loading: false, error: msg });
          return { ok: false, error: msg };
        }
      },

      logout: () => set({ token: null, user: null, error: null }),

      /* Refresh user from backend */
      refreshUser: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const { data } = await api.get('/users/me');
          set({ user: data });
        } catch (err) {
          /* Token invalid → clear session */
          if (err.response?.status === 401) set({ token: null, user: null });
        }
      },
    }),
    {
      name: 'jd-user',   // localStorage key
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
);

export default useUserStore;
