import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PageLoadingOverlay from './components/PageLoadingOverlay';
import ProfileContentRoute from './components/ProfileContentRoute';
import ProtectedRoute from './components/ProtectedRoute';
import SiteFooter from './components/SiteFooter';
import { RegisterPage } from './modules/auth/RegisterPage';
import AboutPage from './pages/AboutPage';
import BackofficePage from './pages/BackofficePage';
import BrokerExclusiveOfferPage from './pages/BrokerExclusiveOfferPage';
import BrokerLandingPage from './pages/BrokerLandingPage';
import BuyerLandingPage from './pages/BuyerLandingPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import ErrorStatePage from './pages/ErrorStatePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import LegalPage from './pages/LegalPage';
import LoginPage from './pages/LoginPage';
import NewBuyOfferPage from './pages/NewBuyOfferPage';
import NewSellOfferPage from './pages/NewSellOfferPage';
import OperationsWorkspacePage from './pages/OperationsWorkspacePage';
import ProfilePage from './pages/ProfilePage';
import PublicMarketplaceOfferPage from './pages/PublicMarketplaceOfferPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SellerLandingPage from './pages/SellerLandingPage';

const footerHiddenPaths = [
  '/app/admin/backoffice',
  '/mesa-operacional',
  '/dashboard',
  '/perfil',
  '/ofertas/venda/nova',
  '/ofertas/compra/nova',
];

export default function App() {
  const location = useLocation();
  const [pageLoading, setPageLoading] = useState(true);
  const hideFooter = footerHiddenPaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));

  useEffect(() => {
    setPageLoading(true);
    const timeoutId = window.setTimeout(() => setPageLoading(false), 420);

    return () => window.clearTimeout(timeoutId);
  }, [location.pathname]);

  return (
    <>
      <PageLoadingOverlay visible={pageLoading} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/oportunidades/:offerId" element={<PublicMarketplaceOfferPage />} />
        <Route path="/oportunidade/:offerId" element={<PublicMarketplaceOfferPage />} />
        <Route path="/quemsomos" element={<AboutPage />} />
        <Route path="/lgpd" element={<LegalPage variant="privacy" />} />
        <Route path="/privacidade" element={<Navigate to="/lgpd" replace />} />
        <Route path="/termos" element={<Navigate to="/termos-de-servico" replace />} />
        <Route path="/termos-de-servico" element={<LegalPage variant="terms" />} />
        <Route
          path="/vendedorgraos"
          element={
            <ProfileContentRoute allowedTypes={['vendedor']}>
              <SellerLandingPage />
            </ProfileContentRoute>
          }
        />
        <Route path="/vendergraos" element={<Navigate to="/vendedorgraos" replace />} />
        <Route
          path="/compradorgraos"
          element={
            <ProfileContentRoute allowedTypes={['comprador']}>
              <BuyerLandingPage />
            </ProfileContentRoute>
          }
        />
        <Route path="/vendendorgraos" element={<Navigate to="/vendedorgraos" replace />} />
        <Route path="/vender" element={<Navigate to="/vendedorgraos" replace />} />
        <Route path="/comprar" element={<Navigate to="/compradorgraos" replace />} />
        <Route
          path="/corretores"
          element={
            <ProfileContentRoute allowedTypes={['corretor']}>
              <BrokerLandingPage />
            </ProfileContentRoute>
          }
        />
        <Route path="/corretor/:token/:mode" element={<BrokerExclusiveOfferPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<Navigate to="/app/cadastro/comprador" replace />} />
        <Route path="/esqueci-minha-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha/:token" element={<ResetPasswordPage />} />
        <Route path="/app/cadastro" element={<Navigate to="/app/cadastro/comprador" replace />} />
        <Route path="/app/cadastro/:roleSlug" element={<RegisterPage routeBase="" />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mesa-operacional"
          element={
            <ProtectedRoute>
              <OperationsWorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/admin/backoffice"
          element={
            <ProtectedRoute allowedTypes={['backoffice']}>
              <BackofficePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ofertas/venda/nova"
          element={
            <ProtectedRoute allowedTypes={['vendedor']}>
              <NewSellOfferPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ofertas/compra/nova"
          element={
            <ProtectedRoute allowedTypes={['comprador']}>
              <NewBuyOfferPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil/trocar-senha"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />

        <Route path="/lp/produtor" element={<Navigate to="/vendedorgraos" replace />} />
        <Route path="/lp/comprador" element={<Navigate to="/compradorgraos" replace />} />
        <Route path="/lp/corretor" element={<Navigate to="/corretores" replace />} />
        <Route path="/app/login" element={<Navigate to="/login" replace />} />
        <Route path="/app/login/:roleSlug" element={<Navigate to="/login" replace />} />
        <Route path="/backoffice" element={<Navigate to="/app/admin/backoffice" replace />} />
        <Route path="/app/cliente" element={<Navigate to="/dashboard" replace />} />
        <Route path="/app/tradingdesk/:userId" element={<Navigate to="/mesa-operacional" replace />} />
        <Route path="/demo" element={<Navigate to="/" replace />} />
        <Route path="/demo/*" element={<Navigate to="/" replace />} />
        <Route path="/erro" element={<ErrorStatePage variant="error" />} />

        <Route path="*" element={<ErrorStatePage variant="not-found" />} />
      </Routes>
      {!hideFooter ? <SiteFooter /> : null}
    </>
  );
}
