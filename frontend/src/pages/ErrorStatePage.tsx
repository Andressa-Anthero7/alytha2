import { AlertTriangle, ArrowLeft, Home, LayoutDashboard, LogIn, RefreshCw, SearchX } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, isAuthenticated } from '../lib/auth';
import { getPrimaryAppPath } from '../shared/appRoutes';
import { BrandLogo } from '../shared/BrandLogo';
import type { User } from '../types';

type ErrorVariant = 'not-found' | 'error';

type ErrorStatePageProps = {
  variant?: ErrorVariant;
  onReset?: () => void;
};

const variantCopy = {
  'not-found': {
    code: '404',
    eyebrow: 'Pagina nao encontrada',
    title: 'Esse caminho nao existe ou mudou de lugar.',
    description: 'A plataforma continua ativa. Use um dos atalhos abaixo para voltar para uma area segura da Alytha.',
    icon: SearchX,
    tone: 'emerald',
    status: 'Rota inexistente',
    suggestion: 'Conferir o endereco ou voltar ao inicio',
  },
  error: {
    code: 'Erro',
    eyebrow: 'Algo saiu do esperado',
    title: 'Nao conseguimos abrir esta tela agora.',
    description: 'Atualize a pagina ou volte para a plataforma. Se o problema continuar, o time pode investigar pelo caminho acessado.',
    icon: AlertTriangle,
    tone: 'amber',
    status: 'Falha inesperada',
    suggestion: 'Tentar novamente ou voltar ao inicio',
  },
} as const;

export default function ErrorStatePage({ variant = 'not-found', onReset }: ErrorStatePageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser<User>();
  const loggedIn = isAuthenticated() && Boolean(user);
  const appHref = loggedIn ? getPrimaryAppPath(user) : '/login';
  const appLabel = loggedIn ? 'Ir para painel' : 'Entrar';
  const AppIcon = loggedIn ? LayoutDashboard : LogIn;
  const content = variantCopy[variant];
  const Icon = content.icon;
  const currentPath = `${location.pathname}${location.search}`;
  const isAmber = content.tone === 'amber';

  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f8f4] text-slate-950">
      <header className="relative z-10 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3" aria-label="Voltar para o inicio">
            <BrandLogo className="h-10 sm:h-12" width={220} height={220} />
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Inicio</span>
            </Link>
            <Link
              to={appHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
            >
              <AppIcon className="h-4 w-4" />
              {appLabel}
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative">
        <div className="absolute inset-x-0 top-0 h-52 bg-[linear-gradient(180deg,rgba(15,143,99,0.12),rgba(255,255,255,0))]" aria-hidden="true" />
        <div className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center lg:py-12">
          <section className="max-w-3xl">
            <div
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                isAmber ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {content.eyebrow}
            </div>

            <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[1.05] text-slate-950 sm:text-5xl lg:text-6xl">{content.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{content.description}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {onReset ? (
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </button>
              ) : (
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
                >
                  <Home className="h-4 w-4" />
                  Voltar ao inicio
                </Link>
              )}

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>

              <Link
                to={appHref}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
              >
                <AppIcon className="h-4 w-4" />
                {appLabel}
              </Link>
            </div>
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.65)]">
            <div className="flex items-start justify-between gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                  isAmber ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <span className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-bold text-slate-500">Alytha</span>
            </div>

            <p className="mt-8 text-7xl font-black leading-none text-slate-950">{content.code}</p>
            <p className="mt-3 text-sm font-semibold text-slate-500">{content.status}</p>

            <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
              <div className="grid gap-1 py-4">
                <dt className="text-xs font-bold text-slate-400">Caminho aberto</dt>
                <dd className="break-all text-sm font-semibold text-slate-800">{currentPath || '/'}</dd>
              </div>
              <div className="grid gap-1 py-4">
                <dt className="text-xs font-bold text-slate-400">Acao sugerida</dt>
                <dd className="text-sm font-semibold text-slate-800">{content.suggestion}</dd>
              </div>
              <div className="grid gap-1 py-4">
                <dt className="text-xs font-bold text-slate-400">Destino seguro</dt>
                <dd className="text-sm font-semibold text-slate-800">{loggedIn ? 'Painel da conta' : 'Inicio ou login'}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </main>
    </div>
  );
}
