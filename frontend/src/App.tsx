import { useEffect, useMemo, useState } from 'react';
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
import SeoKeywordLandingPage, { seoKeywordLandingPages } from './pages/SeoKeywordLandingPage';
import { trackGoogleAnalyticsPageView } from './shared/analytics';
import { useDocumentMetadata, type DocumentMetadata } from './shared/metadata';
import { buildAbsolutePublicUrl } from './shared/share';

const footerHiddenPaths = [
  '/app/admin/backoffice',
  '/mesa-operacional',
  '/dashboard',
  '/perfil',
  '/ofertas/venda/nova',
  '/ofertas/compra/nova',
];

const defaultSeoImage = buildAbsolutePublicUrl('/logo.png');
const publicRouteMetadata: Record<string, Omit<DocumentMetadata, 'canonicalUrl' | 'imageUrl' | 'type' | 'robots'> & { canonicalPath: string }> = {
  '/': {
    title: 'Alytha | Marketplace de grãos',
    description: 'Consulte ofertas de venda e demandas de compra de grãos com praça, volume, frete, safra e valor na plataforma Alytha.',
    canonicalPath: '/',
  },
  '/home': {
    title: 'Alytha | Marketplace de grãos',
    description: 'Consulte ofertas de venda e demandas de compra de grãos com praça, volume, frete, safra e valor na plataforma Alytha.',
    canonicalPath: '/',
  },
  '/vendedorgraos': {
    title: 'Venda grãos com apoio comercial | Alytha',
    description: 'Cadastre ofertas de soja, milho e sorgo e conecte sua produção a compradores e corretores dentro da Alytha.',
    canonicalPath: '/vendedorgraos',
  },
  '/compradorgraos': {
    title: 'Compre grãos com ofertas qualificadas | Alytha',
    description: 'Encontre demandas e oportunidades de compra de grãos com informações de praça, volume, safra, frete e valor.',
    canonicalPath: '/compradorgraos',
  },
  '/corretores': {
    title: 'Mesa e corretagem de grãos | Alytha',
    description: 'Alytha apoia corretores na captação, leitura de mercado e conexão entre compradores e vendedores de grãos.',
    canonicalPath: '/corretores',
  },
  '/quemsomos': {
    title: 'Quem somos | Alytha',
    description: 'Conheça a Alytha, plataforma para conectar produtores, compradores e corretores no mercado de grãos.',
    canonicalPath: '/quemsomos',
  },
  '/lgpd': {
    title: 'LGPD e privacidade | Alytha',
    description: 'Veja as diretrizes de privacidade, LGPD e tratamento de dados aplicadas aos usuários da Alytha.',
    canonicalPath: '/lgpd',
  },
  '/termos-de-servico': {
    title: 'Termos de serviço | Alytha',
    description: 'Consulte os termos de uso e prestação de serviços da plataforma Alytha.',
    canonicalPath: '/termos-de-servico',
  },
  ...Object.fromEntries(
    seoKeywordLandingPages.map((page) => [
      page.path,
      {
        title: page.title,
        description: page.description,
        canonicalPath: page.path,
      },
    ]),
  ),
};

const noIndexRoutePrefixes = [
  '/app',
  '/backoffice',
  '/cadastro',
  '/corretor',
  '/dashboard',
  '/demo',
  '/esqueci-minha-senha',
  '/login',
  '/mesa-operacional',
  '/ofertas',
  '/perfil',
  '/redefinir-senha',
];

const normalizePathname = (pathname: string) => {
  const normalizedPathname = pathname.replace(/\/+$/, '');
  return normalizedPathname || '/';
};

const buildRouteMetadata = (pathname: string): DocumentMetadata => {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname.startsWith('/oportunidades/') || normalizedPathname.startsWith('/oportunidade/')) {
    const canonicalPath = normalizedPathname.replace(/^\/oportunidade\//, '/oportunidades/');
    return {
      title: 'Oportunidade no marketplace | Alytha',
      description: 'Consulte os detalhes desta oportunidade no marketplace público de grãos da Alytha.',
      canonicalUrl: buildAbsolutePublicUrl(canonicalPath),
      imageUrl: defaultSeoImage,
      type: 'article',
      robots: 'index, follow',
    };
  }

  const publicMetadata = publicRouteMetadata[normalizedPathname];
  if (publicMetadata) {
    return {
      title: publicMetadata.title,
      description: publicMetadata.description,
      canonicalUrl: buildAbsolutePublicUrl(publicMetadata.canonicalPath),
      imageUrl: defaultSeoImage,
      type: 'website',
      robots: 'index, follow',
    };
  }

  const noIndex = noIndexRoutePrefixes.some((pathPrefix) => normalizedPathname === pathPrefix || normalizedPathname.startsWith(`${pathPrefix}/`));
  return {
    title: noIndex ? 'Área restrita | Alytha' : 'Página não encontrada | Alytha',
    description: noIndex
      ? 'Área operacional da plataforma Alytha reservada a usuários autenticados.'
      : 'Esta página não foi encontrada na plataforma Alytha.',
    canonicalUrl: buildAbsolutePublicUrl(normalizedPathname),
    imageUrl: defaultSeoImage,
    type: 'website',
    robots: 'noindex, follow',
  };
};

export default function App() {
  const location = useLocation();
  const [pageLoading, setPageLoading] = useState(true);
  const hideFooter = footerHiddenPaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  const routeMetadata = useMemo(() => buildRouteMetadata(location.pathname), [location.pathname]);

  useDocumentMetadata(routeMetadata);

  useEffect(() => {
    setPageLoading(true);
    const timeoutId = window.setTimeout(() => setPageLoading(false), 420);

    return () => window.clearTimeout(timeoutId);
  }, [location.pathname]);

  useEffect(() => {
    trackGoogleAnalyticsPageView(`${location.pathname}${location.search}${location.hash}`);
  }, [location.hash, location.pathname, location.search]);

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
        {seoKeywordLandingPages.map((page) => (
          <Route key={page.slug} path={page.path} element={<SeoKeywordLandingPage slug={page.slug} />} />
        ))}
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
        <Route path="/cadastro" element={<Navigate to="/app/cadastro" replace />} />
        <Route path="/cadastro/" element={<Navigate to="/app/cadastro" replace />} />
        <Route path="/esqueci-minha-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha/:token" element={<ResetPasswordPage />} />
        <Route path="/app/cadastro" element={<RegisterPage routeBase="" />} />
        <Route path="/app/cadastro/" element={<RegisterPage routeBase="" />} />
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
