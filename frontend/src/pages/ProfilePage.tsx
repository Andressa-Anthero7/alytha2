import { AlertCircle, ArrowLeft, Building2, CheckCircle2, KeyRound, LoaderCircle, Phone, Save, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/api';
import { getCurrentUser, setCurrentUser } from '../lib/auth';
import type { User } from '../types';

type ProfileFormState = {
  name: string;
  phone: string;
  company: string;
};

const roleLabels = {
  vendedor: 'Vendedor',
  comprador: 'Comprador',
  corretor: 'Corretor',
  backoffice: 'Backoffice',
} as const;

export default function ProfilePage() {
  const currentUser = getCurrentUser<User>();
  const [profile, setProfile] = useState<User | null>(currentUser);
  const [form, setForm] = useState<ProfileFormState>({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    company: currentUser?.company || '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiFetch('/profile/');
        const payload = (await response.json().catch(() => null)) as User | { detail?: string } | null;

        if (!response.ok || !payload || !('email' in payload)) {
          throw new Error((payload && 'detail' in payload && payload.detail) || 'Não foi possível carregar o perfil.');
        }

        setProfile(payload);
        setCurrentUser(payload);
        setForm({
          name: payload.name || '',
          phone: payload.phone || '',
          company: payload.company || '',
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Erro inesperado ao carregar o perfil.');
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await apiFetch('/profile/', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          company: form.company.trim(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as User | { detail?: string } | null;
      if (!response.ok || !payload || !('email' in payload)) {
        throw new Error((payload && 'detail' in payload && payload.detail) || 'Não foi possível atualizar o perfil.');
      }

      setProfile(payload);
      setCurrentUser(payload);
      setForm({
        name: payload.name || '',
        phone: payload.phone || '',
        company: payload.company || '',
      });
      setMessage('Perfil atualizado com sucesso.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro inesperado ao atualizar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const resolvedProfile = profile || currentUser;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#edf8f1_0%,#ffffff_42%,#f8fafc_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao dashboard
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] bg-[linear-gradient(180deg,#111827_0%,#1f2937_100%)] p-6 text-white shadow-[0_55px_140px_-75px_rgba(15,23,42,0.85)] sm:rounded-[2.5rem] sm:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-200">Perfil Alytha</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Dados da sua conta profissional.</h1>
            <p className="mt-4 text-sm leading-7 text-slate-200 sm:text-base sm:leading-8">
              Uma plataforma profissional precisa deixar seus dados visíveis, organizados e fáceis de atualizar.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">Perfil de acesso</p>
                <p className="mt-2 text-2xl font-black">{roleLabels[resolvedProfile.type]}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">E-mail</p>
                <p className="mt-2 text-sm font-semibold text-white">{resolvedProfile.email}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">Segurança</p>
                <Link
                  to="/perfil/trocar-senha"
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-900"
                >
                  <KeyRound className="h-4 w-4" />
                  Trocar senha
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_50px_140px_-75px_rgba(15,23,42,0.65)] backdrop-blur sm:rounded-[2.5rem] sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <UserCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-700">Minha conta</p>
                <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Perfil</h2>
              </div>
            </div>

            {loading ? (
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Carregando dados do perfil...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2 sm:col-span-2">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Nome</span>
                    <input
                      required
                      value={form.name}
                      onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Telefone</span>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={form.phone}
                        onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
                        placeholder="(00) 00000-0000"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Empresa</span>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={form.company}
                        onChange={(event) => setForm((previous) => ({ ...previous, company: event.target.value }))}
                        placeholder="Sua empresa"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">E-mail</span>
                    <input
                      value={resolvedProfile.email}
                      disabled
                      className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500 outline-none"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Perfil de acesso</span>
                    <div className="inline-flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      {roleLabels[resolvedProfile.type]}
                    </div>
                  </label>
                </div>

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

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-3 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar perfil
                  </button>

                  <Link
                    to="/perfil/trocar-senha"
                    className="inline-flex items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-900 hover:border-slate-400"
                  >
                    <KeyRound className="h-4 w-4" />
                    Trocar senha
                  </Link>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
