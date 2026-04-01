import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { isAuthenticated } from '../lib/auth';
import { supportWhatsAppHref } from '../shared/api';

const valueBlocks = [
  {
    title: 'Demanda centralizada',
    description: 'Cadastre sua intenção de compra com volume, praça, padrão e condição desejada.',
  },
  {
    title: 'Mais velocidade na prospecção',
    description: 'A equipe usa a base comercial para buscar oportunidades aderentes ao seu perfil.',
  },
  {
    title: 'Menos ruído na negociação',
    description: 'Informações comerciais organizadas para acelerar triagem e tomada de decisão.',
  },
  {
    title: 'Intermediação profissional',
    description: 'Do interesse inicial ao avanço da operação, com registro da negociação na plataforma.',
  },
] as const;

const registerItems = [
  'Produto desejado',
  'Volume',
  'Local de entrega ou retirada',
  'Janela de entrega',
  'Faixa de preço',
  'Exigência de qualidade',
  'Tipo de frete',
  'Forma de pagamento',
];

export default function BuyerLandingPage() {
  const primaryHref = isAuthenticated() ? '/ofertas/compra/nova' : '/login';
  const secondaryHref = isAuthenticated() ? '/dashboard' : '/login';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff0db_0%,#ffffff_40%,#f8fafc_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-16">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.34em] text-amber-700">Para comprador</p>
            <h1 className="mt-5 text-5xl font-black leading-[1.03] tracking-tight md:text-7xl">
              Encontre ofertas de grãos com mais agilidade e apoio na intermediação.
            </h1>
            <p className="mt-6 text-lg leading-9 text-slate-600">
              A Alytha aproxima compradores de vendedores de soja, milho e sorgo, organizando oportunidades e apoiando a
              construção do negócio.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to={primaryHref}
                className="inline-flex items-center gap-3 rounded-full bg-slate-900 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
              >
                Cadastrar intenção de compra
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={secondaryHref}
                className="rounded-full border border-slate-300 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-900 shadow-sm hover:border-slate-400"
              >
                Entrar na plataforma
              </Link>
              <a
                href={supportWhatsAppHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-amber-200 bg-amber-50 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-amber-900 hover:bg-amber-100"
              >
                Falar com a Alytha
              </a>
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-[linear-gradient(180deg,#111827_0%,#1f2937_100%)] p-8 text-white shadow-[0_55px_140px_-75px_rgba(15,23,42,0.85)]">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-200">Triagem mais rápida</p>
            <h2 className="mt-4 text-3xl font-black">Demanda com padrão comercial definido</h2>
            <p className="mt-4 text-base leading-8 text-slate-200">
              A intenção de compra chega estruturada para facilitar busca, comparação e intermediação com vendedores aderentes.
            </p>
            <div className="mt-8 space-y-3">
              {registerItems.slice(0, 5).map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-2">
          {valueBlocks.map((block) => (
            <article key={block.title} className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_40px_110px_-75px_rgba(15,23,42,0.7)]">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700">Valor</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">{block.title}</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">{block.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-16 rounded-[2.5rem] border border-slate-200 bg-white/90 p-8 shadow-[0_45px_120px_-80px_rgba(15,23,42,0.5)]">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-700">O que pode cadastrar</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {registerItems.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
