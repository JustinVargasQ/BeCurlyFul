import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow]     = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      const dismissed = sessionStorage.getItem('pwa-dismissed');
      if (!dismissed) setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setShow(false);
  };

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem('pwa-dismissed', '1');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-40 sm:left-auto sm:right-5 sm:w-80">
          <div className="bg-white rounded-2xl shadow-modal border border-cream-100 p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
              <img src="/icons/icon-192.png" alt="Be Curly Full CR" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-900">Instalar Be Curly Full CR</p>
              <p className="text-xs text-ink-400">Agregá la tienda a tu pantalla de inicio</p>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button onClick={install}
                className="text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg transition-colors">
                Instalar
              </button>
              <button onClick={dismiss}
                className="text-xs text-ink-400 hover:text-ink-700 text-center transition-colors">
                Ahora no
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
