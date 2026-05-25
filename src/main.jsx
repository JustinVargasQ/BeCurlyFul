import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/* Sentry — solo se inicia si VITE_SENTRY_DSN esta seteado. Asi en dev local
 * sin DSN no manda nada; en prod (Vercel env vars) captura errores de render,
 * unhandled rejections, fetch fails, etc. tracesSampleRate=0 desactiva
 * performance tracing (Speed Insights ya cubre eso y Sentry free tier es
 * limitado a 5k errores/mes — no quema cuota en traces). */
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    // Scrub PII por default (emails, telefonos en breadcrumbs)
    sendDefaultPii: false,
    // Ignorar ruido tipico de extensiones de browser / scripts third-party
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
    ],
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <HelmetProvider>
        <App />
        <Analytics />
        <SpeedInsights />
      </HelmetProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
