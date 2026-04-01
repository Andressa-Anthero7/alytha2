import { AlertCircle, CheckCircle2, KeyRound, LoaderCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/api';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch('/change-password/', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.detail || 'Não foi possível trocar a senha.');
      }

      setMessage(payload?.detail || 'Senha alterada com sucesso.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro inesperado ao trocar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#edf8f1_0%,#ffffff_42%,#f8fafc_100%)]">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-16">
        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[2.5rem] bg-[linear-gradient(180deg,#111827_0%,#1f2937_100%)] p-8 text-white shadow-[0_55px_140px_-75px_rgba(15,23,42,0.85)]">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-200">Segurança</p>
            <h1 className="mt-5 text-4xl font-black tracking-tight">Atualize sua senha com segurança.</h1>
            <p className="mt-4 text-base leading-8 text-slate-200">
              Use este fluxo para manter o acesso ativo com credenciais atuais e alinhadas às validações do Django.
            </p>
            <div className="mt-8 space-y-3">
              {[
                'Informe a senha atual para validar a operação.',
                'Use uma nova senha forte e diferente da anterior.',
                'A sessão continua ativa após a alteração.',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[2.5rem] border border-white/80 bg-white/90 p-8 shadow-[0_50px_140px_-75px_rgba(15,23,42,0.65)] backdrop-blur"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-700">Perfil</p>
                <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Trocar senha</h2>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Senha atual</span>
                <input
                  required
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Nova senha</span>
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Confirmar nova senha</span>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </label>
            </div>

            {message && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-slate-900 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-slate-900/15 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Salvar nova senha
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
