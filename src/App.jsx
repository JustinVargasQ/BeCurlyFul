import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { trackPageView } from './lib/analytics';
import CartDrawer from './components/layout/CartDrawer';
import Toaster from './components/ui/Toaster';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import Confirmation from './pages/Confirmation';
import OrderTracking from './pages/OrderTracking';
import Wishlist from './pages/Wishlist';
import MiCuenta from './pages/MiCuenta';
import Offers from './pages/Offers';
import HowToBuy from './pages/HowToBuy';
import Privacy from './pages/Privacy';

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

function AdminSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
    </div>
  );
}
import useAuthStore from './store/authStore';
import InstallBanner from './components/ui/InstallBanner';
import PromoBanner from './components/ui/PromoBanner';
import ServerWakeup from './components/ui/ServerWakeup';
import ChatbotWidget from './components/ui/ChatbotWidget';
import ErrorBoundary from './components/ui/ErrorBoundary';

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
      <InstallBanner />
      <ErrorBoundary label="ChatbotWidget"><ChatbotWidget /></ErrorBoundary>
      <PageTracker />
      <Routes>
        {/* Public storefront */}
        <Route path="/" element={<StorefrontLayout><Home /></StorefrontLayout>} />
        <Route path="/producto/:slug" element={<StorefrontLayout><ProductDetail /></StorefrontLayout>} />
        <Route path="/checkout" element={<StorefrontLayout><Checkout /></StorefrontLayout>} />
        <Route path="/confirmacion" element={<StorefrontLayout><Confirmation /></StorefrontLayout>} />
        <Route path="/favoritos" element={<StorefrontLayout><Wishlist /></StorefrontLayout>} />
        <Route path="/mi-cuenta" element={<StorefrontLayout><MiCuenta /></StorefrontLayout>} />
        <Route path="/ofertas" element={<StorefrontLayout><Offers /></StorefrontLayout>} />
        <Route path="/pedido" element={<StorefrontLayout><OrderTracking /></StorefrontLayout>} />
        <Route path="/pedido/:number" element={<StorefrontLayout><OrderTracking /></StorefrontLayout>} />
        <Route path="/como-comprar" element={<StorefrontLayout><HowToBuy /></StorefrontLayout>} />
        <Route path="/privacidad" element={<StorefrontLayout><Privacy /></StorefrontLayout>} />

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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
