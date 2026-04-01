import { ArrowRight, BriefcaseBusiness, Handshake, Wheat } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { isAuthenticated } from '../lib/auth';

const audienceCards = [
  {
    title: 'Vendedor',
    description: 'Cadastre sua carga com volume, praça, safra e condição comercial para ganhar velocidade no fechamento.',
    href: '/vender',
    label: 'Ver página de venda',
    tone: 'bg-[linear-gradient(180deg,#0f8f63_0%,#0a6d4c_100%)] text-white',
  },
  {
    title: 'Comprador',
    description: 'Centralize intenção de compra, padrão desejado e janela de entrega para melhorar a prospecção.',
    href: '/comprar',
    label: 'Ver página de compra',
    tone: 'bg-[linear-gradient(180deg,#111827_0%,#1f2937_100%)] text-white',
  },
] as const;

export default function HomePage() {
  const dashboardHref = isAuthenticated() ? '/dashboard' : '/login';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f1ead9_0%,#f8fafc_34%,#edf6ef_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-16">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.34em] text-emerald-700">Alytha MVP</p>
            <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
              Conecte oferta e demanda de grãos com uma operação comercial mais clara.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-9 text-slate-600">
              A Alytha aproxima compradores, vendedores e corretores em um fluxo enxuto: landing pages comerciais,
              login real, cadastro de ofertas e Trading Desk operando como área de mesa.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/vender"
                className="inline-flex items-center gap-3 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700"
              >
                Sou vendedor
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/comprar"
                className="rounded-full border border-slate-300 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-900 shadow-sm hover:border-slate-400"
              >
                Sou comprador
              </Link>
              <Link
                to={dashboardHref}
                className="rounded-full border border-amber-200 bg-amber-50 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-amber-900 hover:bg-amber-100"
              >
                {isAuthenticated() ? 'Abrir dashboard' : 'Entrar na plataforma'}
              </Link>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-white/70 bg-white/85 p-8 shadow-[0_50px_140px_-70px_rgba(15,23,42,0.65)] backdrop-blur">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Wheat, label: 'Produtos', value: 'Soja, milho e sorgo' },
                { icon: Handshake, label: 'Fluxo', value: 'Oferta, match e negociação' },
                { icon: BriefcaseBusiness, label: 'Modelo', value: 'Intermediação comercial' },
                { icon: ArrowRight, label: 'Entrega', value: 'MVP pronto para produção enxuta' },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.8rem] border border-slate-100 bg-slate-50 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-xl font-black leading-tight text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          {audienceCards.map((card) => (
            <article key={card.title} className={`rounded-[2.5rem] p-8 shadow-[0_45px_120px_-70px_rgba(15,23,42,0.7)] ${card.tone}`}>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-white/70">Jornada dedicada</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight">{card.title}</h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-white/85">{card.description}</p>
              <Link
                to={card.href}
                className="mt-8 inline-flex items-center gap-3 rounded-full bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-900"
              >
                {card.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
