import { ArrowRight, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearAuth, getCurrentUser, isAuthenticated } from '../lib/auth';
import { canAccessProfileContent, getPrimaryAppPath, type AppUserType } from '../shared/appRoutes';
import { BrandLogo } from '../shared/BrandLogo';
import type { User } from '../types';

export const OPEN_MOBILE_NAV_EVENT = 'alytha:open-mobile-menu';

type NavItem = {
  label: string;
  to: string;
  allowedTypes?: readonly AppUserType[];
};

const navItems: NavItem[] = [
  { label: 'Início', to: '/' },
  { label: 'Quem Somos', to: '/quemsomos' },
  { label: 'Vender grãos', to: '/vendedorgraos' },
  { label: 'Comprar grãos', to: '/compradorgraos' },
];

const profileNavAllowedTypes: Record<string, readonly AppUserType[]> = {
  '/vendedorgraos': ['vendedor'],
  '/compradorgraos': ['comprador'],
  '/corretores': ['corretor'],
};

const roleLabels = {
  vendedor: 'Vendedor',
  comprador: 'Comprador',
  corretor: 'Corretor',
  backoffice: 'Backoffice',
} as const;

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser<User>();
  const loggedIn = isAuthenticated() && Boolean(user);
  const dashboardHref = getPrimaryAppPath(user);
  const visibleNavItems = navItems.filter((item) => !loggedIn || canAccessProfileContent(user, item.allowedTypes || profileNavAllowedTypes[item.to]));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    const handleOpenMobileMenu = () => {
      setMobileMenuOpen(true);
    };

    window.addEventListener(OPEN_MOBILE_NAV_EVENT, handleOpenMobileMenu);

    return () => {
      window.removeEventListener(OPEN_MOBILE_NAV_EVENT, handleOpenMobileMenu);
    };
  }, []);

  const renderLink = (label: string, to: string) => {
    const active = location.pathname === to;
    return (
      <Link
        key={to}
        to={to}
        onClick={closeMobileMenu}
        className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
          active ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <BrandLogo className="h-10 sm:h-12" width={220} height={220} />
        </Link>

        <nav className="hidden items-center justify-end gap-3 text-sm font-semibold md:flex">
          {visibleNavItems.map((item) => renderLink(item.label, item.to))}

          {loggedIn ? (
            <>
              <Link
                to={dashboardHref}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 ${
                  location.pathname === dashboardHref
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                {roleLabels[user?.type as keyof typeof roleLabels] || 'Conta'}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
            >
              Entrar
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((currentValue) => !currentValue)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-3 shadow-sm md:hidden">
          <div className="flex flex-col gap-2">
            {visibleNavItems.map((item) => renderLink(item.label, item.to))}

            {loggedIn ? (
              <>
                <Link
                  to={dashboardHref}
                  onClick={closeMobileMenu}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold ${
                    location.pathname === dashboardHref
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <div className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  {roleLabels[user?.type as keyof typeof roleLabels] || 'Conta'}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25"
              >
                Entrar
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
