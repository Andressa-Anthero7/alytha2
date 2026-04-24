import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { isAuthenticated } from '../lib/auth';

const sellerSteps = [
  'Cadastre produto, volume e praça.',
  'Defina mesa Alytha ou oferta direta.',
  'Deixe sua oferta pronta para consulta.',
] as const;

export default function SellerLandingPage() {
  const primaryHref = isAuthenticated() ? '/ofertas/venda/nova' : '/login';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e4f5ea_0%,#ffffff_38%,#f8fafc_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <section className="mb-6 flex flex-col gap-3 rounded-[1.8rem] border border-white/80 bg-white/90 p-4 shadow-[0_35px_100px_-75px_rgba(15,23,42,0.55)] sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Acesso rápido</p>
            <p className="mt-1.5 text-[13px] font-semibold text-slate-600 sm:text-sm">Cadastre sua oferta logo abaixo do header.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              to={primaryHref}
              className="inline-flex items-center justify-center gap-3 rounded-full bg-emerald-600 px-5 py-3 text-[12px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 sm:text-sm"
            >
              Cadastrar oferta
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-[12px] font-black uppercase tracking-[0.18em] text-slate-900 hover:border-slate-400 sm:text-sm"
            >
              Ver marketplace
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Vender grãos</p>
            <h1 className="mt-4 text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
              Publique ofertas de soja, milho e sorgo com mais clareza comercial.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-[17px] sm:leading-8">
              Cadastre sua oferta, organize as informações do lote e deixe a oportunidade pronta para negociação.
            </p>
          </div>

          <div className="rounded-[1.8rem] bg-[linear-gradient(180deg,#052e2b_0%,#0f5f54_100%)] p-5 text-white shadow-[0_55px_140px_-75px_rgba(5,46,43,0.85)] sm:rounded-[2.2rem] sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">Como funciona</p>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">Fluxo simples para vender.</h2>
            <div className="mt-5 space-y-2.5">
              {sellerSteps.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-[13px] text-white sm:text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
