import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AboutPage from './pages/AboutPage';
import BrokerExclusiveOfferPage from './pages/BrokerExclusiveOfferPage';
import BrokerLandingPage from './pages/BrokerLandingPage';
import BuyerLandingPage from './pages/BuyerLandingPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NewBuyOfferPage from './pages/NewBuyOfferPage';
import NewSellOfferPage from './pages/NewSellOfferPage';
import ProfilePage from './pages/ProfilePage';
import PublicMarketplaceOfferPage from './pages/PublicMarketplaceOfferPage';
import SellerLandingPage from './pages/SellerLandingPage';

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e7f7ef_0%,#f8fafc_42%,#eef2ff_100%)] text-slate-900">
      <Navbar />
      <main className="mx-auto flex min-h-[80vh] max-w-3xl items-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.55)] backdrop-blur sm:p-10">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-700">Página não encontrada</p>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">O caminho procurado não existe nesta versão da plataforma.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
            A navegação pública foi simplificada para landing pages, login, dashboard e cadastro de ofertas.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/oportunidade/:offerId" element={<PublicMarketplaceOfferPage />} />
      <Route path="/quemsomos" element={<AboutPage />} />
      <Route path="/vendedorgraos" element={<SellerLandingPage />} />
      <Route path="/compradorgraos" element={<BuyerLandingPage />} />
      <Route path="/vendendorgraos" element={<Navigate to="/vendedorgraos" replace />} />
      <Route path="/vender" element={<Navigate to="/vendedorgraos" replace />} />
      <Route path="/comprar" element={<Navigate to="/compradorgraos" replace />} />
      <Route path="/corretores" element={<BrokerLandingPage />} />
      <Route path="/corretor/:token/:mode" element={<BrokerExclusiveOfferPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ofertas/venda/nova"
        element={
          <ProtectedRoute>
            <NewSellOfferPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ofertas/compra/nova"
        element={
          <ProtectedRoute>
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
      <Route path="/app/cadastro" element={<Navigate to="/login" replace />} />
      <Route path="/app/cadastro/:roleSlug" element={<Navigate to="/login" replace />} />
      <Route path="/app/cliente" element={<Navigate to="/dashboard" replace />} />
      <Route path="/app/tradingdesk/:userId" element={<Navigate to="/dashboard" replace />} />
      <Route path="/demo" element={<Navigate to="/" replace />} />
      <Route path="/demo/*" element={<Navigate to="/" replace />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
