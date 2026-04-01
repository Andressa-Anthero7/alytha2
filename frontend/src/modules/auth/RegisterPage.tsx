import { type FormEvent, useState } from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../shared/api';
import { ShellHeader } from '../../shared/ShellHeader';

type RegisterPageProps = {
  routeBase: string;
};

export function RegisterPage({ routeBase }: RegisterPageProps) {
  const navigate = useNavigate();
  const { roleSlug } = useParams();
  const normalizedRoleSlug = roleSlug === 'corretor' ? 'corretor' : 'cliente';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = normalizedRoleSlug === 'corretor' ? 'Cadastro da Mesa' : 'Criar conta';
  const subtitle =
    normalizedRoleSlug === 'corretor'
      ? 'Abra o acesso inicial do corretor neste modulo base.'
      : 'Entre no fluxo comercial da Alytha pelo modulo inicial.';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await apiFetch(`/register/${normalizedRoleSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, company, password }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.detail || 'Nao foi possivel concluir o cadastro.');
        return;
      }

      alert('Cadastro realizado. Faca login para continuar.');
      navigate(`${routeBase}/app/login/${normalizedRoleSlug}`, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]">
      <ShellHeader eyebrow="Cadastro" title={title} subtitle={subtitle} />

      <main className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50/80 p-8 shadow-xl shadow-emerald-100/50">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Modulo inicial</p>
          <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">Uma base menor, pronta para crescer por modulos.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Este cadastro permanece dentro do nucleo do produto: publico, autenticacao e mesa. O resto vai nascer
            depois, em branches e modulos separados.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Mesma base de identidade para cliente e corretor.',
              'Sem dependencia de transporte, armazenagem ou backoffice.',
              'Preparado para acoplar novos modulos sem reabrir o modulo inicial.',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">Criar acesso</p>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Abra sua conta neste modulo</h3>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Nome</span>
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Telefone</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Empresa</span>
                <input
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Senha</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Cadastrando...' : 'Cadastrar'}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Voltar
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
