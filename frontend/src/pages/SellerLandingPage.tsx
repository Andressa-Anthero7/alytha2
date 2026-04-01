import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { isAuthenticated } from '../lib/auth';
import { supportWhatsAppHref } from '../shared/api';

const valueBlocks = [
  {
    title: 'Mais visibilidade para sua oferta',
    description: 'Cadastre sua carga e tenha sua oportunidade apresentada para compradores com demanda real.',
  },
  {
    title: 'Negociação com apoio comercial',
    description: 'A Alytha atua na intermediação para facilitar contato, alinhamento comercial e avanço da operação.',
  },
  {
    title: 'Organização da informação',
    description: 'Produto, volume, praça, safra, condição comercial e observações centralizados em um só lugar.',
  },
  {
    title: 'Agilidade no fechamento',
    description: 'Menos improviso no WhatsApp e mais clareza para transformar interesse em negócio.',
  },
] as const;

const registerItems = [
  'Soja disponível',
  'Milho disponível',
  'Sorgo disponível',
  'Volume em sacas ou toneladas',
  'Praça / cidade',
  'Safra',
  'Preço ou base de negociação',
  'Condição FOB ou CIF',
  'Observações de qualidade',
];

export default function SellerLandingPage() {
  const primaryHref = isAuthenticated() ? '/ofertas/venda/nova' : '/login';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e4f5ea_0%,#ffffff_38%,#f8fafc_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-16">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.34em] text-emerald-700">Para vendedor</p>
            <h1 className="mt-5 text-5xl font-black leading-[1.03] tracking-tight md:text-7xl">
              Venda sua safra com mais agilidade, segurança e acesso a compradores reais.
            </h1>
            <p className="mt-6 text-lg leading-9 text-slate-600">
              A Alytha conecta vendedores de soja, milho e sorgo a compradores do mercado, com apoio comercial,
              organização da negociação e acompanhamento da operação.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to={primaryHref}
                className="inline-flex items-center gap-3 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
              >
                Cadastrar oferta de venda
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={supportWhatsAppHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-emerald-200 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-emerald-800 shadow-sm hover:bg-emerald-50"
              >
                Falar com a Alytha no WhatsApp
              </a>
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-[linear-gradient(180deg,#052e2b_0%,#0f5f54_100%)] p-8 text-white shadow-[0_55px_140px_-75px_rgba(5,46,43,0.85)]">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-200">Cadastro orientado</p>
            <h2 className="mt-4 text-3xl font-black">Menos ruído, mais clareza comercial</h2>
            <p className="mt-4 text-base leading-8 text-emerald-50/90">
              A plataforma organiza os dados mínimos para a equipe apresentar sua oportunidade e conduzir o avanço da operação.
            </p>
            <div className="mt-8 space-y-3">
              {registerItems.slice(0, 5).map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-2">
          {valueBlocks.map((block) => (
            <article key={block.title} className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_40px_110px_-75px_rgba(15,23,42,0.7)]">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700">Valor</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">{block.title}</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">{block.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-16 rounded-[2.5rem] border border-amber-100 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)] p-8 shadow-[0_45px_120px_-80px_rgba(180,106,18,0.55)]">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-700">O que pode cadastrar</p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {registerItems.map((item) => (
              <div key={item} className="rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
