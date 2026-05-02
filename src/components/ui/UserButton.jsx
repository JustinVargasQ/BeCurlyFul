import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useUserStore from '../../store/userStore';
import LoginModal from './LoginModal';

export default function UserButton() {
  const user    = useUserStore((s) => s.user);
  const token   = useUserStore((s) => s.token);
  const logout  = useUserStore((s) => s.logout);
  const refresh = useUserStore((s) => s.refreshUser);

  const [open, setOpen]      = useState(false);
  const [login, setLogin]    = useState(false);
  const wrapRef = useRef(null);

  /* Refresh once on mount if logged in */
  useEffect(() => {
    if (token) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Close dropdown on outside click */
  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    if (open) window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user) {
    return (
      <>
        <button
          onClick={() => setLogin(true)}
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 hover:text-rose-500 transition-colors"
          title="Iniciar sesión">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span className="hidden lg:inline">Iniciar sesión</span>
        </button>
        <button
          onClick={() => setLogin(true)}
          className="sm:hidden text-ink-700 hover:text-rose-500 transition-colors"
          title="Iniciar sesión">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </button>
        <LoginModal open={login} onClose={() => setLogin(false)} />
      </>
    );
  }

  const initials = user.name?.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 group"
        title="Mi cuenta">
        {user.picture ? (
          <img src={user.picture} alt={user.name}
            className="w-8 h-8 rounded-full object-cover border-2 border-cream-200 group-hover:border-rose-400 transition-colors" />
        ) : (
          <span className="w-8 h-8 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center group-hover:bg-rose-600 transition-colors">
            {initials}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-2xl border border-cream-200 overflow-hidden z-50">

            {/* User info */}
            <div className="px-4 py-3.5 bg-cream-50 border-b border-cream-200 flex items-center gap-3">
              {user.picture ? (
                <img src={user.picture} alt={user.name}
                  className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="w-10 h-10 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center">
                  {initials}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-900 truncate">{user.name}</p>
                <p className="text-[10px] text-ink-500 truncate">{user.email}</p>
              </div>
            </div>

            {/* Menu */}
            <div className="py-1">
              <Link to="/mi-cuenta" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-cream-50 transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Mi cuenta
              </Link>
              <Link to="/mi-cuenta?tab=pedidos" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-cream-50 transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1"/>
                </svg>
                Mis pedidos
              </Link>
              <Link to="/favoritos" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-cream-50 transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                Favoritos
              </Link>
            </div>

            <div className="border-t border-cream-200 py-1">
              <button
                onClick={() => { logout(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Cerrar sesión
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
