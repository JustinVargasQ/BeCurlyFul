import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      admin: null,
      error: null,
      loading: false,

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          localStorage.setItem('bcf-admin-token', data.token);
          set({ token: data.token, admin: data.admin, loading: false });
          return true;
        } catch (err) {
          const msg = err.response?.data?.error || 'Error de conexión';
          set({ error: msg, loading: false });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem('bcf-admin-token');
        set({ token: null, admin: null, error: null });
      },
    }),
    {
      name: 'bcf-admin-auth',
      partialize: (s) => ({ token: s.token, admin: s.admin }),
    }
  )
);

export default useAuthStore;
