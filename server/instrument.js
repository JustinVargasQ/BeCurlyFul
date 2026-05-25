/* Sentry init — debe ser el PRIMER require del proceso para que pueda
 * auto-instrumentar express, http, mongoose, etc. ANTES de que esos modulos
 * se carguen. Si SENTRY_DSN no esta seteado, todo el SDK queda no-op. */
require('dotenv').config();
const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Performance tracing desactivado — Speed Insights del frontend ya cubre
    // performance del cliente; en backend no necesitamos quemar la cuota free
    // de Sentry (5k errores/mes) en spans HTTP rutinarios.
    tracesSampleRate: 0,
    // sendDefaultPii=false: la tienda maneja emails, telefonos y direcciones
    // de clientes. Sin PII Sentry sigue capturando stack traces completos,
    // solo evita que datos personales viajen en breadcrumbs/IPs.
    sendDefaultPii: false,
  });
}
