import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/api';

type ForgotPasswordResponse = {
  detail: string;
  resetPath?: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetPath, setResetPath] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    setResetPath('');

    try {
      const response = await apiFetch('/forgot-password/request/', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json().catch(() => null)) as ForgotPasswordResponse | { detail?: string } | null;
      if (!response.ok || !payload) {
        throw new Error((payload && 'detail' in payload && payload.detail) || 'Não foi possível iniciar a recuperação de senha.');
      }

      setMessage(payload.detail);
      setResetPath(('resetPath' in payload && payload.resetPath) || '');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro inesperado ao solicitar redefinição.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef5ff_0%,#ffffff_42%,#f7f2e8_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para login
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[2rem] bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_100%)] p-6 text-white shadow-[0_55px_140px_-75px_rgba(15,23,42,0.85)] sm:rounded-[2.5rem] sm:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-sky-200">Recuperação de senha</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Recupere o acesso da sua conta com segurança.</h1>
            <p className="mt-4 text-sm leading-7 text-slate-200 sm:text-base sm:leading-8">
              Informe o e-mail da sua conta. Enviaremos um link seguro para redefinição com validade limitada.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_50px_140px_-75px_rgba(15,23,42,0.65)] backdrop-blur sm:rounded-[2.5rem] sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-700">Perdi minha senha</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Solicite a redefinição</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Digite o e-mail usado no cadastro para continuar.
                </p>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">E-mail</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </label>

              {message && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{message}</span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {submitting ? 'Enviando...' : 'Enviar instruções'}
              </button>

              {resetPath ? (
                <Link
                  to={resetPath}
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-700 hover:bg-slate-50"
                >
                  Abrir redefinição
                </Link>
              ) : null}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
