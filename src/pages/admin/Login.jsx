import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function AdminLogin() {
  const [form, setForm]   = useState({ email: 'admin@becurlyful.cr', password: '' });
  const [show, setShow]   = useState(false);
  const { login, error, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(form.email, form.password);
    if (ok) navigate('/admin');
  };

  return (
    <div className="min-h-screen flex">

      {/* Left — brand panel (desktop only) */}
      <div className="hidden lg:flex w-1/2 bg-ink-900 flex-col items-center justify-center relative overflow-hidden p-14">
        {/* Ambient orbs */}
        <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="absolute -bottom-16 right-0 w-64 h-64 rounded-full bg-rose-400/10 blur-3xl" />
        {/* Sparkle dots */}
        {[{x:'12%',y:'22%'},{x:'85%',y:'18%'},{x:'75%',y:'75%'},{x:'20%',y:'78%'}].map((p,i)=>(
          <div key={i} className="absolute w-1 h-1 rounded-full bg-rose-400/50"
            style={{ left:p.x, top:p.y }} />
        ))}
        <div className="relative z-10 text-center">
          <img src="/icons/logo.jpg" alt="Be Curly Full CR" className="h-16 w-auto rounded-xl mx-auto mb-3" />
          <p className="text-white/40 text-sm tracking-[0.22em] uppercase mb-10">Panel de administración</p>
          <div className="w-16 h-px bg-rose-500/40 mx-auto mb-10" />
          <div className="space-y-4">
            {[
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>, text: 'Gestión de productos' },
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>, text: 'Control de órdenes' },
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, text: 'Configuración del sitio' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-300 flex-shrink-0"
                  style={{ background: 'rgba(232,121,160,0.15)' }}>
                  {f.icon}
                </div>
                <p className="text-white/60 text-sm">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center bg-cream-50 px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <p className="font-display text-3xl font-semibold text-ink-900">
              Be Curlyful <span className="text-rose-500">Admin</span>
            </p>
            <p className="text-ink-400 text-sm mt-1">Panel de administración</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h1 className="font-display text-2xl font-semibold text-ink-900">Bienvenida de vuelta</h1>
            <p className="text-ink-400 text-sm mt-1">Ingresá para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-7 space-y-5">
            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Email</label>
              <input
                type="email" required value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="admin@becurlyful.cr"
                className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Contraseña</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'} required value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full border border-cream-200 rounded-xl px-4 py-3 pr-11 text-sm text-ink-900 placeholder-ink-300 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all bg-white"
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600 transition-colors">
                  {show
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors shadow-btn flex items-center justify-center gap-2">
              {loading
                ? <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Ingresando...</>
                : 'Ingresar'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
