import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getCurrentUser, isAuthenticated } from '../lib/auth';
import { getPrimaryAppPath } from '../shared/appRoutes';
import type { User } from '../types';

const buyerSteps = [
  'Informe produto, volume e local.',
  'Escolha mesa Alytha ou oferta direta.',
  'Receba oportunidades de forma organizada.',
] as const;

const buyerSeoLinks = [
  { label: 'Comprar soja', to: '/comprar-soja' },
  { label: 'Comprar milho', to: '/comprar-milho' },
  { label: 'Comprar sorgo', to: '/comprar-sorgo' },
] as const;

export default function BuyerLandingPage() {
  const currentUser = getCurrentUser<User>();
  const primaryHref = isAuthenticated() ? '/ofertas/compra/nova' : '/login';
  const secondaryHref = isAuthenticated() ? getPrimaryAppPath(currentUser) : '/';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff0db_0%,#ffffff_40%,#f8fafc_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <section className="mb-6 flex flex-col gap-3 rounded-[1.8rem] border border-white/80 bg-white/90 p-4 shadow-[0_35px_100px_-75px_rgba(15,23,42,0.55)] sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">Acesso rápido</p>
            <p className="mt-1.5 text-[13px] font-semibold text-slate-600 sm:text-sm">Cadastre sua demanda no início da jornada.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              to={primaryHref}
              className="inline-flex items-center justify-center gap-3 rounded-full bg-slate-900 px-5 py-3 text-[12px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 sm:text-sm"
            >
              Cadastrar demanda
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to={secondaryHref}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-[12px] font-black uppercase tracking-[0.18em] text-slate-900 shadow-sm hover:border-slate-400 sm:text-sm"
            >
              Ver marketplace
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">Comprar grãos</p>
            <h1 className="mt-4 text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
              Encontre oportunidades de soja, milho e sorgo com mais rapidez.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-[17px] sm:leading-8">
              Consulte o marketplace, publique sua demanda de soja, milho ou sorgo e acompanhe oportunidades com apoio comercial da Alytha.
            </p>
          </div>

          <div className="rounded-[1.8rem] bg-[linear-gradient(180deg,#111827_0%,#1f2937_100%)] p-5 text-white shadow-[0_55px_140px_-75px_rgba(15,23,42,0.85)] sm:rounded-[2.2rem] sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">Como funciona</p>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">Fluxo simples para comprar.</h2>
            <div className="mt-5 space-y-2.5">
              {buyerSteps.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-[13px] text-white sm:text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[0_35px_100px_-80px_rgba(15,23,42,0.55)] sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">Compra por produto</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Como comprar soja, milho e sorgo pela Alytha.</h2>
            </div>
            <div className="space-y-3 text-sm leading-7 text-slate-600 sm:text-base">
              <p>
                Para comprar soja, milho ou sorgo, consulte oportunidades por praça, volume, safra, frete, pagamento e valor. Quando não houver
                uma oferta aderente, registre a demanda para deixar sua necessidade clara para vendedores e corretores.
              </p>
              <p>
                A Alytha aproxima compradores de ofertas qualificadas e organiza a conversa comercial em torno dos dados que importam para o
                mercado físico de grãos.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {buyerSeoLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="rounded-full border border-amber-100 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-900 hover:bg-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
