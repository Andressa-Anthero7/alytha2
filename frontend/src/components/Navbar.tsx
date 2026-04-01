import { ArrowRight, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearAuth, getCurrentUser, isAuthenticated } from '../lib/auth';
import { BrandLogo } from '../shared/BrandLogo';

const navItems = [
  { label: 'Início', to: '/' },
  { label: 'Vender', to: '/vender' },
  { label: 'Comprar', to: '/comprar' },
];

const roleLabels = {
  vendedor: 'Vendedor',
  comprador: 'Comprador',
  corretor: 'Corretor',
  backoffice: 'Backoffice',
} as const;

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const loggedIn = isAuthenticated() && Boolean(user);

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <BrandLogo className="h-12" width={220} height={220} />
        </Link>

        <nav className="flex flex-1 flex-wrap items-center justify-end gap-3 text-sm font-semibold text-slate-600">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-4 py-2 ${
                  active ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15' : 'hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {loggedIn ? (
            <>
              <Link
                to="/dashboard"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${
                  location.pathname === '/dashboard'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500 md:inline-flex">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                {roleLabels[user?.type as keyof typeof roleLabels] || 'Conta'}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
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
      </div>
    </header>
  );
}
