/* Sentry: archivo separado requerido al inicio asi auto-instrumenta express,
 * http, mongoose ANTES de que se carguen. No-op sin SENTRY_DSN. */
require('./instrument');
const Sentry = require('@sentry/node');

/* ─── Validate required env vars before anything else ─── */
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const OPTIONAL_ENV = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];

const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`❌ Variables de entorno requeridas faltantes: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const missingOptional = OPTIONAL_ENV.filter((k) => !process.env[k]);
if (missingOptional.length) {
  console.warn(`⚠️  Variables opcionales faltantes (uploads de imágenes deshabilitados): ${missingOptional.join(', ')}`);
}

const express       = require('express');
const mongoose      = require('mongoose');
const cors          = require('cors');
const path          = require('path');
const helmet        = require('helmet');
const rateLimit     = require('express-rate-limit');
const mongoSanitize = require('./middleware/sanitize');

const authRoutes          = require('./routes/auth');
const userRoutes          = require('./routes/users');
const productRoutes       = require('./routes/products');
const orderRoutes         = require('./routes/orders');
const cartRoutes          = require('./routes/cart');
const settingsRoutes      = require('./routes/settings');
const reviewsRoutes       = require('./routes/reviews');
const couponsRoutes       = require('./routes/coupons');
const restockRoutes       = require('./routes/restock');
const productReviewRoutes = require('./routes/productReviews');
const chatbotRoutes       = require('./routes/chatbot');
const errorHandler        = require('./middleware/errorHandler');
const { startAbandonedCartJob } = require('./lib/abandonedCartJob');

const app  = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

// Render usa un reverse proxy. Sin esto, express-rate-limit no puede identificar
// usuarios y rate-limit por IP falla. '1' = confiar en 1 hop (el proxy de Render).
app.set('trust proxy', 1);

/* ─── CORS ─── */
// CLIENT_URL  = URL exacta del frontend en producción (sin slash final)
// CLIENT_URL2 = URL alternativa (preview deploys, dominio custom, etc.)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://becurlyfulcr.vercel.app',  // dominio de producción hardcoded como fallback
  process.env.CLIENT_URL,
  process.env.CLIENT_URL2,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Sin origin (browser top-level nav, curl, mobile apps) → permitir.
    // La auth middleware en endpoints admin protege lo que importa.
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    if (isProd) console.warn(`🚫 CORS bloqueado: ${origin}`);
    cb(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));

/* ─── Helmet — security headers ─── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'none'"],
      imgSrc:      ["'self'"],   // solo imágenes propias (uploads)
      connectSrc:  ["'self'"],
      objectSrc:   ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.disable('x-powered-by');

/* ─── Body parsing (tight limit outside uploads) ─── */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* ─── NoSQL injection prevention ─── */
app.use(mongoSanitize);

/* ─── Rate limiters ─── */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 min
  max: 10,                      // 10 intentos por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intentá de nuevo en 15 minutos.' },
  skipSuccessfulRequests: true, // solo cuenta los fallidos
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,          // 1 min
  max: 120,                     // 120 req/min por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Esperá un momento.' },
});

const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,                      // máx 10 órdenes por minuto por IP
  message: { error: 'Demasiados pedidos. Esperá un momento.' },
});

const chatbotLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,                      // 20 mensajes por minuto por IP — protege la cuota gratis de Gemini
  message: { error: 'Demasiados mensajes al asistente. Esperá un momento.' },
});

/* ─── Serve uploads (static files) ─── */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ─── Routes ─── */
app.use('/api/auth',            authLimiter, authRoutes);
app.use('/api/users',           apiLimiter,  userRoutes);
app.use('/api/products',        apiLimiter,  productRoutes);
app.use('/api/orders',          apiLimiter,  orderRoutes);
app.use('/api/cart',            apiLimiter,  cartRoutes);
app.use('/api/settings',        apiLimiter,  settingsRoutes);
app.use('/api/reviews',         apiLimiter,  reviewsRoutes);
app.use('/api/coupons',         apiLimiter,  couponsRoutes);
app.use('/api/restock',         apiLimiter,  restockRoutes);
app.use('/api/product-reviews', apiLimiter,  productReviewRoutes);
app.use('/api/chatbot',         chatbotLimiter, chatbotRoutes);

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

/* SEO: sitemap.xml + robots.txt — sirvelos sin /api para que crawlers los encuentren */
app.get('/sitemap.xml', require('./controllers/productController').sitemap);
app.get('/robots.txt', (req, res) => {
  const SITE_URL = process.env.CLIENT_URL || 'https://becurlyfulcr.vercel.app';
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /checkout',
      'Disallow: /confirmacion',
      'Disallow: /mi-cuenta',
      `Sitemap: ${SITE_URL}/sitemap.xml`,
    ].join('\n') + '\n'
  );
});

/* ─── SSE — real-time admin events ─── */
const jwt = require('jsonwebtoken');
const { addClient } = require('./lib/sse');

app.get('/api/events', (req, res) => {
  // Token via query param is unavoidable for SSE; mitigate by verifying and short-circuiting fast
  const token = req.query.token;
  if (!token || typeof token !== 'string' || token.length > 512) {
    return res.status(401).end();
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).end();
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write('event: connected\ndata: {}\n\n');
  addClient(res);
});

/* ─── 404 ─── */
app.use((req, res) =>
  res.status(404).json({ error: 'Ruta no encontrada' })
  // Never expose req.path in production to avoid path disclosure
);

/* Sentry: hook al stream de errores de Express ANTES del errorHandler propio.
 * No-op si no se llamo a Sentry.init() (sin SENTRY_DSN). */
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

/* ─── Error handler ─── */
app.use(errorHandler);

/* ─── DB + Server ─── */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
    app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
    /* Cron de carritos abandonados — arranca solo despues de tener DB.
     * El job mismo respeta SMTP/Brevo (si no estan configurados, sendWithProvider
     * falla silencioso y no marca el cart como enviado, lo retomara la proxima). */
    startAbandonedCartJob();
  })
  .catch((err) => {
    console.error('❌ Error al conectar MongoDB:', err.message);
    process.exit(1);
  });
