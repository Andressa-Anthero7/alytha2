import { AlertCircle, ArrowRight, Eye, EyeOff, Headset, LoaderCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { getCurrentUser, isAuthenticated, saveAuth } from '../lib/auth';
import { supportEmail, supportWhatsAppDisplay, supportWhatsAppHref } from '../shared/api';
import { HOME_PATH } from '../shared/appRoutes';

type LoginResponse = {
  access: string;
  refresh: string;
  user: unknown;
};

type LoginLocationState = {
  from?: string;
  notice?: string;
  prefillEmail?: string;
} | null;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState;
  const currentUser = getCurrentUser();
  const [email, setEmail] = useState(locationState?.prefillEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated() && currentUser) {
    return <Navigate to={HOME_PATH} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json().catch(() => null)) as LoginResponse | { detail?: string } | null;
      if (!response.ok || !payload || !('access' in payload)) {
        throw new Error((payload && 'detail' in payload && payload.detail) || 'Falha no login.');
      }

      saveAuth(payload.access, payload.refresh, payload.user);
      navigate(HOME_PATH, { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Erro inesperado ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e6f4eb_0%,#ffffff_42%,#f7f2e8_100%)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 px-4 pt-5 sm:px-6 sm:justify-end sm:pt-7 lg:px-8">
        {[
          { label: 'Início', to: HOME_PATH },
          { label: 'Quem Somos', to: '/quemsomos' },
          { label: 'Vender grãos', to: '/vendedorgraos' },
          { label: 'Comprar grãos', to: '/compradorgraos' },
          { label: 'Corretores', to: '/corretores' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/80 bg-white/88 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch lg:px-8 lg:py-12">
        <section className="rounded-[2rem] bg-[linear-gradient(180deg,#052e2b_0%,#0f5f54_100%)] p-7 text-white shadow-[0_55px_140px_-75px_rgba(5,46,43,0.88)] sm:rounded-[2.5rem] sm:p-10">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-200">Acesso Alytha</p>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Entre para acompanhar a operação comercial com segurança.</h1>
          <p className="mt-5 max-w-xl text-[13px] leading-7 text-emerald-50/90 sm:text-sm sm:leading-7">
            Use seu acesso para consultar oportunidades, acompanhar negociações e manter suas informações organizadas na plataforma Alytha.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Ambiente profissional para compradores, vendedores e corretagem.',
              'Acesso ao dashboard com visão comercial e operacional.',
              'Fluxo preparado para apoiar a rotina da mesa e dos cadastros.',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_50px_140px_-75px_rgba(15,23,42,0.65)] backdrop-blur sm:rounded-[2.5rem] sm:p-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-700">Entrar</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Acesse sua conta Alytha</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-[15px] sm:leading-7">
              Informe seu e-mail e sua senha para continuar. Se precisar de apoio, nossa equipe de suporte está disponível.
            </p>
          </div>

          {locationState?.notice ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {locationState.notice}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">E-mail</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com.br"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Senha</span>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Sua senha"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 outline-none focus:border-emerald-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((currentValue) => !currentValue)}
                  className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 transition-colors hover:text-emerald-600"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <div className="flex justify-end">
              <Link to="/esqueci-minha-senha" className="text-xs font-bold text-emerald-700 transition-colors hover:text-emerald-800">
                Perdi minha senha
              </Link>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-3 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {loading ? 'Entrando...' : 'Entrar'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
              <Link
                to="/cadastro"
                className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-700 hover:bg-slate-50"
              >
                Criar conta
              </Link>
            </div>
          </form>

          <div className="mt-8 rounded-[1.8rem] border border-amber-100 bg-amber-50/80 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
                <Headset className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-amber-950">Suporte comercial e técnico</p>
                <p className="mt-2 text-sm leading-7 text-amber-900/80">
                  Se for necessário recuperar o acesso ou confirmar informações de cadastro, fale com a equipe da Alytha.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={`mailto:${supportEmail}`}
                className="rounded-full border border-amber-200 bg-white px-4 py-3 text-center text-sm font-bold text-amber-900 hover:bg-amber-100"
              >
                {supportEmail}
              </a>
              {supportWhatsAppHref && (
                <a
                  href={supportWhatsAppHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-amber-700 px-4 py-3 text-center text-sm font-bold text-white hover:bg-amber-800"
                >
                  WhatsApp {supportWhatsAppDisplay}
                </a>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
