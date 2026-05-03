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
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.28, ease: [0.3, 1, 0.3, 1] }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[380px] overflow-hidden my-auto"
              onClick={(e) => e.stopPropagation()}>

              {/* Close button */}
              <button onClick={onClose}
                aria-label="Cerrar"
                className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full text-ink-400 hover:text-ink-900 hover:bg-cream-100 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              {/* Header — editorial, no icon box */}
              <div className="px-7 pt-9 pb-5">
                {/* Brand accent line */}
                <div className="flex items-center gap-2 mb-5">
                  <span className="block w-8 h-px bg-rose-400" />
                  <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-rose-500">JD Virtual</span>
                </div>

                <h3 className="font-display text-2xl font-bold text-ink-900 leading-[1.1] tracking-tight pr-6">
                  {title}
                </h3>
                <p className="text-[13px] text-ink-500 leading-relaxed mt-2">
                  {subtitle}
                </p>
              </div>

              {/* Divider */}
              <div className="mx-7 border-t border-cream-100" />

              {/* Body */}
              <div className="px-7 pt-5 pb-6 space-y-5">
                {/* Google button */}
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error('No se pudo iniciar sesión con Google')}
                    size="large"
                    shape="pill"
                    text="signin_with"
                    locale="es"
                    theme="outline"
                    width="290"
                  />
                </div>

                {loading && (
                  <p className="text-center text-xs text-ink-500 flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Iniciando sesión…
                  </p>
                )}

                {/* Benefits — refined list */}
                <ul className="space-y-2 pt-1">
                  {[
                    'Tu historial de pedidos en un solo lugar',
                    'Reseñas verificadas con tu cuenta',
                    'Checkout más rápido en tu próxima compra',
                  ].map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[12px] text-ink-700 leading-snug">
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-rose-50 flex items-center justify-center mt-px">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>

                {/* Privacy footnote */}
                <div className="pt-3 border-t border-cream-100">
                  <p className="text-[10px] text-ink-400 leading-relaxed flex items-start gap-1.5">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-px text-ink-300">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Solo accedemos a tu nombre, email y foto de perfil. Nunca compartimos tus datos.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
