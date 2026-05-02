import { useEffect } from 'react';
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.3, 1, 0.3, 1] }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="relative px-6 pt-7 pb-4 text-center">
              <button onClick={onClose}
                className="absolute top-3 right-3 p-1.5 hover:bg-cream-50 rounded-lg text-ink-400 hover:text-ink-700 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl"
                style={{ background: 'linear-gradient(135deg,rgba(184,95,114,.15),rgba(201,168,117,.1))', border: '1px solid rgba(184,95,114,.2)' }}>
                ✨
              </div>
              <h3 className="font-display text-xl font-bold text-ink-900 leading-tight">{title}</h3>
              <p className="text-xs text-ink-500 mt-1.5 leading-relaxed max-w-sm mx-auto">{subtitle}</p>
            </div>

            {/* Body */}
            <div className="px-6 pb-6 pt-2 space-y-4">
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('No se pudo iniciar sesión con Google')}
                  size="large"
                  shape="pill"
                  text="signin_with"
                  locale="es"
                  theme="outline"
                  width="320"
                />
              </div>

              {loading && (
                <p className="text-center text-xs text-ink-500 flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Iniciando sesión...
                </p>
              )}

              {/* Benefits */}
              <div className="bg-cream-50 rounded-xl p-3.5 space-y-1.5 mt-2">
                <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest mb-2">Al iniciar sesión</p>
                {[
                  '📦 Guardamos tu historial de pedidos',
                  '⭐ Podés dejar reseñas verificadas',
                  '⚡ Checkout más rápido',
                ].map((b, i) => (
                  <p key={i} className="text-xs text-ink-700">{b}</p>
                ))}
              </div>

              <p className="text-[10px] text-ink-400 text-center leading-relaxed">
                Solo guardamos tu nombre, email y foto. Nunca compartimos tus datos.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
