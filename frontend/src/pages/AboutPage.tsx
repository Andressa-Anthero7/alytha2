import { ArrowRight, Building2, Handshake, MapPinned, Wheat } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { isAuthenticated } from '../lib/auth';

const operationStates = ['MT', 'MS', 'GO', 'TO', 'MG', 'SP', 'PR', 'RS'] as const;

const highlightCards = [
  {
    icon: Handshake,
    title: 'Intermediacao comercial',
    description: 'A Alytha atua conectando vendedores, compradores e oportunidades com criterio comercial e leitura de mercado.',
  },
  {
    icon: Wheat,
    title: 'Graos atendidos',
    description: 'Soja, milho e sorgo com abordagem profissional para mercado fisico, prospeccao e organizacao da operacao.',
  },
  {
    icon: MapPinned,
    title: 'Cobertura regional',
    description: 'Presenca nas principais pracas agricolas de MT, MS, GO, TO, MG, SP, PR e RS.',
  },
  {
    icon: Building2,
    title: 'Postura de corretora',
    description: 'Acompanhamento comercial, apoio na conducao da negociacao e relacionamento com a cadeia produtiva.',
  },
] as const;

export default function AboutPage() {
  const dashboardHref = isAuthenticated() ? '/dashboard' : '/login';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef8f1_0%,#ffffff_42%,#f4efe4_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.34em] text-emerald-700">Quem somos</p>
            <h1 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl lg:text-7xl">
              Alytha, corretora e intermediadora de graos nas principais regioes agricolas do pais.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Nosso trabalho e aproximar oferta e demanda com leitura de praca, relacionamento comercial e apoio para que cada
              negociacao siga com mais clareza, velocidade e criterio.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
              A Alytha opera na conexao entre produtores, silos, armazens, compradores e corretores, com foco em soja, milho e
              sorgo e atencao ao ritmo real do mercado fisico.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to={dashboardHref}
                className="inline-flex items-center justify-center gap-3 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
              >
                {isAuthenticated() ? 'Abrir plataforma' : 'Entrar na Alytha'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/vendedorgraos"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-900 hover:border-slate-400"
              >
                Quero vender
              </Link>
              <Link
                to="/compradorgraos"
                className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-amber-900 hover:bg-amber-100"
              >
                Quero comprar
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_50px_140px_-80px_rgba(15,23,42,0.65)] sm:rounded-[2.5rem] sm:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-700">Atuacao Alytha</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {highlightCards.map((item) => (
                <article key={item.title} className="rounded-[1.6rem] border border-slate-100 bg-slate-50 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-xl font-black leading-tight text-slate-950">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[2rem] bg-[linear-gradient(180deg,#052e2b_0%,#0f5f54_100%)] p-6 text-white shadow-[0_55px_140px_-80px_rgba(5,46,43,0.85)] sm:rounded-[2.5rem] sm:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-200">Proposito</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Ser o elo comercial entre a cadeia produtiva e a cadeia compradora.</h2>
            <p className="mt-4 text-sm leading-7 text-emerald-50/90 sm:text-base sm:leading-8">
              A Alytha acompanha negociações de soja, milho e sorgo organizando informacoes, aproximando interesses e apoiando a
              construcao do negocio com postura de corretora e intermediadora.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Soja', 'Milho', 'Sorgo', 'Corretagem'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-50"
                >
                  {item}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_40px_110px_-75px_rgba(15,23,42,0.55)] sm:rounded-[2.5rem] sm:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Cobertura</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Presenca nas principais regioes de agricultura.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
              Acompanhamos pracas estrategicas do agronegocio e oportunidades comerciais em diferentes estados, com foco no
              mercado fisico e nas janelas reais de compra e venda.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {operationStates.map((state) => (
                <div
                  key={state}
                  className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-center text-sm font-black uppercase tracking-[0.22em] text-slate-700"
                >
                  {state}
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
