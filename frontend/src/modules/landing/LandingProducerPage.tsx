import { ArrowRight, Handshake, Headset, ShieldCheck, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../../shared/BrandLogo';

type LandingProducerPageProps = {
  routeBase: string;
};

export function LandingProducerPage({ routeBase }: LandingProducerPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dcfce7_0%,#f8fafc_42%,#ffffff_100%)] text-slate-900">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        <BrandLogo className="h-20" width={420} height={420} />
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`${routeBase}/lp/comprador`)}
            className="text-sm font-bold text-slate-500 transition-colors hover:text-emerald-700"
          >
            Sou comprador
          </button>
          <button
            onClick={() => navigate(`${routeBase}/app/login/cliente`)}
            className="text-sm font-bold text-slate-900 transition-colors hover:text-emerald-700"
          >
            Entrar
          </button>
          <button
            onClick={() => navigate(`${routeBase}/app/cadastro/cliente`)}
            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-emerald-700"
          >
            Cadastrar safra
          </button>
        </div>
      </nav>

      <main className="mx-auto grid max-w-7xl gap-16 px-8 pb-16 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Modulo publico do produtor
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.92] tracking-tight text-slate-950 lg:text-7xl">
            Venda sua safra com a mesa certa do outro lado da operacao.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            O modulo inicial da Alytha conecta produtor, comprador e corretor em um fluxo mais objetivo: captacao,
            autenticacao e encaminhamento rapido para a mesa de operacoes.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <button
              onClick={() => navigate(`${routeBase}/app/cadastro/cliente`)}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-7 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-slate-800"
            >
              Comecar agora
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate(`${routeBase}/app/login/corretor`)}
              className="rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              Falar com a mesa
            </button>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: TrendingUp,
                title: 'Mercado ativo',
                description: 'Acesso rapido a uma mesa organizada por demanda real e por janela de negocio.',
              },
              {
                icon: ShieldCheck,
                title: 'Fluxo seguro',
                description: 'Cadastro, login e aprovacao conectados ao mesmo modulo inicial.',
              },
              {
                icon: Headset,
                title: 'Apoio comercial',
                description: 'O corretor entra cedo na conversa e reduz a friccao ate o match.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-lg shadow-emerald-100/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <item.icon className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-lg font-black text-slate-950">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative">
          <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-[2.5rem] bg-emerald-500/10" />
          <div className="relative overflow-hidden rounded-[2.5rem] border border-emerald-100 bg-white shadow-2xl shadow-emerald-100/50">
            <img
              src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1200&auto=format&fit=crop"
              alt="Plantacao"
              className="h-[520px] w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent p-8 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-emerald-300 backdrop-blur">
                  <Handshake className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Entrada simplificada</p>
                  <p className="mt-1 text-xl font-black">Landing, cadastro e operacao ja nascem conectados.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
