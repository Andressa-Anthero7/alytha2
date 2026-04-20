import { AlertCircle, ArrowRight, Headset, LoaderCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { isAuthenticated, saveAuth } from '../lib/auth';
import { supportEmail, supportWhatsAppDisplay, supportWhatsAppHref } from '../shared/api';

type LoginResponse = {
  access: string;
  refresh: string;
  user: unknown;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from || '/dashboard';

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
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
      navigate(redirectTo, { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Erro inesperado ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e6f4eb_0%,#ffffff_42%,#f7f2e8_100%)]">
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8 lg:py-16">
        <section className="rounded-[2rem] bg-[linear-gradient(180deg,#052e2b_0%,#0f5f54_100%)] p-7 text-white shadow-[0_55px_140px_-75px_rgba(5,46,43,0.88)] sm:rounded-[2.5rem] sm:p-10">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-200">Acesso Alytha</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            Entre para acompanhar a operação comercial com segurança.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-emerald-50/90 sm:text-base sm:leading-8">
            Use seu acesso para consultar oportunidades, acompanhar negociações e manter suas informações organizadas na
            plataforma Alytha.
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
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Acesse sua conta Alytha</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
              Informe seu e-mail e sua senha para continuar. Se precisar de apoio, nossa equipe de suporte está disponível.
            </p>
          </div>

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
              <input
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua senha"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
              />
            </label>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
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
