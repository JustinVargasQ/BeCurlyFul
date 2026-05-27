# JD Virtual Store — Contexto del Proyecto

> Tienda online de maquillaje y skincare para Costa Rica. Desarrollada por **VO Studio** (Justin Vargas) como caso de éxito para JD Virtual.
> Producción: https://jd-virtual.vercel.app

---

## 1. Stack técnico

### Frontend
- **Vite 8** + React 19 + JSX
- **TailwindCSS 3.4** + componentes custom
- **Framer Motion 12** para animaciones
- **Zustand 5** para estado global (cart, wishlist, auth, chatbot, toast)
- **React Router 7**, React Helmet Async, Axios
- **Vercel Analytics** + **Speed Insights**
- **Sentry React** para error monitoring

### Backend (`server/`)
- **Node + Express 5** corriendo en **Render**
- **MongoDB Atlas** + Mongoose 9
- **JWT** para admin auth, **Google OAuth** para usuarios
- **Cloudinary** para imágenes (uploads + delivery)
- **Brevo** o **Gmail SMTP** vía Nodemailer para emails
- **Google Gemini** (`@google/generative-ai`) para chatbot
- **Sentry Node** para error monitoring
- **express-rate-limit** + **helmet** + sanitize middleware

### Deploys
- **Frontend** → Vercel (auto-deploy desde `main`)
- **Backend** → Render (auto-deploy desde `main`)
- **Dominios**: `jd-virtual.vercel.app` (actual) → plan migrar a `jdvirtual.com`

---

## 2. Estructura del repo

```
JdVirtual/
├── src/                          # Frontend Vite
│   ├── pages/                    # Home, ProductDetail, Checkout, Confirmation,
│   │                             # Offers, Wishlist, HowToBuy, MiCuenta, OrderTracking,
│   │                             # Apartados, Privacy, NotFound, admin/*
│   ├── components/
│   │   ├── layout/               # Navbar, Footer, CartDrawer
│   │   └── ui/                   # ProductCard, KitBuilder, ChatbotWidget,
│   │                             # MapAddressPicker, SEO, ErrorBoundary, etc.
│   ├── store/                    # cartStore, wishlistStore, authStore,
│   │                             # chatStore, toastStore, userStore
│   ├── hooks/                    # useCart, useWishlist, useProducts, etc.
│   ├── lib/                      # api, currency, whatsapp, analytics, etc.
│   └── main.jsx                  # Entry — init Sentry, providers
├── server/
│   ├── controllers/              # orderController, productController,
│   │                             # chatbotController, settingsController, etc.
│   ├── routes/                   # /api/auth, /api/orders, /api/cart, etc.
│   ├── models/                   # Order, Product, User, Cart, Settings, Coupon, Admin
│   ├── lib/                      # mailer, abandonedCartJob, sse
│   ├── middleware/               # auth, userAuth, upload, errorHandler, sanitize
│   ├── instrument.js             # Sentry init (cargado primero)
│   └── index.js                  # Entry — express, mongo, routes, cron
├── public/                       # sitemap.xml, robots.txt, sw.js, icons, imgs
└── vercel.json                   # Headers de seguridad + rewrites
```

---

## 3. Features principales

### Catálogo y productos
- Productos con `variants` (Tono, Color, Tamaño) — cada opción puede tener su imagen propia
- Stock tracked en tiempo real con SSE broadcast (`low-stock`, `out-of-stock`)
- Categorías: skincare, maquillaje, accesorios, perfumes, cabello, ofertas
- Búsqueda con sugerencias debounced
- Filtros por marca, precio, ordenamiento

### Carrito y checkout
- **Carrito persistido** en localStorage (Zustand persist v2)
- Líneas separadas por variante: mismo producto con tono distinto = 2 lineas
- Cupones con validación server-side (anti-tampering)
- **Método de pago**: WhatsApp (default) o SINPE Móvil (preferencia, no procesa pago en sitio)
- **Envío**: Correos / Express Puntarenas / Retiro en El Roble (todos con costos editables desde admin)
- **Dirección con mapa**: 2 pasos — texto con señas + GPS exacto (Google Maps API)

### Pago SINPE — DECISIÓN DE NEGOCIO
**No se procesa pago en el sitio** porque el stock online puede no coincidir con el físico. Flujo:
1. Cliente elige SINPE como preferencia (solo radio, sin panel)
2. Submit → se abre WhatsApp con el pedido (incluye "Método de pago: SINPE Móvil")
3. Staff verifica stock físico
4. Staff envía el número SINPE manualmente por WhatsApp
5. Cliente paga, staff marca "Cobrado" en admin

### Kit Builder
- Cliente arma un set por categoría con presupuesto
- Barra de progreso en tiempo real
- Multi-item por slot (ej: 2 bases distintas)
- Persiste en localStorage entre sesiones
- Modal de preview por producto con selector de variantes

### Wishlist (favoritos)
- Persistido en localStorage
- `/favoritos` con noindex (es página personal)

### Admin (`/admin`)
- **Login JWT** + role-based access
- **Productos**: CRUD con upload a Cloudinary, variants editables
- **Pedidos**: ver detalle con productos+variantes, cambiar estado, marcar cobrado, imprimir
- **Cupones**: códigos con tipos (fixed, percentage, shipping), usos máximos, expiración
- **Config**: editar settings de la tienda (envío, hero, banner, SINPE info, autoConfirmOrders)
- **Reseñas**: moderar reviews
- **Chat insights**: ver historial de chatbot
- **Dashboard**: stats, gráfico de ventas, top productos

### Abandoned Cart Recovery
- Cliente entra al checkout y tipea email → se guarda snapshot en Mongo (debounced 2s)
- Cron job cada 1h busca carts >1h sin orden asociada
- Envía email rose-gold con items + CTA "Volver a mi carrito"
- 1 email por carrito de por vida (no spam)
- Cross-check con orders recientes para no molestar a quien ya compró
- TTL 14 días en la colección Cart

### Chatbot IA (Gemini)
- Widget flotante en `right-5 bottom-6` (z-55), panel fullscreen mobile / esquina derecha desktop
- Lazy-loaded después del primer paint
- Markers especiales en respuestas: `[[slug-producto]]`, `[[combo: slug1,slug2]]`, `[[link: Texto|/ruta]]`, `[[sug: opt1 | opt2]]`
- Integración con cart (agregar desde chat)
- Persiste mensajes por dispositivo
- Rate limit 20/min/IP

### SEO
- `SEO.jsx` component con React Helmet — title, meta description, OG, Twitter, canonical
- **LocalBusiness JSON-LD** en home (dirección, teléfono, horario, áreas)
- **Product JSON-LD** en producto (con AggregateRating si hay reviews)
- `sitemap.xml` + `robots.txt` (Disallow /admin, /checkout, /favoritos, /pedido, etc.)
- noindex en páginas personales (`/favoritos`, `/pedido`)

### Email transaccional
- **Confirmación a cliente** al crear orden (con productos + variantes)
- **Notificación al admin** (a `notificationEmail` configurable)
- **Cambio de estado** al cliente (pendiente → confirmado → preparando → enviado → entregado)
- **Recuperación de carrito** (cron job)
- Fallback Brevo → SMTP → silent fail (no rompe el flow del pedido)

---

## 4. Seguridad y operaciones

### Headers (vercel.json)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- HSTS preload
- Permissions-Policy restrictivo
- Referrer-Policy: strict-origin-when-cross-origin
- ❌ CSP no implementado (riesgo de romper Maps/Brevo/Analytics)

### Backend
- **Rate limits**:
  - `/api/orders` POST: 6/hora/IP (anti-bot)
  - `/api/orders` global: 120/min/IP
  - `/api/cart/save`: 30/min/IP
  - `/api/auth`: stricter para evitar brute-force
  - `/api/chatbot`: 20/min/IP (protege cuota Gemini free)
- **Mongo sanitize** middleware (anti-injection en queries)
- **JWT** rotation: 8h admin, 30d users
- **Helmet** habilitado (defaults seguros)
- **Trust proxy** = 1 (Render reverse proxy)

### Backups
- ⚠️ **Pendiente**: configurar backups automáticos de Mongo Atlas (settings del cluster)

---

## 5. Variables de entorno

### Frontend (`.env` / Vercel env)
```
VITE_API_URL=https://jdvirtual.onrender.com/api
VITE_GOOGLE_MAPS_KEY=AIza...
VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
VITE_SENTRY_DSN=https://...@o....ingest.us.sentry.io/...
```

### Backend (`server/.env` / Render env)
```
PORT=4000
MONGO_URI=mongodb+srv://...
JWT_SECRET=<random 64+ chars>
JWT_EXPIRES=8h
JWT_USER_EXPIRES=30d
NODE_ENV=production
CLIENT_URL=https://jd-virtual.vercel.app

ADMIN_EMAIL=...
ADMIN_PASSWORD=...

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

GOOGLE_MAPS_KEY=...
GOOGLE_PLACE_ID=...
GOOGLE_CLIENT_ID=...

GEMINI_API_KEY=...

EMAIL_PROVIDER=smtp        # o brevo
SMTP_USER=...
SMTP_PASS=...              # App Password de Gmail, NO el password real
BREVO_API_KEY=...          # opcional, fallback
BREVO_SENDER_EMAIL=...

SENTRY_DSN=https://...@o....ingest.us.sentry.io/...
```

---

## 6. Comandos útiles

### Desarrollo
```bash
# Frontend (root del proyecto)
npm run dev          # vite dev en :5173
npm run build        # build de prod
npm run preview      # preview del build local
npm run lint         # eslint

# Backend
cd server
npm run dev          # nodemon
npm start            # node prod
npm run seed         # cargar productos hardcoded en Mongo
```

### Verificación operativa
```bash
# Sentry test (frontend)
# DevTools console: throw new Error('Sentry test')

# Cart cron manual (server)
node -e "require('./lib/abandonedCartJob').runAbandonedCartCheck().then(console.log)"

# SMTP test
# Admin → Config → "Probar email"
```

---

## 7. Convenciones de código (CLAUDE.md activo)

- **Sin emojis** en commits/código a menos que el user los pida explícitamente
- **Comentarios solo cuando el "por qué" no es obvio** (no narrar el "qué")
- **Nada de docstrings de varias líneas** en JS
- **Markdown links** para referencias a archivos: `[Checkout.jsx:38](src/pages/Checkout.jsx#L38)`
- **PowerShell** para shell commands en Windows (no bash)
- **Branch único** `main`, commits con `Co-Authored-By: Claude Opus 4.7`

---

## 8. Issues conocidos / pendientes

- [ ] **Backups automáticos** de Mongo Atlas (free tier no incluye, considerar paid o snapshots manuales)
- [ ] **CSP header** en vercel.json (necesita auditoría de scripts third-party)
- [ ] **A11y**: revisar contraste en estados disabled, ARIA landmarks en layouts
- [ ] **`buildStatusHtml`** (email cambio de estado) no incluye items — no es crítico pero podría
- [ ] **Pago en línea real** (Tilopay/GreenPay) — futuro upgrade, hoy se coordina por WA
- [ ] **Migración a dominio jdvirtual.com** — pendiente compra + DNS
- [ ] **`ChatbotWidget.jsx` y `KitBuilder.jsx`** son archivos grandes (>900 líneas) — refactor a sub-componentes sería buen housekeeping

---

## 9. Historial de cambios mayores (sesiones de Claude)

### Vercel Analytics + Speed Insights
- `@vercel/analytics` y `@vercel/speed-insights` integrados en `main.jsx`

### Variantes end-to-end
- `selectedVariants` ahora se persiste desde cart → checkout → server → admin → emails
- Cart store v2: líneas separadas por combinación producto+variantes

### KitBuilder mobile UX
- Modal con imagen `38dvh` + `object-contain` (no se corta)
- Bottom sheet con `right-20` para no chocar con botón flotante IA
- Modal preview con selector de variantes embebido

### Map Address Picker refactor
- Pre-step + map picker rediseñados con gradiente rose-gold, tips inline, footer fijo
- Chips de categoría con scroll horizontal funcional en mobile

### SEO
- LocalBusiness JSON-LD
- noindex en páginas personales
- Meta tags en `/ofertas`
- Sitemap y robots actualizados

### Performance
- Lazy-load ChatbotWidget (chunk async)
- Deps no usadas removidas (three, remotion, swiper, gsap)
- `<img width/height>` en ProductCard para fix CLS

### A11y
- aria-labels en botones de iconos (Navbar, ProductCard, CartDrawer)
- Focus-visible global con box-shadow rose-300 (sigue border-radius)

### Sentry
- Frontend: `@sentry/react` en `main.jsx`, integrado al ErrorBoundary
- Backend: `@sentry/node` en `server/instrument.js` (cargado primero)
- Tracing desactivado (Speed Insights cubre frontend, free tier tight)

### Abandoned Cart Recovery
- Cart model con TTL 14d
- `POST /api/cart/save` desde checkout (debounced)
- Cron hourly (`setInterval`) busca abandonados >1h y envía email
- Cross-check con orders recientes
- Marca `convertedToOrder: true` al crear Order

### SINPE Móvil
- 3 iteraciones:
  1. Panel completo con QR + bancos + comprobante upload
  2. Quitar QR (no estándar en CR) + bancos con SMS BN + apps best-effort
  3. **Final**: solo radio sin panel — coordinación 100% por WhatsApp después de verificar stock
- Settings model con `sinpePhone`/`sinpeName` (admin internal use)
- Admin Orders PaymentBlock con flag "Cobrado" / "Coordinando"

---

## 10. Pitch comercial (referencia)

**Valor de mercado**: $1,500 USD (rango agencia local CR)
**Precio caso de éxito**: $500 USD (3 marcas piloto para lanzamiento de e-commerce VO Studio)

**Diferenciadores frente a la web actual de la clienta (`jdvirtualstore.net`)**:
- Velocidad real en mobile (Speed Insights tracking continuo)
- SEO posicionado: "jd virtual" en primeros resultados
- Kit Builder (sube ticket promedio)
- Panel admin desde celular
- Chatbot IA filtra dudas antes del WhatsApp
- Migración a dominio .com incluida

---

*Última actualización: 2026-05-26*
