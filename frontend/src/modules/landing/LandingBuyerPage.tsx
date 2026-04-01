import { ArrowLeftRight, ArrowRight, FileText, LayoutGrid, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../../shared/BrandLogo';

type LandingBuyerPageProps = {
  routeBase: string;
};

export function LandingBuyerPage({ routeBase }: LandingBuyerPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#fed7aa_0%,#0f172a_38%,#020617_100%)] text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        <div className="rounded-3xl bg-white/95 px-5 py-3 shadow-lg shadow-orange-500/10">
          <BrandLogo className="h-14" width={320} height={320} />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`${routeBase}/lp/produtor`)}
            className="text-sm font-bold text-slate-300 transition-colors hover:text-white"
          >
            Sou produtor
          </button>
          <button
            onClick={() => navigate(`${routeBase}/app/login/cliente`)}
            className="text-sm font-bold text-white transition-colors hover:text-orange-300"
          >
            Entrar
          </button>
          <button
            onClick={() => navigate(`${routeBase}/app/login/cliente`)}
            className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-orange-400"
          >
            Ver ofertas
          </button>
        </div>
      </nav>

      <main className="mx-auto grid max-w-7xl gap-16 px-8 pb-16 pt-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            Modulo publico do comprador
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.92] tracking-tight lg:text-7xl">
            Origine mais rapido com um funil que ja desemboca na mesa.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Esta branch agora concentra o modulo inicial da Alytha: landing pages, autenticacao e trading desk. O
            comprador entra por um fluxo publico mais direto e chega no time certo sem carregar modulos paralelos.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <button
              onClick={() => navigate(`${routeBase}/app/login/cliente`)}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-orange-500 px-7 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-orange-400"
            >
              Entrar no portal
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate(`${routeBase}/app/login/corretor`)}
              className="rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-sm font-bold text-white transition-colors hover:border-white/30 hover:bg-white/10"
            >
              Acionar corretor
            </button>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: LayoutGrid,
                title: 'Pipeline limpo',
                description: 'O comprador entra por uma rota unica, sem ruido de transporte ou backoffice.',
              },
              {
                icon: FileText,
                title: 'Base para modulos',
                description: 'Auth e navegacao ja ficam prontos para receber as proximas frentes do app.',
              },
              {
                icon: ArrowLeftRight,
                title: 'Mesa central',
                description: 'O trading desk passa a ser o nucleo operacional desta branch enxuta.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300">
                  <item.icon className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-lg font-black">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative">
          <div className="absolute inset-0 -translate-x-4 translate-y-4 rounded-[2.5rem] bg-orange-500/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/40">
            <img
              src="https://images.unsplash.com/photo-1586771107445-d3afcb0de51f?q=80&w=1200&auto=format&fit=crop"
              alt="Armazem de graos"
              className="h-[520px] w-full object-cover opacity-85"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-orange-300 backdrop-blur">
                  <Truck className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">Modulo inicial</p>
                  <p className="mt-1 text-xl font-black">Fluxo publico enxuto para crescer por modulos.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
