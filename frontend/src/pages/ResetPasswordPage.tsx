import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    if (!token) {
      setSubmitting(false);
      setError('Token de redefinição inválido.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitting(false);
      setError('As senhas não coincidem.');
      return;
    }

    try {
      const response = await apiFetch('/forgot-password/confirm/', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: password }),
      });

      const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.detail || 'Não foi possível redefinir a senha.');
      }

      setMessage(payload?.detail || 'Senha redefinida com sucesso.');
      window.setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            notice: 'Senha redefinida com sucesso. Faça login com a nova senha.',
          },
        });
      }, 900);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro inesperado ao redefinir a senha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef5ff_0%,#ffffff_42%,#f7f2e8_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_50px_140px_-75px_rgba(15,23,42,0.65)] backdrop-blur sm:rounded-[2.5rem] sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-700">Nova senha</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Defina uma nova senha para sua conta.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
            Digite e confirme a nova senha para concluir a recuperação.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Nova senha</span>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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

            <label className="block space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Confirmar nova senha</span>
              <div className="relative">
                <input
                  required
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 outline-none focus:border-emerald-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((currentValue) => !currentValue)}
                  className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 transition-colors hover:text-emerald-600"
                  aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-3 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {submitting ? 'Salvando...' : 'Salvar nova senha'}
              </button>
              <Link
                to="/login"
                className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-700 hover:bg-slate-50"
              >
                Voltar ao login
              </Link>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
