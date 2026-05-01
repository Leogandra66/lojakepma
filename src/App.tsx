import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import Index from "./pages/Index";
import HistoriaKepma from "./pages/HistoriaKepma";
import ComoFunciona from "./pages/ComoFunciona";
import ConhecaFabrica from "./pages/ConhecaFabrica";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Checkout from "./pages/Checkout";
import PaymentReturn from "./pages/PaymentReturn";
import MyAccount from "./pages/MyAccount";
import NotFound from "./pages/NotFound";
import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminPayments from "./pages/admin/AdminPayments";
import WhatsAppFloatingButton from "./components/WhatsAppFloatingButton";
import Unsubscribe from "./pages/Unsubscribe";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import { usePageTracking } from "./hooks/usePageTracking";

// Componente para rolar ao topo quando a rota muda
function ScrollToTop() {
  const { pathname } = useLocation();
  usePageTracking();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/historia" element={<HistoriaKepma />} />
              <Route path="/como-funciona" element={<ComoFunciona />} />
              <Route path="/conheca-a-fabrica" element={<ConhecaFabrica />} />
              <Route path="/produto/:id" element={<ProductDetail />} />
              <Route path="/carrinho" element={<Cart />} />
              <Route path="/entrar" element={<Auth />} />
              <Route path="/recuperar-senha" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/pagamento-concluido" element={<PaymentReturn />} />
              <Route path="/minha-conta" element={<MyAccount />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route path="produtos" element={<AdminProducts />} />
                <Route path="cupons" element={<AdminCoupons />} />
                <Route path="pedidos" element={<AdminOrders />} />
                <Route path="pedidos/:id" element={<AdminOrderDetail />} />
                <Route path="pagamentos" element={<AdminPayments />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route index element={<AdminProducts />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            <WhatsAppFloatingButton />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
