import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import BottomNav from './components/layout/BottomNav';
import { trackPageView } from './lib/analytics';
import CartDrawer from './components/layout/CartDrawer';
import Toaster from './components/ui/Toaster';
import FlyToCart from './components/ui/FlyToCart';
// Home se mantiene eager — es la página de entrada, queremos que aparezca
// instantáneamente sin chunk delay. El resto se lazy-loadea.
import Home from './pages/Home';
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Checkout      = lazy(() => import('./pages/Checkout'));
const Confirmation  = lazy(() => import('./pages/Confirmation'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const Wishlist      = lazy(() => import('./pages/Wishlist'));
const MiCuenta      = lazy(() => import('./pages/MiCuenta'));
const Offers        = lazy(() => import('./pages/Offers'));
const HowToBuy      = lazy(() => import('./pages/HowToBuy'));
const Privacy       = lazy(() => import('./pages/Privacy'));
const Apartados     = lazy(() => import('./pages/Apartados'));
const NotFound      = lazy(() => import('./pages/NotFound'));

// Admin chunks — lazy so end users (the 99% who never visit /admin) don't
// download this code on first load. Cuts the initial bundle ~30%.
const AdminLogin         = lazy(() => import('./pages/admin/Login'));
const AdminDashboard     = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts      = lazy(() => import('./pages/admin/Products'));
const AdminProductForm   = lazy(() => import('./pages/admin/ProductForm'));
const AdminOrders        = lazy(() => import('./pages/admin/Orders'));
const AdminCoupons       = lazy(() => import('./pages/admin/Coupons'));
const AdminConfig        = lazy(() => import('./pages/admin/Config'));
const AdminReviews       = lazy(() => import('./pages/admin/Reviews'));
const AdminChatInsights  = lazy(() => import('./pages/admin/ChatInsights'));

/* Storefront skeleton — silueta neutral con padding del navbar para que cuando
 * cargue el chunk, la página real reemplace exactamente la misma silueta. */
function PageSkeleton() {
  return (
    <main className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="animate-pulse space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="h-8 w-2/3 max-w-md bg-cream-100 rounded-lg" />
          <div className="h-4 w-1/2 max-w-sm bg-cream-100 rounded" />
        </div>
        {/* Hero / first content block */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="aspect-square bg-cream-100 rounded-2xl" />
          <div className="space-y-3 py-4">
            <div className="h-4 w-1/3 bg-cream-100 rounded" />
            <div className="h-7 w-full bg-cream-100 rounded" />
            <div className="h-7 w-5/6 bg-cream-100 rounded" />
            <div className="h-3 w-2/3 bg-cream-100 rounded mt-4" />
            <div className="h-3 w-3/4 bg-cream-100 rounded" />
            <div className="h-3 w-1/2 bg-cream-100 rounded" />
            <div className="h-12 w-full bg-cream-100 rounded-xl mt-6" />
          </div>
        </div>
      </div>
    </main>
  );
}

/* Skeleton vs spinner: pinta la silueta de la página para que no se sienta como
 * "pantalla en blanco". Mide ~40vh. */
function AdminSpinner() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-cream-100 rounded-lg" />
          <div className="h-3 w-32 bg-cream-100 rounded" />
        </div>
        <div className="h-10 w-32 bg-cream-100 rounded-xl" />
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-cream-100 rounded-xl" />
        ))}
      </div>
      {/* Content */}
      <div className="bg-cream-50 rounded-2xl border border-cream-100 p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cream-100 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-cream-100 rounded w-1/2" />
              <div className="h-2.5 bg-cream-100 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import useAuthStore from './store/authStore';
import InstallBanner from './components/ui/InstallBanner';
import PromoBanner from './components/ui/PromoBanner';
import ServerWakeup from './components/ui/ServerWakeup';
import ErrorBoundary from './components/ui/ErrorBoundary';
// ChatbotWidget = 1000+ lineas (~40KB gz). Sacarlo del entry baja el bundle
// inicial; el boton flotante aparece despues del primer render via Suspense.
const ChatbotWidget = lazy(() => import('./components/ui/ChatbotWidget'));

function StorefrontLayout({ children }) {
  const location = useLocation();
  return (
    <>
      <PromoBanner />
      <Navbar />
      <CartDrawer />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}>
          {children}
        </motion.div>
      </AnimatePresence>
      <Footer />
      <BottomNav />
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function PageTracker() {
  const location = useLocation();
  useEffect(() => { trackPageView(location.pathname + location.search); }, [location]);
  return null;
}

function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ServerWakeup />
      <Toaster />
      <FlyToCart />
      <InstallBanner />
      <ErrorBoundary label="ChatbotWidget">
        <Suspense fallback={null}><ChatbotWidget /></Suspense>
      </ErrorBoundary>
      <PageTracker />
      <Routes>
        {/* Public storefront — Home eager (entry), resto lazy con skeleton */}
        <Route path="/" element={<StorefrontLayout><Home /></StorefrontLayout>} />
        <Route path="/producto/:slug" element={<StorefrontLayout><Suspense fallback={<PageSkeleton />}><ProductDetail /></Suspense></StorefrontLayout>} />
        <Route path="/checkout" element={<StorefrontLayout><Suspense fallback={<PageSkeleton />}><Checkout /></Suspense></StorefrontLayout>} />
        <Route path="/confirmacion" element={<StorefrontLayout><Suspense fallback={<PageSkeleton />}><Confirmation /></Suspense></StorefrontLayout>} />
        <Route path="/favoritos" element={<StorefrontLayout><Suspense fallback={<PageSkeleton />}><Wishlist /></Suspense></StorefrontLayout>} />
        <Route path="/mi-cuenta" element={<StorefrontLayout><Suspense fallback={<PageSkeleton />}><MiCuenta /></Suspense></StorefrontLayout>} />
        <Route path="/ofertas" element={<StorefrontLayout><Suspense fallback={<PageSkeleton />}><Offers /></Suspense></StorefrontLayout>} />
        <Route path="/pedido" element={<StorefrontLayout><Suspense fallback={<PageSkeleton />}><OrderTracking /></Suspense></StorefrontLayout>} />
        <Route path="/pedido/:number" element={<StorefrontLayout><Suspense fallback={<PageSkeleton />}><OrderTracking /></Suspense></StorefrontLayout>} />
        <Route path="/como-comprar" element={<StorefrontLayout><Suspense fallback={<PageSkeleton />}><HowToBuy /></Suspense></StorefrontLayout>} />
        <Route path="/privacidad" element={<StorefrontLayout><Suspense fallback={<PageSkeleton />}><Privacy /></Suspense></StorefrontLayout>} />
        <Route path="/apartados" element={<StorefrontLayout><Suspense fallback={<PageSkeleton />}><Apartados /></Suspense></StorefrontLayout>} />

        {/* Admin — lazy-loaded behind a Suspense fallback */}
        <Route path="/admin/login" element={<Suspense fallback={<AdminSpinner />}><AdminLogin /></Suspense>} />
        <Route path="/admin" element={<RequireAuth><Suspense fallback={<AdminSpinner />}><AdminDashboard /></Suspense></RequireAuth>}>
          <Route path="productos"              element={<Suspense fallback={<AdminSpinner />}><AdminProducts /></Suspense>} />
          <Route path="productos/nuevo"        element={<Suspense fallback={<AdminSpinner />}><AdminProductForm /></Suspense>} />
          <Route path="productos/:id/editar"   element={<Suspense fallback={<AdminSpinner />}><AdminProductForm /></Suspense>} />
          <Route path="ordenes"                element={<Suspense fallback={<AdminSpinner />}><AdminOrders /></Suspense>} />
          <Route path="cupones"                element={<Suspense fallback={<AdminSpinner />}><AdminCoupons /></Suspense>} />
          <Route path="resenas"                element={<Suspense fallback={<AdminSpinner />}><AdminReviews /></Suspense>} />
          <Route path="chatbot"                element={<Suspense fallback={<AdminSpinner />}><AdminChatInsights /></Suspense>} />
          <Route path="config"                 element={<Suspense fallback={<AdminSpinner />}><AdminConfig /></Suspense>} />
        </Route>

        {/* 404 — keep the URL the user landed on so they can fix it themselves */}
        <Route path="*" element={<StorefrontLayout><Suspense fallback={<PageSkeleton />}><NotFound /></Suspense></StorefrontLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
