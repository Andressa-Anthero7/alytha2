import { type FormEvent, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Headset } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch, forgotPasswordHref, supportEmail, supportWhatsAppDisplay, supportWhatsAppHref } from '../../shared/api';
import { ShellHeader } from '../../shared/ShellHeader';
import { clearStoredSession, mapUserTypeToRole, persistSession } from '../../shared/session';

type LoginPageProps = {
  routeBase: string;
  onSessionChange: () => void;
};

export function LoginPage({ routeBase, onSessionChange }: LoginPageProps) {
  const navigate = useNavigate();
  const { roleSlug } = useParams();
  const normalizedRoleSlug = roleSlug === 'corretor' ? 'corretor' : 'cliente';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = normalizedRoleSlug === 'corretor' ? 'Acesso da Mesa' : 'Acesso Alytha';
  const subtitle =
    normalizedRoleSlug === 'corretor'
      ? 'Entre para acompanhar ofertas, negociações e contratos da mesa da Alytha.'
      : 'Use seu acesso para consultar oportunidades e seguir no fluxo comercial da plataforma.';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await apiFetch('/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.detail || 'Não foi possível entrar.');
        return;
      }

      const mappedRole = mapUserTypeToRole(payload?.user?.type);
      if (mappedRole === 'BACKOFFICE') {
        clearStoredSession();
        onSessionChange();
        setError('O acesso de backoffice não está disponível neste módulo.');
        return;
      }

      persistSession(payload.access, payload.refresh || null, payload.user || null);
      onSessionChange();

      if (mappedRole === 'CORRETOR') {
        navigate(`${routeBase}/app/tradingdesk/${payload?.user?.id || 1}`, { replace: true });
      } else {
        navigate(`${routeBase}/app/cliente`, { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]">
      <ShellHeader eyebrow="Autenticação" title={title} subtitle={subtitle} />

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
            {normalizedRoleSlug === 'corretor' ? 'Corretor' : 'Cliente'}
          </p>
          <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
            Um acesso profissional para seguir a operação com clareza.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300">
            A Alytha centraliza os fluxos de entrada para que compradores, vendedores e corretagem acompanhem o que importa
            sem ruído de informação.
          </p>

          <div className="mt-8 space-y-4">
            {[
              'Acesso direcionado para a mesa do corretor ou para o portal do cliente.',
              'Continuidade da operação com dados e negociações organizados.',
              'Base preparada para suportar novos módulos sem perder simplicidade.',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">Entrar</p>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Continue de onde parou</h3>
              <p className="mt-2 text-sm text-slate-500">
                Seu acesso segue o mesmo, com uma experiência mais limpa e preparada para produção.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">E-mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Senha</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
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
              <a
                href={forgotPasswordHref}
                target={supportWhatsAppHref ? '_blank' : undefined}
                rel={supportWhatsAppHref ? 'noreferrer' : undefined}
                className="text-xs font-bold text-emerald-700 transition-colors hover:text-emerald-800"
              >
                Esqueci minha senha
              </a>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Entrando...' : 'Entrar'}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate(`${routeBase}/app/cadastro/${normalizedRoleSlug}`)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Criar conta
              </button>
            </div>
          </form>

          <div className="mt-8 rounded-[1.75rem] border border-emerald-100 bg-emerald-50/80 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-emerald-600">
                <Headset className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-emerald-950">Suporte técnico</p>
                <p className="mt-1 text-sm text-emerald-800">
                  Se o acesso travar no meio da operação, fale com o time da Alytha.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <a
                href={`mailto:${supportEmail}`}
                className="flex-1 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-center text-sm font-bold text-emerald-800 transition-colors hover:border-emerald-300 hover:bg-emerald-100/40"
              >
                Enviar e-mail
              </a>
              {supportWhatsAppHref && (
                <a
                  href={supportWhatsAppHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                >
                  Abrir WhatsApp
                </a>
              )}
            </div>

            <p className="mt-3 text-[11px] text-emerald-900/80">
              Contato: {supportEmail}
              {supportWhatsAppDisplay ? ` • ${supportWhatsAppDisplay}` : ''}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
