import { ArrowRight, CheckCircle2, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getCurrentUser, isAuthenticated } from '../lib/auth';
import { getPrimaryAppPath } from '../shared/appRoutes';
import type { User } from '../types';

const highlights = [
  {
    title: 'Livro vivo de oportunidades',
    description: 'A plataforma disponibiliza ofertas e demandas de soja, milho e sorgo para negociação com apoio comercial.',
  },
  {
    title: 'Fluxo da mesa',
    description: 'O corretor acompanha oportunidades, executa match, organiza a conversa e conduz a negociação dentro da Alytha.',
  },
  {
    title: 'Link exclusivo',
    description: 'Cada corretor tem links próprios para captar oferta e demanda com exclusividade na sua dashboard.',
  },
  {
    title: 'Entrada qualificada',
    description: 'Inscreva-se e verifique se o seu perfil atende ao nível comercial esperado para o corpo de corretores Alytha.',
  },
] as const;

export default function BrokerLandingPage() {
  const currentUser = getCurrentUser<User>();
  const dashboardHref = isAuthenticated() ? getPrimaryAppPath(currentUser) : '/login';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef3ff_0%,#ffffff_40%,#f5efe3_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.34em] text-sky-700">Para corretores(as)</p>
            <h1 className="mt-5 text-3xl font-black leading-[1.03] tracking-tight sm:text-4xl lg:text-6xl">
              Plataforma para negociar ofertas e demandas de grãos com ritmo de mesa.
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg sm:leading-9">
              A Alytha é uma corretora e intermediadora de grãos com o propósito de disponibilizar oportunidades de soja, milho e
              sorgo para serem negociadas com leitura comercial, processo e mais organização.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to={dashboardHref}
                className="inline-flex items-center justify-center gap-3 rounded-full bg-sky-700 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-sky-700/20 hover:bg-sky-800"
              >
                {isAuthenticated() ? 'Abrir dashboard' : 'Quero me inscrever'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/quemsomos"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-900 shadow-sm hover:border-slate-400"
              >
                Conhecer a Alytha
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_100%)] p-6 text-white shadow-[0_55px_140px_-75px_rgba(15,23,42,0.88)] sm:rounded-[2.5rem] sm:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-sky-200">Rotina de corretagem</p>
            <h2 className="mt-4 text-3xl font-black">Capte, organize e negocie em uma única operação digital.</h2>
            <div className="mt-6 space-y-3">
              {['Visualize vendas, compras e negociações abertas.', 'Copie seus links exclusivos para captar oferta e demanda.', 'Trabalhe com comissão da mesa registrada na origem do cadastro.'].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.7rem] border border-white/10 bg-white/8 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sky-200">
                  <Copy className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">Link exclusivo por corretor</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">Oportunidades vindas do seu link ficam restritas à sua própria dashboard.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          {highlights.map((item) => (
            <article key={item.title} className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_40px_110px_-75px_rgba(15,23,42,0.65)] sm:p-8">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-700">Corretagem Alytha</p>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{item.title}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">{item.description}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
