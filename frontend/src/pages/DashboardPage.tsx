import { AlertCircle, ArrowRight, KeyRound, LoaderCircle, PackageSearch, Wheat } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/api';
import { clearAuth, getCurrentUser } from '../lib/auth';
import { TradingDeskPage } from '../modules/tradingdesk/TradingDeskPage';
import type { Offer, User } from '../types';

const roleLabels = {
  vendedor: 'Vendedor',
  comprador: 'Comprador',
  corretor: 'Corretor',
  backoffice: 'Backoffice',
} as const;

const grainAccent = {
  Soja: 'bg-emerald-100 text-emerald-800',
  Milho: 'bg-amber-100 text-amber-800',
  Sorgo: 'bg-orange-100 text-orange-800',
} as const;

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = getCurrentUser<User>();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.type === 'corretor' || user.type === 'backoffice') {
      return;
    }

    const loadOffers = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiFetch('/offers?all=true');
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.detail || 'Não foi possível carregar suas ofertas.');
        }

        setOffers(Array.isArray(payload) ? payload : []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Erro inesperado ao carregar o painel.');
      } finally {
        setLoading(false);
      }
    };

    void loadOffers();
  }, [user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  if (user.type === 'corretor' || user.type === 'backoffice') {
    return <TradingDeskPage currentUser={user} onLogout={handleLogout} />;
  }

  const primaryAction = user.type === 'vendedor'
    ? { href: '/ofertas/venda/nova', label: 'Cadastrar nova venda' }
    : { href: '/ofertas/compra/nova', label: 'Cadastrar nova compra' };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#edf8f1_0%,#f8fafc_38%,#f3eee3_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-16">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2.5rem] border border-white/80 bg-white/90 p-8 shadow-[0_50px_140px_-75px_rgba(15,23,42,0.65)]">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-700">Painel Alytha</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Olá, {user.name}.</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Seu acesso está ativo para cadastrar ofertas, revisar sua base comercial e manter a negociação mais organizada.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to={primaryAction.href}
                className="inline-flex items-center gap-3 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
              >
                {primaryAction.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={user.type === 'vendedor' ? '/ofertas/compra/nova' : '/ofertas/venda/nova'}
                className="rounded-full border border-slate-300 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-900 hover:border-slate-400"
              >
                Abrir outro cadastro
              </Link>
              <Link
                to="/perfil/trocar-senha"
                className="inline-flex items-center gap-3 rounded-full border border-amber-200 bg-amber-50 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-amber-900 hover:bg-amber-100"
              >
                <KeyRound className="h-4 w-4" />
                Trocar senha
              </Link>
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-[linear-gradient(180deg,#111827_0%,#1f2937_100%)] p-8 text-white shadow-[0_55px_140px_-75px_rgba(15,23,42,0.85)]">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-200">Conta conectada</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Perfil</p>
                <p className="mt-2 text-2xl font-black">{roleLabels[user.type]}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">E-mail</p>
                <p className="mt-2 text-sm font-semibold text-white">{user.email}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Empresa</p>
                <p className="mt-2 text-sm font-semibold text-white">{user.company || 'Não informada'}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[2.5rem] border border-white/80 bg-white/90 p-8 shadow-[0_45px_120px_-80px_rgba(15,23,42,0.55)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Suas ofertas</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Base recente cadastrada</h2>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-slate-600">
              {offers.length} registro(s)
            </div>
          </div>

          {loading ? (
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Carregando suas ofertas...
            </div>
          ) : error ? (
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : offers.length === 0 ? (
            <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <PackageSearch className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-4 text-2xl font-black text-slate-900">Nenhuma oferta cadastrada ainda.</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Use o painel para cadastrar sua primeira {user.type === 'vendedor' ? 'oferta de venda' : 'intenção de compra'}.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {offers.slice(0, 6).map((offer) => (
                <article key={offer.id} className="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.2em] ${
                        grainAccent[offer.grain as keyof typeof grainAccent] || 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {offer.grain}
                    </span>
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{offer.type}</span>
                  </div>
                  <h3 className="mt-4 text-2xl font-black text-slate-950">
                    {Number(offer.quantity).toLocaleString('pt-BR')} {offer.unit}
                  </h3>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
                    <Wheat className="h-4 w-4 text-emerald-700" />
                    {offer.location}
                  </p>
                  <p className="mt-4 text-sm font-semibold text-slate-700">Safra {offer.crop}</p>
                  <p className="mt-2 text-3xl font-black text-emerald-700">
                    R$ {Number(offer.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Status: {offer.status}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
