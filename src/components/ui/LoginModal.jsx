import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import useUserStore from '../../store/userStore';
import useToastStore from '../../store/toastStore';

export default function LoginModal({ open, onClose, title = 'Iniciá sesión', subtitle = 'Para guardar tus pedidos y dejar reseñas' }) {
  const loginWithGoogle = useUserStore((s) => s.loginWithGoogle);
  const loading         = useUserStore((s) => s.loading);
  const toast           = useToastStore();

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handleGoogleSuccess = async ({ credential }) => {
    if (!credential) return;
    const result = await loginWithGoogle(credential);
    if (result.ok) {
      toast.success(`¡Hola, ${result.user.name.split(' ')[0]}! 👋`);
      onClose();
    } else {
      toast.error(result.error || 'No se pudo iniciar sesión');
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] overflow-y-auto bg-black/65 backdrop-blur-sm"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={onClose}>

          {/* Centering wrapper — full viewport, scrollable on small screens */}
          <div className="min-h-screen flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.3, 1, 0.3, 1] }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden my-auto"
              onClick={(e) => e.stopPropagation()}>

              {/* Close button */}
              <button onClick={onClose}
                aria-label="Cerrar"
                className="absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-cream-100 text-ink-400 hover:text-ink-700 transition-colors shadow-sm border border-cream-100">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              {/* Compact header */}
              <div className="px-5 sm:px-6 pt-6 pb-3 flex items-center gap-3 pr-12">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,rgba(184,95,114,.15),rgba(201,168,117,.1))', border: '1px solid rgba(184,95,114,.2)' }}>
                  ✨
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base sm:text-lg font-bold text-ink-900 leading-tight">{title}</h3>
                  <p className="text-[11px] sm:text-xs text-ink-500 leading-snug mt-0.5">{subtitle}</p>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 sm:px-6 pb-5 pt-2 space-y-3">
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error('No se pudo iniciar sesión con Google')}
                    size="large"
                    shape="pill"
                    text="signin_with"
                    locale="es"
                    theme="outline"
                    width="260"
                  />
                </div>

                {loading && (
                  <p className="text-center text-xs text-ink-500 flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Iniciando sesión...
                  </p>
                )}

                {/* Benefits — inline icons row */}
                <div className="bg-cream-50 rounded-xl px-3 py-2.5">
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div className="px-1">
                      <p className="text-base mb-0.5">📦</p>
                      <p className="text-[9px] text-ink-600 leading-tight font-medium">Tus pedidos</p>
                    </div>
                    <div className="px-1">
                      <p className="text-base mb-0.5">⭐</p>
                      <p className="text-[9px] text-ink-600 leading-tight font-medium">Reseñas</p>
                    </div>
                    <div className="px-1">
                      <p className="text-base mb-0.5">⚡</p>
                      <p className="text-[9px] text-ink-600 leading-tight font-medium">Más rápido</p>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-ink-400 text-center">
                  Solo guardamos nombre, email y foto.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
